// Compiles the two decorator flavours with tsc and runs them, then checks
// whether Node parses decorators natively. Run: `node decorators/run.mjs`
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const tsc = join(here, "..", "node_modules", ".bin", "tsc");
const out = join(here, "out");
const common = ["--target", "es2022", "--module", "nodenext", "--strict", "--outDir", out];

function tryRun(label, cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  const text = (r.stdout + r.stderr).trim().split("\n").filter(Boolean);
  console.log(`${label}: exit=${r.status}`);
  for (const line of text.slice(0, 4)) console.log("   ", line);
}

execFileSync(tsc, [...common, join(here, "standard.ts")], { stdio: "inherit" });
tryRun("tsc standard.ts (no flag) -> node", process.execPath, [join(out, "standard.js")]);

tryRun("tsc legacy.ts WITHOUT experimentalDecorators", tsc, [...common, "--noEmit", join(here, "legacy.ts")]);

execFileSync(tsc, [...common, "--experimentalDecorators", join(here, "legacy.ts")], { stdio: "inherit" });
tryRun("tsc legacy.ts --experimentalDecorators -> node", process.execPath, [join(out, "legacy.js")]);

tryRun(`node ${process.version} native.mjs (plain JS @decorator)`, process.execPath, [join(here, "native.mjs")]);
tryRun(`node ${process.version} standard.ts (type stripping)`, process.execPath, [join(here, "standard.ts")]);
