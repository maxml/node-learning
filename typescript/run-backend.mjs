// Прогін бекенд-експериментів: перевірка типів (tsc 7 і tsc6), мутації, що доводять
// невипадковість «0 помилок», і рантайм-частина під Node.
// Мутанти пишуться в тимчасову .mutants/ поруч (щоб резолвились node_modules) і видаляються.
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const here = import.meta.dirname;
const bin = (n) => join(here, "node_modules", ".bin", n);
const files = ["mongo-types.ts", "augment-types.ts", "augmentation.ts", "aws-events.ts", "using.ts", "errors-dup.ts"];

function tsc(compiler, args, cwd = here) {
  const r = spawnSync(bin(compiler), args, { cwd, encoding: "utf8" });
  const out = (r.stdout + r.stderr).trim();
  const codes = [...out.matchAll(/error (TS\d+)/g)].map((m) => m[1]);
  return { status: r.status, codes, first: out.split("\n")[0] ?? "" };
}

console.log("== type-check tsconfig.backend.json");
for (const c of ["tsc", "tsc6"]) {
  const r = tsc(c, ["-p", "tsconfig.backend.json"]);
  console.log(`${c.padEnd(5)} exit=${r.status} errors=${r.codes.length}`);
}

// Кожна мутація: [назва, файл, пошук, заміна, очікувані коди, додаткові compilerOptions].
const mutations = [
  ["mongoose: nickname без null", "mongo-types.ts", "string | null | undefined>>", "string | undefined>>", ["TS2344"]],
  ["driver: findOne({ email: 42 }) без expect-error", "mongo-types.ts", "  // @ts-expect-error TS2769: No overload matches this call (number замість string)\n", "", ["TS2769"]],
  ["driver: projection дає WithId<User>[] (інший тип)", "mongo-types.ts", "Equal<typeof rows, WithId<User>[]>", "Equal<typeof rows, { email: string }[]>", ["TS2344"]],
  // У пакеті з "type": "module" під nodenext файл і так модуль (moduleDetection: auto),
  // тому мутація імітує CJS-проєкт через moduleDetection: legacy.
  ["augment-types.ts без export {} (moduleDetection legacy)", "augment-types.ts", "export {};\n", "", ["TS2669", "TS2349"], { moduleDetection: "legacy" }],
  ["augment-types.ts без export {} (nodenext + type: module)", "augment-types.ts", "export {};\n", "", []],
  ["sdk: SendMessageCommand без MessageBody, без expect-error", "aws-events.ts", "  // @ts-expect-error TS2769: No overload matches this call (немає MessageBody)\n", "", ["TS2769"]],
];

console.log("\n== mutations (tsc 7)");
const mut = join(here, ".mutants");
for (const [name, file, from, to, expected, extra = {}] of mutations) {
  rmSync(mut, { recursive: true, force: true });
  mkdirSync(mut);
  for (const f of files) cpSync(join(here, f), join(mut, f));
  cpSync(join(here, "dup"), join(mut, "dup"), { recursive: true });
  const src = readFileSync(join(mut, file), "utf8");
  if (!src.includes(from)) throw new Error(`mutation anchor not found: ${name}`);
  writeFileSync(join(mut, file), src.replace(from, to));
  writeFileSync(join(mut, "tsconfig.json"), JSON.stringify({ extends: "../tsconfig.backend.json", compilerOptions: extra, files }));
  const r = tsc("tsc", ["-p", "tsconfig.json"], mut);
  const ok = expected.length === 0 ? r.codes.length === 0 : expected.every((c) => r.codes.includes(c));
  const verdict = expected.length === 0 ? (ok ? "OK  " : "MISS") : ok ? "RED " : "MISS";
  console.log(`${verdict} ${name}: ${[...new Set(r.codes)].join(",") || "0 errors"}`);
}
rmSync(mut, { recursive: true, force: true });

console.log("\n== augmentation file not in program (files без augment-types.ts)");
{
  const r = tsc("tsc", ["--ignoreConfig", "--noEmit", "--strict", "--module", "nodenext", "--target", "es2024",
    "--types", "node", "--skipLibCheck", "--allowImportingTsExtensions", "augmentation.ts"]);
  console.log(`exit=${r.status} ${[...new Set(r.codes)].join(",")}  ${r.first}`);
}

console.log("\n== `using` without @types/node and without esnext lib");
{
  const r = tsc("tsc", ["--ignoreConfig", "--noEmit", "--strict", "--module", "nodenext", "--target", "es2024",
    "--types", "", "--skipLibCheck", "--allowImportingTsExtensions", "--lib", "es2024", "using.ts"]);
  console.log(`exit=${r.status} ${[...new Set(r.codes)].join(",")}`);
}

console.log("\n== ESM ↔ CJS: esm-interop/main.ts під nodenext і bundler, потім node на емітованому JS");
{
  const dir = join(here, "esm-interop");
  const out = join(dir, ".out");
  for (const [label, mod] of [["nodenext", ["--module", "nodenext"]], ["bundler", ["--module", "esnext", "--moduleResolution", "bundler"]]]) {
    rmSync(out, { recursive: true, force: true });
    const r = tsc("tsc", ["--ignoreConfig", ...mod, "--target", "es2024", "--strict", "--types", "", "--rootDir", ".",
      "--outDir", ".out", "--noEmitOnError", "false", "main.ts", "noext.ts", "util.ts"], dir);
    cpSync(join(dir, "legacy"), join(out, "legacy"), { recursive: true });
    console.log(`${label.padEnd(8)} tsc exit=${r.status} ${[...new Set(r.codes)].join(",") || "0 errors"}`);
    for (const entry of ["main.js", "noext.js"]) {
      const run = spawnSync(process.execPath, [join(out, entry)], { encoding: "utf8" });
      const err = (run.stderr.match(/^(\w*Error[^\n]*)/m) ?? [""])[0].replaceAll(here + "/", "");
      console.log(`         node ${entry.padEnd(8)} exit=${run.status} ${run.stdout.trim()} ${err}`);
    }
  }
  rmSync(out, { recursive: true, force: true });
  console.log("\n== node esm-interop/req.cjs");
  console.log(execFileSync(process.execPath, [join(dir, "req.cjs")], { encoding: "utf8" }).trimEnd());
}

for (const f of ["mongo-types.ts", "augmentation.ts", "aws-events.ts", "using.ts", "errors-dup.ts"]) {
  console.log(`\n== node ${f}`);
  console.log(execFileSync(process.execPath, [f], { cwd: here, encoding: "utf8" }).trimEnd());
}
