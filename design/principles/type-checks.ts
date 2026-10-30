// Твердження про компілятор. Файл «зелений», коли `npx tsc -p tsconfig.json` дає 0 помилок:
// кожен рядок під `@ts-expect-error` МУСИТЬ давати помилку (інакше TS2578 Unused directive),
// а рядки без директиви мусять компілюватися. Запуск у рантаймі нічого не робить.

// ── 1. Приватні члени роблять тип класу номінальним ─────────────────────────
class Plain {
  balance = 0;
}
class WithTsPrivate {
  private balance = 0;
}
class WithEsPrivate {
  #balance = 0;
  get balance() {
    return this.#balance;
  }
}
export const a: Plain = { balance: 1 }; // структурно: проходить
// @ts-expect-error  TS2322: Property 'balance' is private in type 'WithTsPrivate'
export const b: WithTsPrivate = { balance: 1 };
// @ts-expect-error  TS2741: Property '#balance' is missing
export const c: WithEsPrivate = { balance: 1 };

// ── 2. LSP, правило сигнатур: параметр має бути контраваріантним ───────────
interface DomainEvent {
  type: string;
}
interface OrderPlaced extends DomainEvent {
  orderId: string;
}

// Метод (method syntax) біваріантний навіть під strict: звуження параметра КОМПІЛЮЄТЬСЯ.
class Handler {
  handle(e: DomainEvent): string {
    return e.type;
  }
}
class OrderHandler extends Handler {
  override handle(e: OrderPlaced): string {
    return e.orderId.toUpperCase(); // впаде на події без orderId
  }
}
export const h: Handler = new OrderHandler(); // компілятор не заперечує

// Властивість-функція (property syntax) під strictFunctionTypes перевіряється контраваріантно.
interface StrictHandler {
  handle: (e: DomainEvent) => string;
}
// @ts-expect-error  TS2322: OrderPlaced-параметр несумісний з DomainEvent
export const sh: StrictHandler = { handle: (e: OrderPlaced) => e.orderId };

// ── 3. Повертаний тип коваріантний: звуження результату дозволене ──────────
class Repo {
  find(): DomainEvent | undefined {
    return undefined;
  }
}
class OrderRepo extends Repo {
  override find(): OrderPlaced {
    return { type: "OrderPlaced", orderId: "o-1" };
  }
}
export const r: Repo = new OrderRepo();

// ── 4. Але поведінкові правила (pre/post/invariant) компілятор не бачить ───
class Account {
  open(amount: number): void {
    if (amount < 0) throw new RangeError("negative");
  }
}
class BusinessAccount extends Account {
  override open(amount: number): void {
    if (amount < 1000) throw new RangeError("min 1000"); // посилене передумова = порушення LSP
  }
}
export const acc: Account = new BusinessAccount(); // 0 помилок компіляції
