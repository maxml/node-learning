// Bug class: `call`/`apply`/`bind` were typed as (...args: any[]) => any,
// so a wrong argument type passed through `call` was not checked.
function cents(amount: number): number {
  return Math.round(amount * 100);
}
export const r = cents.call(undefined, "12.50");
