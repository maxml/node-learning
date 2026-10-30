// Bug class: one branch forgets to return; the caller gets undefined.
export function fee(kind: "card" | "sepa" | "cash", amount: number) {
  if (kind === "card") return amount * 0.029;
  if (kind === "sepa") return 0.35;
}
