// Workloads for run.sh. One file, many modes, so every case runs the same Node binary.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const v8 = require('node:v8');
const { spawn } = require('node:child_process');

const mode = process.argv[2];
const log = (msg) => console.log(`[${mode} pid=${process.pid}] ${msg}`);
const idle = () => setInterval(() => {}, 1000);

switch (mode) {
  // No SIGTERM handler: what happens depends on whether node is PID 1.
  case 'no-handler':
    log('ready');
    idle();
    break;

  // Handler that exits cleanly; logs so we can see whether the signal arrived.
  case 'handler':
    process.on('SIGTERM', () => {
      log('got SIGTERM, exiting 0');
      process.exit(0);
    });
    log('ready');
    idle();
    break;

  // Creates orphans: each `sh -c "sleep 0.2 &"` exits at once, its background
  // sleep is re-parented to PID 1 and becomes a zombie unless PID 1 reaps it.
  case 'orphans': {
    for (let i = 0; i < 20; i++) spawn('sh', ['-c', 'sleep 0.2 &'], { stdio: 'ignore' });
    setTimeout(() => {
      let zombies = 0;
      for (const pid of fs.readdirSync('/proc').filter((d) => /^\d+$/.test(d))) {
        try {
          const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
          if (stat.slice(stat.lastIndexOf(')') + 2)[0] === 'Z') zombies++;
        } catch {}
      }
      log(`zombies=${zombies}`);
      process.exit(0);
    }, 1500);
    break;
  }

  // What Node sees about memory and CPU inside the container.
  case 'limits':
    console.log(
      JSON.stringify({
        node: process.version,
        heapLimitMiB: Math.round(v8.getHeapStatistics().heap_size_limit / 2 ** 20),
        constrainedMemoryMiB: process.constrainedMemory
          ? Math.round(process.constrainedMemory() / 2 ** 20)
          : null,
        totalmemMiB: Math.round(os.totalmem() / 2 ** 20),
        availableParallelism: os.availableParallelism ? os.availableParallelism() : null,
        cpusLength: os.cpus().length,
      }),
    );
    break;

  // Writes to the root filesystem and to /tmp.
  case 'write':
    for (const p of ['/app-data.txt', '/tmp/x.txt']) {
      try {
        fs.writeFileSync(p, 'x');
        log(`write ${p}: ok`);
      } catch (e) {
        log(`write ${p}: ${e.code}`);
      }
    }
    break;

  default:
    console.error(`unknown mode: ${mode}`);
    process.exit(2);
}
