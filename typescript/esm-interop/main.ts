// ESM-файл (пакет "type": "module") імпортує CJS-модуль, у якого `exports.default`
// (типова CJS-збірка бібліотеки, написаної з `export default`). run-backend.mjs компілює
// його під nodenext і під bundler, потім запускає емітований JS у Node.
import { x } from "./util.js";
import greet from "./legacy/index.cjs";

console.log(x, typeof greet);
greet();
