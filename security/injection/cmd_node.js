// OS command injection demo (Node child_process): exec (through a shell) vs
// execFile (argv array, no shell). Teaching example for Security/Ін'єкції.md.
// The "attack" only reads a marker file in this folder; it does not touch the
// system. It shows that shell metacharacters in user input are interpreted.
const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const pexec = promisify(require("child_process").exec);
const pexecFile = promisify(execFile);

const MARKER = path.join(__dirname, "pwned-marker.txt");

// App intent: run `cat <file>` on a filename the user supplied.
// Hostile filename smuggles a second command via the shell separator `;`.
const safeArg = "package.json";
const hostileArg = "package.json; echo INJECTED > " + JSON.stringify(MARKER);

async function run() {
  const out = {};

  // 1. exec: the whole string is handed to /bin/sh -c, so `;` starts a 2nd command.
  try { fs.unlinkSync(MARKER); } catch {}
  await pexec("cat " + hostileArg);
  out.exec_injected_marker_written = fs.existsSync(MARKER); // true: 2nd command ran

  // 2. execFile: args are an argv array, no shell. The metacharacters become
  // part of a single filename argument, so cat just fails to find that file.
  try { fs.unlinkSync(MARKER); } catch {}
  try {
    await pexecFile("cat", [hostileArg]);
    out.execFile_result = "no error (unexpected)";
  } catch (e) {
    out.execFile_result = "cat error, no injection"; // cat: 'package.json; echo ...': No such file
  }
  out.execFile_injected_marker_written = fs.existsSync(MARKER); // false: nothing ran

  // 3. execFile with a legitimate arg works normally.
  const r = await pexecFile("cat", [safeArg]);
  out.execFile_safe_reads_file = r.stdout.includes("injection-examples");

  try { fs.unlinkSync(MARKER); } catch {}
  console.log(JSON.stringify(out, null, 2));
}

run().catch((e) => { console.error(e); process.exit(1); });
