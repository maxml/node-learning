// Принципи ООП у JS/TS: що з «ООП-словника» існує в рантаймі, а що лише в компіляторі.
// Запуск: node oop.ts (Node 24, type stripping). Перевірка типів: npx tsc -p tsconfig.json.

const log = (label: string, value: unknown) => console.log(label.padEnd(44), value);

// ── 1. Інкапсуляція: TS `private` проти ES `#private` ────────────────────────
class TsPrivateAccount {
  private balance = 100; // перевірка лише компілятором
  withdraw(amount: number) {
    if (amount > this.balance) throw new RangeError("insufficient funds");
    this.balance -= amount;
  }
}

class EsPrivateAccount {
  #balance = 100; // приватність у рантаймі (ES2022)
  withdraw(amount: number) {
    if (amount > this.#balance) throw new RangeError("insufficient funds");
    this.#balance -= amount;
  }
  static isAccount(x: object): boolean {
    return #balance in x; // brand check: чи створено об'єкт цим класом
  }
}

console.log("§1 encapsulation");
const tsAcc = new TsPrivateAccount();
(tsAcc as any).balance = 1_000_000; // обхід інваріанта: компілятор мовчить після `as any`
log("TS private: JSON.stringify", JSON.stringify(tsAcc));
log("TS private: Object.keys", Object.keys(tsAcc));
const esAcc = new EsPrivateAccount();
log("ES #private: JSON.stringify (before)", JSON.stringify(esAcc));
(esAcc as any).balance = 1_000_000; // створює НОВУ публічну властивість, #balance не чіпає
log("ES #private: JSON.stringify", JSON.stringify(esAcc));
try {
  esAcc.withdraw(500);
} catch (e) {
  log("ES #private: withdraw(500) after 'hack'", (e as Error).message);
}
log("ES #private: #balance in esAcc", EsPrivateAccount.isAccount(esAcc));
log("ES #private: #balance in {balance:1}", EsPrivateAccount.isAccount({ balance: 1 }));

// ── 2. `implements` і структурна типізація ──────────────────────────────────
interface Notifier {
  send(to: string, text: string): string;
}
class EmailNotifier implements Notifier {
  send(to: string, text: string) {
    return `email ${to}: ${text}`;
  }
}
// Об'єкт без класу проходить як EmailNotifier: тип класу без приватних членів структурний.
const fake: EmailNotifier = { send: (to, text) => `fake ${to}: ${text}` };

console.log("\n§2 implements / structural typing");
log("implements leaves a runtime trace?", Object.getOwnPropertyNames(EmailNotifier.prototype));
log("fake instanceof EmailNotifier", fake instanceof EmailNotifier);
log("fake.send()", fake.send("a@b.c", "hi"));

// ── 3. Три види поліморфізму (Cardelli & Wegner 1985) ───────────────────────
abstract class Shape {
  abstract area(): number;
  describe() {
    return `${this.constructor.name} area=${this.area().toFixed(2)}`; // пізнє зв'язування
  }
}
class Circle extends Shape {
  r: number;
  constructor(r: number) {
    super();
    this.r = r;
  }
  area() {
    return Math.PI * this.r ** 2;
  }
}
class Rect extends Shape {
  w: number;
  h: number;
  constructor(w: number, h: number) {
    super();
    this.w = w;
    this.h = h;
  }
  area() {
    return this.w * this.h;
  }
}

// параметричний: один код для будь-якого T
function first<T>(xs: readonly T[]): T | undefined {
  return xs[0];
}

// ad hoc (перевантаження): у TS кілька сигнатур, але ОДНА реалізація з перевіркою типу
function format(x: number): string;
function format(x: Date): string;
function format(x: number | Date): string {
  return typeof x === "number" ? x.toFixed(2) : x.toISOString().slice(0, 10);
}

console.log("\n§3 polymorphism");
for (const s of [new Circle(1), new Rect(2, 3)]) log("subtype (inclusion):", s.describe());
log("lookup path of describe on Circle", Object.hasOwn(Circle.prototype, "describe") ? "own" : "inherited via prototype chain");
log("parametric first<number>", first([1, 2]));
log("parametric first<string>", first(["a"]));
log("ad hoc overload format(3.14159)", format(3.14159));
log("ad hoc overload format(Date)", format(new Date(Date.UTC(2026, 9, 30))));
log("ad hoc coercion 1 + '2'", 1 + ("2" as any));

// ── 4. «Спадкування ламає інкапсуляцію»: крихкий базовий клас ───────────────
// Конструктор Set за специфікацією викликає this.add для кожного елемента ітерованого.
class CountingSet<T> extends Set<T> {
  added = 0; // ініціалізатор поля виконується ПІСЛЯ super()
  override add(v: T) {
    this.added = (this.added ?? 0) + 1;
    return super.add(v);
  }
}

console.log("\n§4 fragile base class");
const cs = new CountingSet([1, 2, 3]);
log("new CountingSet([1,2,3]).size", cs.size);
log("…added (expected 3)", cs.added);

// ── 5. Композиція: обгортка залежить лише від публічного контракту ──────────
class CountingSetWrapper<T> {
  added = 0;
  #inner = new Set<T>();
  constructor(items: Iterable<T> = []) {
    for (const v of items) this.add(v);
  }
  add(v: T) {
    this.added++;
    this.#inner.add(v);
    return this;
  }
  has(v: T) {
    return this.#inner.has(v);
  }
  get size() {
    return this.#inner.size;
  }
}
const cw = new CountingSetWrapper([1, 2, 3]);
console.log("\n§5 composition");
log("wrapper size / added", `${cw.size} / ${cw.added}`);

// ── 6. Міксин з ex_typescript/start/oop.ts: копіює лише прототип ────────────
class Activatable {
  isActive = false;
  activate() {
    this.isActive = true;
  }
}
class SmartObject {}
interface SmartObject extends Activatable {}
for (const name of Object.getOwnPropertyNames(Activatable.prototype)) {
  Object.defineProperty(SmartObject.prototype, name, Object.getOwnPropertyDescriptor(Activatable.prototype, name)!);
}
const so = new SmartObject();
console.log("\n§6 prototype-copy mixin");
log("isActive before activate() (type says boolean)", so.isActive);
