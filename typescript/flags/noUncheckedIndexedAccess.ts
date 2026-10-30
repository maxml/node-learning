// Bug class: an index signature or array index promises a value for EVERY key.
// A missing key or an empty array yields undefined at runtime; strict alone does not see it.
export function port(cfg: Record<string, string>): number {
  return Number.parseInt(cfg["PORT"].trim(), 10);
}
export function head(xs: string[]): string {
  return xs[0].toUpperCase();
}
