'use strict';
// Поведінка під maxmemory для різних maxmemory-policy.
// Групи ключів (значення по 1000 байт):
//   P  — 4000 ключів БЕЗ TTL («сесії», дані, які не можна губити)
//   CH — 1000 ключів з TTL, які регулярно читають («гарячий кеш»)
//   CC — 3000 ключів з TTL, яких більше не читають («холодний кеш»)
// Потім пишемо W — 12000 нових ключів з TTL, що не вміщаються, і рахуємо, що вижило.
// Для volatile-* окремо дописуємо ключі БЕЗ TTL, доки не з'явиться OOM.
const { connect, cmd, serverInfo, sleep } = require('./lib');

const VAL = 'x'.repeat(1000);
const MAXMEM = process.env.MAXMEM || '14mb';
const PAUSE_MS = Number(process.env.PAUSE_MS ?? 1100); // PAUSE_MS=0 відтворює «LRU як випадкове»
const POLICIES = (process.env.POLICIES || 'noeviction,allkeys-lru,volatile-lru,allkeys-lfu').split(',');

async function batch(c, n, f) {
  let ok = 0;
  let oom = 0;
  let firstErr;
  for (let i = 0; i < n; i += 250) {
    const res = await Promise.allSettled(Array.from({ length: Math.min(250, n - i) }, (_, j) => f(i + j)));
    for (const r of res) {
      if (r.status === 'fulfilled') ok++;
      else {
        oom++;
        firstErr ??= r.reason.message;
      }
    }
  }
  return { ok, oom, firstErr };
}

async function exists(c, prefix, from, to) {
  let n = 0;
  for (let i = from; i < to; i += 500) {
    const keys = Array.from({ length: Math.min(500, to - i) }, (_, j) => `${prefix}${i + j}`);
    n += Number(await cmd(c, 'EXISTS', ...keys));
  }
  return n;
}

async function run(c, policy) {
  await cmd(c, 'CONFIG', 'SET', 'maxmemory', 0);
  await cmd(c, 'FLUSHALL');
  await cmd(c, 'CONFIG', 'RESETSTAT');
  await cmd(c, 'CONFIG', 'SET', 'maxmemory-policy', policy);
  await batch(c, 4000, (i) => cmd(c, 'SET', `p:${i}`, VAL));
  await batch(c, 4000, (i) => cmd(c, 'SET', `c:${i}`, VAL, 'EX', 3600)); // c:0..999 гарячі
  await cmd(c, 'CONFIG', 'SET', 'maxmemory', MAXMEM);

  let w = { ok: 0, oom: 0 };
  for (let round = 0; round < 12; round++) {
    // Годинник LRU має роздільність 1 с (LRU_CLOCK_RESOLUTION = 1000 мс у сирцях),
    // тож без пауз усі ключі виглядають «однаково старими» і LRU вироджується у випадкове
    // витіснення (перевірено: так і було в першому прогоні без пауз).
    await sleep(PAUSE_MS);
    // між порціями запису читаємо гарячі ключі, як це робив би живий трафік
    await batch(c, 1000, (i) => cmd(c, 'GET', `c:${i}`));
    const r = await batch(c, 1000, (i) => cmd(c, 'SET', `w:${round * 1000 + i}`, VAL, 'EX', 3600));
    w.ok += r.ok;
    w.oom += r.oom;
    w.firstErr ??= r.firstErr;
  }
  const stats = await cmd(c, 'INFO', 'stats');
  const evicted = Number(stats.match(/evicted_keys:(\d+)/)[1]);
  const p = await exists(c, 'p:', 0, 4000);
  const ch = await exists(c, 'c:', 0, 1000);
  const cc = await exists(c, 'c:', 1000, 4000);
  console.log(
    `${policy.padEnd(13)} W(з TTL): ok=${String(w.ok).padStart(5)} oom=${String(w.oom).padStart(5)}  evicted=${String(evicted).padStart(5)}  ` +
      `вижило: P(без TTL) ${p}/4000, гарячий кеш ${ch}/1000, холодний кеш ${cc}/3000` +
      (w.firstErr ? `\n              перша помилка: ${w.firstErr}` : ''),
  );

  if (policy.startsWith('volatile')) {
    // дописуємо ключі без TTL: politика може витісняти лише ключі з TTL
    let ok = 0;
    let err;
    for (let i = 0; i < 40000 && !err; i += 250) {
      const res = await Promise.allSettled(Array.from({ length: 250 }, (_, j) => cmd(c, 'SET', `s:${i + j}`, VAL)));
      for (const r of res) r.status === 'fulfilled' ? ok++ : (err ??= r.reason.message);
    }
    const keyspace = await cmd(c, 'INFO', 'keyspace');
    console.log(
      `              потім ключі БЕЗ TTL: прийнято ${ok}, далі «${err}»; ключів з TTL лишилось: ${(keyspace.match(/expires=(\d+)/) || [0, 0])[1]}`,
    );
  }
}

(async () => {
  const c = await connect();
  console.log(`# eviction: ${await serverInfo(c)}, node ${process.version}, maxmemory=${MAXMEM}, pause=${PAUSE_MS}ms, maxmemory-samples=${JSON.stringify(await cmd(c, 'CONFIG', 'GET', 'maxmemory-samples'))}`);
  for (const p of POLICIES) await run(c, p);
  await cmd(c, 'CONFIG', 'SET', 'maxmemory', 0);
  await cmd(c, 'FLUSHALL');
  await c.quit();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
