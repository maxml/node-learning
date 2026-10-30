// exec (string via /bin/sh) vs execFile (argv array, no shell).
import { execSync, execFileSync } from 'node:child_process';
const input = 'report.txt; echo INJECTED-$(id -u)';
console.log('exec    :', JSON.stringify(execSync(`echo ${input}`).toString().trim()));
console.log('execFile:', JSON.stringify(execFileSync('echo', [input]).toString().trim()));
