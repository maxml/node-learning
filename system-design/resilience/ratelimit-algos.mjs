// Rate-limiting algorithms on a virtual clock: limit "10 requests per second".
// Two traffic patterns:
//   flood    — 1 request every 1 ms from t=500 ms to t=3500 ms
//   boundary — 10 requests at t=990 ms and 10 at t=1000 ms (aimed at a fixed-window edge)
// Metrics: accepted total, max accepted in any 1000 ms window, max in any 100 ms window.
// Run: node ratelimit-algos.mjs

const LIMIT = 10, WINDOW = 1000;

const algos = {
  'fixed window': () => {
    let win = -1, count = 0;
    return (t) => {
      const w = Math.floor(t / WINDOW);
      if (w !== win) { win = w; count = 0; }
      if (count < LIMIT) { count++; return true; }
      return false;
    };
  },
  'sliding log': () => {
    const log = [];
    return (t) => {
      while (log.length && log[0] <= t - WINDOW) log.shift();
      if (log.length < LIMIT) { log.push(t); return true; }
      return false;
    };
  },
  'sliding window counter': () => {
    // Cloudflare-style approximation: previous window weighted by its overlap.
    let win = -1, curr = 0, prev = 0;
    return (t) => {
      const w = Math.floor(t / WINDOW);
      if (w !== win) { prev = w === win + 1 ? curr : 0; curr = 0; win = w; }
      const overlap = 1 - (t - w * WINDOW) / WINDOW;
      if (prev * overlap + curr < LIMIT) { curr++; return true; }
      return false;
    };
  },
  'token bucket (burst 10, 10/s)': () => {
    let tokens = LIMIT, last = 0;
    return (t) => {
      tokens = Math.min(LIMIT, tokens + ((t - last) * LIMIT) / WINDOW);
      last = t;
      if (tokens >= 1) { tokens -= 1; return true; }
      return false;
    };
  },
  'token bucket (burst 1, 10/s)': () => {
    let tokens = 1, last = 0;
    return (t) => {
      tokens = Math.min(1, tokens + ((t - last) * LIMIT) / WINDOW);
      last = t;
      if (tokens >= 1) { tokens -= 1; return true; }
      return false;
    };
  },
  'GCRA (T=100 ms, tau=900 ms)': () => {
    // Generic Cell Rate Algorithm: one number per key, the theoretical arrival time (TAT).
    const T = WINDOW / LIMIT, tau = T * (LIMIT - 1);
    let tat = 0;
    return (t) => {
      const next = Math.max(tat, t);
      if (next - t > tau) return false;
      tat = next + T;
      return true;
    };
  },
};

// Leaky bucket as a queue: admits into a queue of 10, drains one every 100 ms.
// It does not reject *later*, it delays: we report the output (departure) times.
function leakyQueue(arrivals) {
  const departures = [];
  let lastDeparture = -Infinity;
  const queue = [];
  let accepted = 0, maxDelay = 0;
  for (const t of arrivals) {
    while (queue.length && queue[0] <= t) queue.shift();
    if (queue.length < LIMIT) {
      const d = Math.max(t, lastDeparture + WINDOW / LIMIT);
      lastDeparture = d;
      queue.push(d);
      departures.push(d);
      accepted++;
      maxDelay = Math.max(maxDelay, d - t);
    }
  }
  return { accepted, times: departures, maxDelay };
}

function maxInWindow(times, w) {
  let best = 0, j = 0;
  for (let i = 0; i < times.length; i++) {
    while (times[i] - times[j] >= w) j++;
    best = Math.max(best, i - j + 1);
  }
  return best;
}

const patterns = {
  flood: Array.from({ length: 3000 }, (_, i) => 500 + i),
  boundary: [...Array(10).fill(990), ...Array(10).fill(1000)],
};

console.log(`limit ${LIMIT} per ${WINDOW} ms`);
for (const [pname, arrivals] of Object.entries(patterns)) {
  console.log(`\npattern: ${pname} (${arrivals.length} requests)`);
  console.log('algorithm | accepted | max in any 1000 ms | max in any 100 ms');
  for (const [name, make] of Object.entries(algos)) {
    const allow = make();
    const acc = arrivals.filter((t) => allow(t));
    console.log(`${name} | ${acc.length} | ${maxInWindow(acc, 1000)} | ${maxInWindow(acc, 100)}`);
  }
  const lq = leakyQueue(arrivals);
  console.log(`leaky bucket as queue (output side) | ${lq.accepted} | ${maxInWindow(lq.times, 1000)} | `
    + `${maxInWindow(lq.times, 100)} (max added delay ${lq.maxDelay} ms)`);
}
