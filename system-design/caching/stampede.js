'use strict';
// Stampede: N одночасних запитів на ключ, якого щойно не стало в кеші.
// Кеш справжній (Valkey/Redis), «БД» імітована з затримкою 100 мс.
// INSTANCES імітує кілька реплік сервісу: у кожної свій single-flight у пам'яті.
const { connect, cmd, FakeDb, sleep, serverInfo } = require('./lib');

const N = Number(process.env.N || 200);
const INSTANCES = Number(process.env.INSTANCES || 4);
const KEY = 'product:42';
const TTL_S = 60;

function percentile(xs, p) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

// 1. Без захисту: класичний cache-aside
function plain(c, db) {
  return async () => {
    const hit = await cmd(c, 'GET', KEY);
    if (hit !== null) return hit;
    const v = await db.read(KEY);
    await cmd(c, 'SET', KEY, v, 'EX', TTL_S);
    return v;
  };
}

// 2. Single-flight у межах одного процесу: кешуємо проміс, а не значення
function singleFlight(c, db) {
  const inflight = new Map();
  const load = plain(c, db);
  return async () => {
    if (inflight.has(KEY)) return inflight.get(KEY);
    const p = load().finally(() => inflight.delete(KEY));
    inflight.set(KEY, p);
    return p;
  };
}

// 3. Single-flight + розподілений lease у кеші (SET NX PX): один перерахунок на весь флот
const RELEASE = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end`;
function lease(c, db, stats) {
  const inflight = new Map();
  const load = async () => {
    const hit = await cmd(c, 'GET', KEY);
    if (hit !== null) return hit;
    const token = `${process.pid}-${Math.random()}`;
    const got = await cmd(c, 'SET', `lease:${KEY}`, token, 'NX', 'PX', 2000);
    if (got === 'OK') {
      try {
        const v = await db.read(KEY);
        await cmd(c, 'SET', KEY, v, 'EX', TTL_S);
        return v;
      } finally {
        await cmd(c, 'EVAL', RELEASE, 1, `lease:${KEY}`, token);
      }
    }
    // lease у когось іншого: чекаємо значення, а не йдемо в БД
    for (let i = 0; i < 100; i++) {
      await sleep(10);
      const v = await cmd(c, 'GET', KEY);
      if (v !== null) return v;
    }
    stats.fallback++; // власник lease помер чи завис: деградуємо в БД
    return db.read(KEY);
  };
  return async () => {
    if (inflight.has(KEY)) return inflight.get(KEY);
    const p = load().finally(() => inflight.delete(KEY));
    inflight.set(KEY, p);
    return p;
  };
}

// 4. Stale-while-revalidate: м'який строк у значенні, жорсткий TTL у кеші.
// Після м'якого строку віддаємо старе, оновлюємо у фоні (з тим самим lease).
function swr(c, db) {
  const refreshing = new Set();
  return async () => {
    const raw = await cmd(c, 'GET', KEY);
    if (raw !== null) {
      const { v, softExp } = JSON.parse(raw);
      if (Date.now() >= softExp && !refreshing.has(KEY)) {
        refreshing.add(KEY);
        (async () => {
          const got = await cmd(c, 'SET', `lease:${KEY}`, '1', 'NX', 'PX', 2000);
          if (got === 'OK') {
            const nv = await db.read(KEY);
            await cmd(c, 'SET', KEY, JSON.stringify({ v: nv, softExp: Date.now() + 30_000 }), 'EX', TTL_S * 10);
            await cmd(c, 'DEL', `lease:${KEY}`);
          }
        })().finally(() => refreshing.delete(KEY));
      }
      return v;
    }
    const v = await db.read(KEY);
    await cmd(c, 'SET', KEY, JSON.stringify({ v, softExp: Date.now() + 30_000 }), 'EX', TTL_S * 10);
    return v;
  };
}

async function run(name, makeHandler, prepare) {
  const db = new FakeDb(100);
  const stats = { fallback: 0 };
  const clients = await Promise.all(Array.from({ length: INSTANCES }, () => connect()));
  await cmd(clients[0], 'DEL', KEY, `lease:${KEY}`);
  if (prepare) await prepare(clients[0]);
  const handlers = clients.map((c) => makeHandler(c, db, stats));
  const lat = [];
  await Promise.all(
    Array.from({ length: N }, async (_, i) => {
      const t0 = performance.now();
      await handlers[i % INSTANCES]();
      lat.push(performance.now() - t0);
    }),
  );
  await sleep(250); // дати фоновому оновленню SWR завершитись
  console.log(
    `${name.padEnd(34)} db_calls=${String(db.calls).padStart(3)}  max_concurrent_db=${String(db.maxInFlight).padStart(3)}  ` +
      `p50=${percentile(lat, 50).toFixed(0)}ms  max=${percentile(lat, 100).toFixed(0)}ms  fallback=${stats.fallback}`,
  );
  await Promise.all(clients.map((c) => c.quit()));
}

(async () => {
  const c = await connect();
  console.log(`# stampede: ${await serverInfo(c)}, node ${process.version}, N=${N}, instances=${INSTANCES}, db latency 100ms`);
  await c.quit();
  await run('1. cache-aside, без захисту', plain);
  await run('2. single-flight у процесі', singleFlight);
  await run('3. single-flight + lease у кеші', lease);
  await run('4. stale-while-revalidate', swr, async (c) => {
    // у кеші лежить значення, м'який строк якого вже минув
    await cmd(c, 'SET', KEY, JSON.stringify({ v: 'old', softExp: Date.now() - 1 }), 'EX', TTL_S);
  });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
