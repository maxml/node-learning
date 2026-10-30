// Shared helpers: seeded PRNG, min-heap event queue, percentiles.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Exponential inter-arrival time (Poisson process) with mean 1/rate.
export const expSample = (rnd, mean) => -Math.log(1 - rnd()) * mean;

export class EventQueue {
  #h = [];
  #seq = 0;
  push(t, fn) {
    const h = this.#h;
    h.push({ t, s: this.#seq++, fn });
    let i = h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.#less(h[p], h[i])) break;
      [h[p], h[i]] = [h[i], h[p]];
      i = p;
    }
  }
  pop() {
    const h = this.#h;
    const top = h[0];
    const last = h.pop();
    if (h.length) {
      h[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < h.length && this.#less(h[l], h[m])) m = l;
        if (r < h.length && this.#less(h[r], h[m])) m = r;
        if (m === i) break;
        [h[m], h[i]] = [h[i], h[m]];
        i = m;
      }
    }
    return top;
  }
  get size() { return this.#h.length; }
  #less(a, b) { return a.t < b.t || (a.t === b.t && a.s < b.s); }
}

export function percentile(sorted, p) {
  if (!sorted.length) return NaN;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
