// For every flags/<flag>.ts: type-check it with <flag> off, then on, under the
// native compiler (tsc, TypeScript 7) and the JS compiler (tsc6, TypeScript 6).
// A flag "catches its bug" when OFF gives 0 errors and ON gives >= 1.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

const base = [
  "--ignoreConfig", "--noEmit", "--pretty", "false",
  "--strict", "false", // baseline: everything off (TS 6/7 default strict to true)
  "--target", "es2024", "--module", "nodenext", "--moduleResolution", "nodenext",
  "--types", "node", "--skipLibCheck", "--allowImportingTsExtensions",
];

// These flags only refine null/undefined checking: without strictNullChecks the
// compiler rejects them (TS5052) or they have nothing to add. Their baseline keeps
// strictNullChecks ON, so OFF -> ON isolates exactly the flag under test.
const needsNullChecks = new Set([
  "exactOptionalPropertyTypes", "strictPropertyInitialization",
  "noUncheckedIndexedAccess", "strictBuiltinIteratorReturn",
]);

// verbatimModuleSyntax implies isolatedModules; erasableSyntaxOnly is independent.
const files = readdirSync("flags").filter((f) => f.endsWith(".ts") && f !== "types.ts");

function check(bin, flag, value) {
  const extra = needsNullChecks.has(flag) ? ["--strictNullChecks", "true"] : [];
  const r = spawnSync(`node_modules/.bin/${bin}`, [...base, ...extra, `--${flag}`, String(value), `flags/${flag}.ts`], {
    encoding: "utf8",
  });
  const lines = (r.stdout + r.stderr).split("\n").filter((l) => /error TS\d+/.test(l));
  return { n: lines.length, first: lines[0]?.replace(/^.*?error /, "") ?? "" };
}

let failures = 0;
for (const file of files) {
  const flag = file.replace(/\.ts$/, "");
  for (const bin of ["tsc", "tsc6"]) {
    const off = check(bin, flag, false);
    const on = check(bin, flag, true);
    // TS5xxx are option/config errors, not the bug: counting them would be a vacuous pass.
    const ok = off.n === 0 && on.n > 0 && !on.first.startsWith("TS5");
    if (!ok) failures++;
    console.log(`${ok ? "OK  " : "FAIL"} ${bin.padEnd(4)} ${flag.padEnd(36)} off=${off.n} on=${on.n}  ${on.first || off.first}`);
  }
}
console.log(failures === 0 ? "\nall flags catch their bug" : `\n${failures} case(s) did not behave as expected`);
process.exitCode = failures === 0 ? 0 : 1;
