'use strict';
// Гонки cache-aside з керованим перемежуванням.
// Кожен актор це async-функція з «воротами» (gate): оркестратор відкриває їх у заданому порядку,
// тож перемежування детерміноване, а не імовірнісне.
const { connect, cmd, sleep, serverInfo } = require('./lib');

const K = 'user:7';
const db = { value: 'v1', version: 1 }; // «БД»: значення й версія рядка

function gate() {
  let open;
  const p = new Promise((r) => (open = r));
  return { p, open };
}

async function state(c, label) {
  const cached = await cmd(c, 'GET', K);
  const ttl = await cmd(c, 'TTL', K);
  console.log(`   ${label}: БД=${db.value}  кеш=${cached}  TTL=${ttl}s  → ${verdict(cached)}`);
}
function verdict(cached) {
  if (cached === null) return 'кеш порожній, наступне читання візьме свіже';
  const v = cached.startsWith('{') ? JSON.parse(cached).v : cached;
  return v === db.value ? 'узгоджено' : 'ЗАСТАРІЛЕ значення в кеші';
}
async function reset(c) {
  db.value = 'v1';
  db.version = 1;
  await cmd(c, 'DEL', K, `lease:${K}`);
}

// A. Читач промахнувся й прочитав v1; поки він «думав», писач оновив БД і видалив ключ;
//    читач записує в кеш уже застаріле v1.
async function scenarioDelete(c) {
  console.log('A. cache-aside: delete після запису, читач кладе в кеш прочитане до запису');
  await reset(c);
  const g = gate();
  const reader = (async () => {
    if ((await cmd(c, 'GET', K)) === null) {
      const v = db.value; // читання з БД: v1
      await g.p; // пауза (GC, повільна мережа, перевантажений event loop)
      await cmd(c, 'SET', K, v, 'EX', 3600);
    }
  })();
  const writer = (async () => {
    await sleep(5);
    db.value = 'v2';
    db.version = 2;
    await cmd(c, 'DEL', K);
    g.open();
  })();
  await Promise.all([reader, writer]);
  await state(c, 'після гонки');
}

// B. Оновлення кешу замість видалення: два писачі, порядок у БД v2→v3, у кеші v3→v2.
async function scenarioUpdate(c) {
  console.log('B. write-through «оновити кеш» двома писачами');
  await reset(c);
  const g = gate();
  const w1 = (async () => {
    db.value = 'v2';
    const mine = 'v2';
    await g.p; // писач 1 загальмував між записом у БД і в кеш
    await cmd(c, 'SET', K, mine, 'EX', 3600);
  })();
  const w2 = (async () => {
    await sleep(5);
    db.value = 'v3';
    await cmd(c, 'SET', K, 'v3', 'EX', 3600);
    g.open();
  })();
  await Promise.all([w1, w2]);
  await state(c, 'після гонки');
}

// C. Відкладене подвійне видалення: допомагає, лише якщо читач устиг до другого DEL.
async function scenarioDoubleDelete(c, readerPauseMs) {
  console.log(`C. delayed double delete (друге DEL через 300 мс), читач загальмував на ${readerPauseMs} мс`);
  await reset(c);
  const reader = (async () => {
    if ((await cmd(c, 'GET', K)) === null) {
      const v = db.value;
      await sleep(readerPauseMs);
      await cmd(c, 'SET', K, v, 'EX', 3600);
    }
  })();
  const writer = (async () => {
    await sleep(5);
    db.value = 'v2';
    await cmd(c, 'DEL', K);
    await sleep(300);
    await cmd(c, 'DEL', K);
  })();
  await Promise.all([reader, writer]);
  await state(c, 'після гонки');
}

// D. Lease (як у Facebook memcache): промах видає токен; DEL ключа анулює lease;
//    запис у кеш приймається лише з дійсним токеном.
const LEASE_SET = `
if redis.call('GET', KEYS[2]) == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3]); redis.call('DEL', KEYS[2]); return 1
end
return 0`;
async function scenarioLease(c) {
  console.log('D. те саме перемежування, що в A, але з lease-токеном');
  await reset(c);
  const g = gate();
  let accepted;
  const reader = (async () => {
    if ((await cmd(c, 'GET', K)) === null) {
      const token = `t-${Math.random()}`;
      await cmd(c, 'SET', `lease:${K}`, token, 'NX', 'PX', 10_000);
      const v = db.value;
      await g.p;
      accepted = await cmd(c, 'EVAL', LEASE_SET, 2, K, `lease:${K}`, token, v, 3600);
    }
  })();
  const writer = (async () => {
    await sleep(5);
    db.value = 'v2';
    await cmd(c, 'DEL', K, `lease:${K}`); // інвалідація знімає і значення, і lease
    g.open();
  })();
  await Promise.all([reader, writer]);
  console.log(`   запис читача прийнято: ${accepted === 1 ? 'так' : 'ні (lease анульовано)'}`);
  await state(c, 'після гонки');
}

// E. Версія + надгробок: писач замість DEL кладе tombstone з новою версією;
//    запис у кеш приймається, лише якщо його версія не менша за наявну.
const VERSIONED_SET = `
local cur = redis.call('GET', KEYS[1])
if cur then
  local ok, obj = pcall(cjson.decode, cur)
  if ok and tonumber(obj.ver) > tonumber(ARGV[1]) then return 0 end
end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3]); return 1`;
async function scenarioVersioned(c) {
  console.log('E. те саме перемежування, але з версією рядка й надгробком замість DEL');
  await reset(c);
  const g = gate();
  let accepted;
  const reader = (async () => {
    if ((await cmd(c, 'GET', K)) === null) {
      const { value, version } = db; // читаємо значення разом з версією
      await g.p;
      accepted = await cmd(c, 'EVAL', VERSIONED_SET, 1, K, version, JSON.stringify({ v: value, ver: version }), 3600);
    }
  })();
  const writer = (async () => {
    await sleep(5);
    db.value = 'v2';
    db.version = 2;
    // надгробок: «версія 2 існує, значення читай з БД»; короткий TTL
    await cmd(c, 'SET', K, JSON.stringify({ v: null, ver: 2, tombstone: true }), 'EX', 30);
    g.open();
  })();
  await Promise.all([reader, writer]);
  console.log(`   запис читача прийнято: ${accepted === 1 ? 'так' : 'ні (версія 1 < 2)'}`);
  const cached = await cmd(c, 'GET', K);
  console.log(`   кеш=${cached}  → надгробок означає «промах»: наступне читання піде в БД по v2`);
}

(async () => {
  const c = await connect();
  console.log(`# race: ${await serverInfo(c)}, node ${process.version}`);
  await scenarioDelete(c);
  await scenarioUpdate(c);
  await scenarioDoubleDelete(c, 100);
  await scenarioDoubleDelete(c, 600);
  await scenarioLease(c);
  await scenarioVersioned(c);
  await c.quit();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
