// Run the two module-syntax cases directly under Node's built-in type stripping
// (no tsc involved) and print how each fails at load time.
import { spawnSync } from "node:child_process";

for (const f of ["flags/verbatimModuleSyntax.ts", "flags/erasableSyntaxOnly.ts", "decorators.ts"]) {
  const r = spawnSync(process.execPath, [f], { encoding: "utf8" });
  // The error line starts with the class name; the code frame above it echoes source.
  const err = r.stderr.split("\n").find((l) => /^\w*Error\b/.test(l)) ?? "(no error)";
  console.log(`node ${process.version} ${f}\n  exit=${r.status}  ${err.trim()}`);
}
