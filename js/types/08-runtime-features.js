// Which recent ECMAScript additions exist in the current runtime.
// Run on several Node majors, e.g.:
//   node 08-runtime-features.js
//   docker run --rm -v "$PWD":/w -w /w node:25 node 08-runtime-features.js
//   docker run --rm -v "$PWD":/w -w /w node:26 node 08-runtime-features.js

const has = (v) => (typeof v === 'undefined' ? 'no' : 'yes');
const features = {
  Temporal: has(globalThis.Temporal),
  'Math.sumPrecise (ES2026)': has(Math.sumPrecise),
  'Error.isError (ES2026)': has(Error.isError),
  'Uint8Array.fromBase64 (ES2026)': has(Uint8Array.fromBase64),
  'Array.fromAsync (ES2026)': has(Array.fromAsync),
  'Map.prototype.getOrInsert (ES2026)': has(Map.prototype.getOrInsert),
  'String.prototype.isWellFormed (ES2024)': has(String.prototype.isWellFormed),
  'Intl.Segmenter': has(Intl.Segmenter),
};
console.log(`${process.version} (V8 ${process.versions.v8})`);
for (const [k, v] of Object.entries(features)) console.log(`  ${k.padEnd(40)} ${v}`);

if (globalThis.Temporal) {
  const { Temporal } = globalThis;
  // month arithmetic clamps instead of overflowing like Date
  console.log('  PlainDate 2026-01-31 + 1 month       ', Temporal.PlainDate.from('2026-01-31').add({ months: 1 }).toString());
  // wall-clock arithmetic across the Kyiv DST change on 2026-10-25
  const zdt = Temporal.ZonedDateTime.from('2026-10-24T12:00:00+03:00[Europe/Kyiv]');
  console.log('  Kyiv 2026-10-24T12:00 + 1 day        ', zdt.add({ days: 1 }).toString());
  console.log('  Kyiv 2026-10-24T12:00 + 24 hours     ', zdt.add({ hours: 24 }).toString());
}
