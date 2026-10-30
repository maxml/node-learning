// JSON modules with import attributes, and WebAssembly ES module integration.
// Run: node 01-json-wasm.mjs   (Node >= 24.5 / 22.19 for unflagged .wasm imports)
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import data from './data.json' with { type: 'json' };
import { createRequire } from 'node:module';

console.log('JSON default import:', data);

// The JSON module is cached like any module: every importer gets the SAME mutable object.
data.port = 9999;
const again = await import('./data.json', { with: { type: 'json' } });
console.log('second import sees mutation:', again.default.port, '| same object:', again.default === data);

// Node's ESM JSON loader also fills the CommonJS cache (Module._cache), so require() of the
// same file returns that very object too (Node implementation detail, checked on v24.14.1).
const require = createRequire(import.meta.url);
const viaRequire = require('./data.json');
console.log('require(json) after import:', viaRequire.port, '| same object:', viaRequire === data);

try {
  await import('./no-attribute.mjs');
} catch (e) {
  console.log('import json without attribute ->', e.code);
}

// A real 41-byte wasm module exporting add(i32, i32) -> i32, written to a temp dir at run time.
const bytes = Uint8Array.from([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, // magic "\0asm", version 1
  0x01, 0x07, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f, // type: (i32, i32) -> i32
  0x03, 0x02, 0x01, 0x00, // function 0 has type 0
  0x07, 0x07, 0x01, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00, // export "add" = func 0
  0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b, // local.get 0, local.get 1, i32.add
]);
const file = join(mkdtempSync(join(tmpdir(), 'wasm-')), 'add.wasm');
writeFileSync(file, bytes);
const wasm = await import(pathToFileURL(file).href);
console.log('import of .wasm: add(2, 3) =', wasm.add(2, 3));

// What ex_require/wasm.wasm really is: JavaScript text with a .wasm name. require() treats
// any unknown extension as JavaScript, so it "works" without being WebAssembly at all.
