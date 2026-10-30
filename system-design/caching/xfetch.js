'use strict';
// Імовірнісне раннє оновлення (XFetch, Vattani et al., VLDB 2015) проти звичайного TTL
// під безперервним потоком запитів до одного гарячого ключа.
// Обидва варіанти без single-flight і без замків: порівнюємо самі політики строку.
const { connect, cmd, FakeDb, sleep, serverInfo } = require('./lib');

const RATE = Number(process.env.RATE || 500); // запитів за секунду
const DURATION_MS = Number(process.env.DURATION_MS || 12_000);
const TTL_MS = 2000;
const RECOMPUTE_MS = 200; // «дорогий запит у БД»
const BETA = Number(process.env.BETA || 1);

async function plain(c, db, st) {
  const v = await cmd(c, 'GET', 'hot');
  if (v !== null) return v;
  st.waited++;
  const nv = await db.read('hot');
  await cmd(c, 'SET', 'hot', nv, 'PX', TTL_MS);
  return nv;
}

// Псевдокод зі статті: if !value or now − Δ·β·ln(rand()) ≥ expiry → перерахувати
async function xfetch(c, db, st) {
  const raw = await cmd(c, 'GET', 'hot');
  const now = Date.now();
  if (raw !== null) {
    const { v, delta, expiry } = JSON.parse(raw);
    if (now - delta * BETA * Math.log(Math.random()) < expiry) return v;
    st.early++;
  } else {
    st.waited++;
  }
  const t0 = Date.now();
  const nv = await db.read('hot');
  const delta = Date.now() - t0;
  await cmd(c, 'SET', 'hot', JSON.stringify({ v: nv, delta, expiry: Date.now() + TTL_MS }), 'PX', TTL_MS);
  return nv;
}

async function run(name, handler) {
  const c = await connect();
  await cmd(c, 'DEL', 'hot');
  const db = new FakeDb(RECOMPUTE_MS);
  const st = { waited: 0, early: 0, requests: 0 };
  await handler(c, db, st); // прогрів: перше значення
  db.reset();
  st.waited = 0;
  st.early = 0;
  const pending = [];
  const start = Date.now();
  const interval = 1000 / RATE;
  let next = start;
  while (Date.now() - start < DURATION_MS) {
    while (next <= Date.now()) {
      st.requests++;
      pending.push(handler(c, db, st));
      next += interval;
    }
    await sleep(1);
  }
  await Promise.all(pending);
  // «епізод оновлення» = пачка викликів БД, що почались у межах одного RECOMPUTE_MS
  const episodes = [];
  for (const t of db.starts) {
    const last = episodes.at(-1);
    if (last && t - last.t0 <= RECOMPUTE_MS) last.n++;
    else episodes.push({ t0: t, n: 1 });
  }
  const sizes = episodes.map((e) => e.n);
  console.log(
    `${name.padEnd(22)} requests=${st.requests}  db_calls=${db.calls}  епізодів_оновлення=${episodes.length}  ` +
      `викликів_БД_на_епізод: сер ${(db.calls / episodes.length).toFixed(1)}, макс ${Math.max(...sizes)}  ` +
      `чекали_на_промаху=${st.waited}  ранніх_перерахунків=${st.early}`,
  );
  await c.quit();
}

(async () => {
  const c = await connect();
  console.log(
    `# xfetch: ${await serverInfo(c)}, node ${process.version}, rate=${RATE}/s, ttl=${TTL_MS}ms, recompute=${RECOMPUTE_MS}ms, beta=${BETA}, ${DURATION_MS}ms`,
  );
  await c.quit();
  await run('звичайний TTL', plain);
  await run(`XFetch (β=${BETA})`, xfetch);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
