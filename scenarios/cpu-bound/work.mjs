// The "large calculation": count primes below N by trial division. Pure CPU, no I/O,
// splits naturally into ranges, so the same function serves every variant.

export function countPrimes(from, to) {
  let count = 0;
  for (let n = Math.max(2, from); n < to; n++) {
    let prime = true;
    for (let d = 2; d * d <= n; d++) {
      if (n % d === 0) { prime = false; break; }
    }
    if (prime) count++;
  }
  return count;
}

// N tuned so that countPrimes(0, N) takes ~5 s of CPU on the test machine (see README).
export const N = Number(process.env.N ?? 7_500_000);

// piscina worker entry: default export receives the task payload
export default function task({ from = 0, to = N } = {}) {
  return countPrimes(from, to);
}
