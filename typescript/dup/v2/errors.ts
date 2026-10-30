// «Пакет помилок». dup/v1/errors.ts і dup/v2/errors.ts байт-у-байт однакові:
// так виглядають дві версії одного пакета в node_modules (вкладена копія через конфлікт semver)
// або CJS- і ESM-збірка одного пакета (dual-package hazard).
const BRAND = Symbol.for("acme.errors.NotFoundError");

export class NotFoundError extends Error {
  override readonly name = "NotFoundError";
  readonly code = "E_NOT_FOUND";
  readonly resource: string;
  constructor(resource: string, options?: ErrorOptions) {
    super(`${resource} not found`, options);
    this.resource = resource;
    // Бренд у рантаймі, але не в типі: типізоване поле `[BRAND]` з `unique symbol` зробило б
    // дві копії класу несумісними для компілятора (TS2741), як і `private`/`#`-поле.
    Object.defineProperty(this, BRAND, { value: true });
  }
  static is(e: unknown): e is NotFoundError {
    return typeof e === "object" && e !== null && (e as Record<symbol, unknown>)[BRAND] === true;
  }
}
