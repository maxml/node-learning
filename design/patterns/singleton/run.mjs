// Where the module-cache "singleton" holds and where it silently splits.
// Run: `node singleton/run.mjs`
import { createRequire } from "node:module";
import cjsViaImport from "./counter.cjs";

const require = createRequire(import.meta.url);

const a = require("./counter.cjs");
const b = require("./counter.cjs");
console.log("1. require twice, same path:      same object =", a === b, "| ids", a.instanceId, b.instanceId);

console.log("2. import of CJS vs require:      same object =", cjsViaImport === a);

a.inc(); a.inc();
console.log("3. state leaks to the next 'test': b.inc() =", b.inc(), "(expected 1 in a fresh process)");

const copy = require("./vendor-b/counter.cjs");
console.log("4. same code, another path:       same object =", copy === a, "| ids", a.instanceId, copy.instanceId);

delete require.cache[require.resolve("./counter.cjs")];
const fresh = require("./counter.cjs");
console.log("5. after delete require.cache:    same object =", fresh === a, "| fresh.inc() =", fresh.inc());

const m1 = await import("./counter.mjs");
const m2 = await import("./counter.mjs");
const m3 = await import("./counter.mjs?isolate=1");
console.log("6. ESM import twice:              same instance =", m1.instanceId === m2.instanceId);
console.log("7. ESM import with ?query:        same instance =", m1.instanceId === m3.instanceId);
