// Bug class: when a built-in iterator is exhausted, `next().value` is undefined.
// Without the flag its return type is `any`, so `value` is typed `any` and the
// empty-map case is invisible to the checker.
export function firstPrice(prices: Map<string, number>): string {
  const r = prices.values().next();
  return r.value.toFixed(2);
}
