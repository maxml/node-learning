'use strict';
// Однопотокове виконання команд: довга команда зупиняє всіх клієнтів.
// Зонд-клієнт безперервно шле PING і фіксує максимальну затримку, поки інший клієнт
// виконує KEYS *, ітерацію SCAN, DEL чи UNLINK великого ключа.
// Потрібен сервер з --enable-debug-command yes (для DEBUG POPULATE).
const { connect, cmd, serverInfo } = require('./lib');

const KEYS_N = Number(process.env.KEYS_N || 2_000_000);
const SET_N = Number(process.env.SET_N || 1_000_000);

async function withProbe(fn) {
  const probe = await connect();
  let running = true;
  let max = 0;
  const loop = (async () => {
    while (running) {
      const t0 = performance.now();
      await cmd(probe, 'PING');
      max = Math.max(max, performance.now() - t0);
    }
  })();
  const t0 = performance.now();
  const extra = await fn();
  const took = performance.now() - t0;
  running = false;
  await loop;
  await probe.quit();
  return { took, max, extra };
}

async function bigSet(c) {
  await cmd(c, 'DEL', 'big:set');
  for (let i = 0; i < SET_N; i += 10_000) {
    await cmd(c, 'SADD', 'big:set', ...Array.from({ length: 10_000 }, (_, j) => `member-${i + j}`));
  }
}

(async () => {
  const c = await connect();
  const lazy = await cmd(c, 'CONFIG', 'GET', 'lazyfree-lazy-user-del');
  console.log(`# blocking: ${await serverInfo(c)}, node ${process.version}, lazyfree-lazy-user-del=${JSON.stringify(lazy)}`);
  await cmd(c, 'FLUSHALL');
  await cmd(c, 'DEBUG', 'POPULATE', KEYS_N, 'key', 10);
  console.log(`  ключів: ${await cmd(c, 'DBSIZE')}`);

  const k = await withProbe(async () => (await cmd(c, 'KEYS', 'key:1999*')).length);
  console.log(`  KEYS key:1999*          : ${k.took.toFixed(0)} мс одна команда, знайдено ${k.extra}; макс. затримка PING у інших = ${k.max.toFixed(0)} мс`);

  const s = await withProbe(async () => {
    let cursor = '0';
    let found = 0;
    let calls = 0;
    do {
      const [next, keys] = await cmd(c, 'SCAN', cursor, 'MATCH', 'key:1999*', 'COUNT', 1000);
      cursor = next;
      found += keys.length;
      calls++;
    } while (cursor !== '0');
    return { found, calls };
  });
  console.log(`  SCAN … COUNT 1000       : ${s.took.toFixed(0)} мс сумарно, ${s.extra.calls} викликів, знайдено ${s.extra.found}; макс. затримка PING = ${s.max.toFixed(0)} мс`);

  await cmd(c, 'FLUSHALL');
  await bigSet(c);
  const d = await withProbe(() => cmd(c, 'DEL', 'big:set'));
  console.log(`  DEL множини ${SET_N} елементів : ${d.took.toFixed(0)} мс; макс. затримка PING = ${d.max.toFixed(0)} мс`);
  await bigSet(c);
  const u = await withProbe(() => cmd(c, 'UNLINK', 'big:set'));
  console.log(`  UNLINK тієї ж множини     : ${u.took.toFixed(0)} мс; макс. затримка PING = ${u.max.toFixed(0)} мс`);

  await cmd(c, 'FLUSHALL');
  await c.quit();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
