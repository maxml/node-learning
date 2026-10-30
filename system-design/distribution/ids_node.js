// ID generators in Node: what crypto.randomUUID() returns, how uuid@14 v7 behaves
// inside one millisecond, what an ObjectId is made of, and the Snowflake epoch limit.
// Run: node ids_node.js
import crypto from 'node:crypto';
import { v4, v7, validate, version } from 'uuid';
import { ObjectId } from 'mongodb';

const out = (k, v) => console.log(`| ${k} | ${v} |`);
console.log(`# IDs in Node ${process.version}\n\n| check | result |\n| --- | --- |`);

const r = crypto.randomUUID();
out('crypto.randomUUID() sample', `\`${r}\``);
out('crypto.randomUUID() version (uuid.version)', version(r));
out('typeof crypto.randomUUIDv7', typeof crypto.randomUUIDv7);
out('uuid v4() version', version(v4()));

// v7: generate a burst; many land in the same millisecond. Are they strictly increasing?
const N = 200_000;
const ids = Array.from({ length: N }, () => v7());
let increasing = true;
for (let i = 1; i < N; i++) if (!(ids[i] > ids[i - 1])) { increasing = false; break; }
const ms = new Set(ids.map((u) => u.slice(0, 13))).size;
out(`uuid v7(): ${N.toLocaleString('en')} ids in a tight loop`, `${ms} distinct ms prefixes, strictly increasing as strings: ${increasing}`);
const ts = parseInt(ids[0].replace(/-/g, '').slice(0, 12), 16);
out('v7 first 48 bits as Unix ms', `${ts} = ${new Date(ts).toISOString()} (creation time is readable from the id)`);
out('validate(v7)', validate(ids[0]) && version(ids[0]) === 7);

// ObjectId: 4-byte seconds | 5-byte per-process random | 3-byte counter
const a = new ObjectId(), b = new ObjectId();
const hx = (o) => o.toHexString();
out('ObjectId a / b', `\`${hx(a)}\` / \`${hx(b)}\``);
out('same 5-byte process part', hx(a).slice(8, 18) === hx(b).slice(8, 18));
out('counter b - a', parseInt(hx(b).slice(18), 16) - parseInt(hx(a).slice(18), 16));
out('getTimestamp()', a.getTimestamp().toISOString());

// Generation cost in Node (part of client-side insert time in ids_pg.js / ids_mongo.js)
const M = 1_000_000;
for (const [name, f] of [['crypto.randomUUID()', () => crypto.randomUUID()], ['uuid v4()', v4], ['uuid v7()', v7], ['new ObjectId()', () => new ObjectId()]]) {
  f(); const t0 = performance.now(); for (let i = 0; i < M; i++) f();
  out(`generate 1M: ${name}`, `${((performance.now() - t0) / 1000).toFixed(2)} s`);
}

// Sizes as stored
out('bytes: uuid binary / uuid text / ObjectId / bigint', '16 / 36 / 12 / 8');

// Snowflake: 41-bit millisecond timestamp from a custom epoch
const years = 2 ** 41 / (1000 * 3600 * 24 * 365.25);
out('Snowflake 41-bit ms range', `${years.toFixed(1)} years from the chosen epoch`);
out('Snowflake 12-bit sequence', `${2 ** 12} ids per ms per worker = ${(2 ** 12 * 1000).toLocaleString('en')}/s`);
out('Snowflake 10-bit worker id', `${2 ** 10} workers`);
// ObjectId 32-bit seconds wrap (unsigned)
out('ObjectId 4-byte seconds overflow', new Date(2 ** 32 * 1000).toISOString());
