// Workloads for run.sh. Each mode ends the container in a different way, so the
// exit code and Docker's State.OOMKilled can be compared side by side.
'use strict';

const mode = process.argv[2];
const keep = [];

function log(msg) {
  console.log(`[${mode}] ${msg}`);
}

switch (mode) {
  // Memory outside the V8 heap (Buffer). The V8 heap limit never triggers,
  // the cgroup limit does: the kernel OOM killer sends SIGKILL.
  case 'offheap': {
    log(`heap_size_limit=${(require('v8').getHeapStatistics().heap_size_limit / 2 ** 20) | 0} MiB`);
    setInterval(() => {
      const b = Buffer.alloc(16 * 2 ** 20, 1); // touch every page
      keep.push(b);
      log(`rss=${(process.memoryUsage().rss / 2 ** 20) | 0} MiB`);
    }, 20);
    break;
  }
  // JS objects on the V8 heap. With the default heap limit (about half of the
  // cgroup limit on Node 24) V8 aborts first: "JavaScript heap out of memory".
  // With --max-old-space-size above the cgroup limit the kernel kills first.
  case 'heap': {
    log(`heap_size_limit=${(require('v8').getHeapStatistics().heap_size_limit / 2 ** 20) | 0} MiB`);
    setInterval(() => {
      for (let i = 0; i < 2e5; i++) keep.push({ i, s: 'x'.repeat(32) + i });
      log(`heapUsed=${(process.memoryUsage().heapUsed / 2 ** 20) | 0} MiB`);
    }, 20);
    break;
  }
  // Ignores SIGTERM, as an app with a stuck shutdown would. `docker stop -t N`
  // then sends SIGKILL after N seconds, which is what ECS does after stopTimeout.
  case 'ignore-term': {
    process.on('SIGTERM', () => log('got SIGTERM, ignoring it'));
    log('ready');
    setInterval(() => {}, 1000);
    break;
  }
  // Handles SIGTERM and exits cleanly.
  case 'graceful': {
    process.on('SIGTERM', () => {
      log('got SIGTERM, exiting 0');
      process.exit(0);
    });
    log('ready');
    setInterval(() => {}, 1000);
    break;
  }
  // No SIGTERM handler at all.
  case 'no-handler': {
    log('ready');
    setInterval(() => {}, 1000);
    break;
  }
  default:
    console.error(`unknown mode: ${mode}`);
    process.exit(2);
}
