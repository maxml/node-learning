// require(esm) у Node 24: без прапорця й без попередження.
const ns = require("./esm-lib.mjs");
console.log("require(esm) keys:", Object.keys(ns).join(","), "| typeof ns:", typeof ns, "| typeof ns.default:", typeof ns.default);
try {
  require("./esm-tla.mjs");
} catch (e) {
  console.log("top-level await:", e.code);
}
console.log("process.features.require_module:", process.features.require_module);
