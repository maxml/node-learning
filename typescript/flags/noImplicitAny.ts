// Bug class: an unannotated parameter silently becomes `any`, so a typo in a
// property name (`prise`) compiles and returns NaN at runtime.
export function total(items) {
  return items.reduce((sum, item) => sum + item.prise, 0);
}
