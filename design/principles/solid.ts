// SOLID: кожен принцип як порушення → виправлення з видимим у рантаймі наслідком.
// Запуск: node solid.ts (Node 24, type stripping).

const log = (label: string, value: unknown) => console.log(label.padEnd(52), value);

// ── S. Single Responsibility: «один актор», а не «одна дія» ─────────────────
// Приклад Мартіна (Clean Architecture, гл. 7): calculatePay потрібен бухгалтерії (CFO),
// reportHours відділу кадрів (COO). Обидва спираються на спільний regularHours().
type Shift = { hours: number };

class EmployeeViolating {
  overtimeThreshold = 8; // «правило» живе в одному місці для двох акторів
  shifts: Shift[];
  constructor(shifts: Shift[]) {
    this.shifts = shifts;
  }
  regularHours() {
    return this.shifts.reduce((s, x) => s + Math.min(x.hours, this.overtimeThreshold), 0);
  }
  calculatePay(rate: number) {
    return this.regularHours() * rate; // для бухгалтерії
  }
  reportHours() {
    return `regular=${this.regularHours()}`; // для кадрів
  }
}

console.log("S: single responsibility");
const shifts = [{ hours: 9 }, { hours: 7 }];
const ev = new EmployeeViolating(shifts);
const hrBefore = ev.reportHours();
ev.overtimeThreshold = 7.5; // бухгалтерія змінила правило оплати
log("violating: HR report before/after accounting change", `${hrBefore} → ${ev.reportHours()}`);

// Виправлення: дані окремо, кожен актор має свій модуль зі своїм правилом.
const payCalculator = {
  overtimeThreshold: 7.5,
  pay(s: Shift[], rate: number) {
    return s.reduce((sum, x) => sum + Math.min(x.hours, this.overtimeThreshold), 0) * rate;
  },
};
const hourReporter = {
  report(s: Shift[]) {
    return `regular=${s.reduce((sum, x) => sum + Math.min(x.hours, 8), 0)}`;
  },
};
log("fixed: HR report after accounting change", hourReporter.report(shifts));
log("fixed: pay with the new accounting rule", payCalculator.pay(shifts, 10));

// ── O. Open/Closed: нова поведінка = новий модуль, старий не редагується ────
type Order = { total: number; customer: { tier: string } };

function discountViolating(o: Order): number {
  switch (o.customer.tier) {
    case "regular":
      return 0;
    case "gold":
      return o.total * 0.05;
    default:
      return 0; // новий tier тихо отримує 0, доки хтось не відредагує switch
  }
}

interface DiscountPolicy {
  discount(o: Order): number;
}
const policies = new Map<string, DiscountPolicy>([
  ["regular", { discount: () => 0 }],
  ["gold", { discount: (o) => o.total * 0.05 }],
]);
function discountFixed(o: Order): number {
  const p = policies.get(o.customer.tier);
  if (!p) throw new Error(`no discount policy for tier "${o.customer.tier}"`);
  return p.discount(o);
}
policies.set("platinum", { discount: (o) => o.total * 0.1 }); // розширення без редагування discountFixed

console.log("\nO: open/closed");
const plat: Order = { total: 200, customer: { tier: "platinum" } };
log("violating: platinum discount", discountViolating(plat));
log("fixed: platinum discount", discountFixed(plat));

// ── L. Liskov: контрактний тест, спільний для всіх реалізацій ───────────────
// Підтип не може посилювати передумову (Liskov & Wing 1994, pre-condition rule).
class CheckingAccount {
  balance = 0;
  open(amount: number) {
    if (amount < 0) throw new RangeError("negative deposit");
    this.balance = amount;
  }
}
class BusinessCheckingAccount extends CheckingAccount {
  override open(amount: number) {
    if (amount < 1000) throw new RangeError("business accounts need >= 1000"); // посилена передумова
    super.open(amount);
  }
}
// Контракт базового типу, як його бачить клієнт: будь-яка сума >= 0 приймається.
function checkingAccountContract(make: () => CheckingAccount): string {
  for (const amount of [0, 1, 500]) {
    try {
      make().open(amount);
    } catch (e) {
      return `FAIL at open(${amount}): ${(e as Error).message}`;
    }
  }
  return "ok";
}

console.log("\nL: liskov substitution");
log("contract vs CheckingAccount", checkingAccountContract(() => new CheckingAccount()));
log("contract vs BusinessCheckingAccount", checkingAccountContract(() => new BusinessCheckingAccount()));

// Виправлення: мінімальна сума стає частиною контракту базового типу, клієнт її бачить.
abstract class Account {
  balance = 0;
  abstract readonly minimumDeposit: number;
  open(amount: number) {
    if (amount < this.minimumDeposit) throw new RangeError(`minimum is ${this.minimumDeposit}`);
    this.balance = amount;
  }
}
class PersonalAccount extends Account {
  readonly minimumDeposit = 0;
}
class BusinessAccount extends Account {
  readonly minimumDeposit = 1000;
}
function accountContract(make: () => Account): string {
  const probe = make();
  for (const amount of [probe.minimumDeposit, probe.minimumDeposit + 1]) {
    try {
      make().open(amount);
    } catch (e) {
      return `FAIL at open(${amount}): ${(e as Error).message}`;
    }
  }
  return "ok";
}
log("fixed contract vs PersonalAccount", accountContract(() => new PersonalAccount()));
log("fixed contract vs BusinessAccount", accountContract(() => new BusinessAccount()));
// Контрольна мутація: підтип, що заявляє мінімум 0, але потай вимагає 1000. Тест мусить упасти.
class LyingAccount extends Account {
  readonly minimumDeposit = 0;
  override open(amount: number) {
    if (amount < 1000) throw new RangeError("secret minimum 1000");
    super.open(amount);
  }
}
log("fixed contract vs LyingAccount (mutation)", accountContract(() => new LyingAccount()));

// ── I. Interface Segregation: клієнт оголошує роль, яка йому потрібна ───────
type User = { id: string; email: string; passwordHash: string };
interface UserRepository {
  findById(id: string): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
  list(page: number): Promise<User[]>;
  create(u: User): Promise<void>;
  updatePassword(id: string, hash: string): Promise<void>;
  delete(id: string): Promise<void>;
  countActive(): Promise<number>;
}
// Роль, яку сервіс справді використовує. Структурна типізація: будь-який повний
// UserRepository підходить сюди без `implements`.
type PasswordResetStore = Pick<UserRepository, "findByEmail" | "updatePassword">;

class PasswordResetService {
  store: PasswordResetStore;
  constructor(store: PasswordResetStore) {
    this.store = store;
  }
  async reset(email: string, newHash: string) {
    const u = await this.store.findByEmail(email);
    if (!u) return "unknown email";
    await this.store.updatePassword(u.id, newHash);
    return `password updated for ${u.id}`;
  }
}

const users = new Map<string, User>([["u1", { id: "u1", email: "a@b.c", passwordHash: "old" }]]);
const twoMethodFake: PasswordResetStore = {
  findByEmail: async (email) => [...users.values()].find((u) => u.email === email),
  updatePassword: async (id, hash) => {
    users.get(id)!.passwordHash = hash;
  },
};

console.log("\nI: interface segregation");
log("reset via 2-method fake", await new PasswordResetService(twoMethodFake).reset("a@b.c", "new"));
log("methods the fake had to implement", Object.keys(twoMethodFake).length);

// ── D. Dependency Inversion: абстракцію визначає і володіє нею верхній рівень ─
// Порт (у модулі домену). Адаптери нижнього рівня залежать від нього, а не навпаки.
interface OrderStore {
  save(o: { id: string; total: number }): Promise<void>;
}
class PlaceOrder {
  store: OrderStore;
  constructor(store: OrderStore) {
    this.store = store;
  }
  async run(id: string, total: number) {
    if (total <= 0) throw new RangeError("empty order");
    await this.store.save({ id, total });
    return id;
  }
}
// Адаптер (інфраструктура). У реальному коді: Mongo/Postgres; тут пам'ять.
class InMemoryOrderStore implements OrderStore {
  rows: { id: string; total: number }[] = [];
  async save(o: { id: string; total: number }) {
    this.rows.push(o);
  }
}
// Composition root: єдине місце, яке знає конкретні класи.
const store = new InMemoryOrderStore();
const placeOrder = new PlaceOrder(store);

console.log("\nD: dependency inversion");
log("placeOrder.run('o-1', 42)", await placeOrder.run("o-1", 42));
log("adapter rows", store.rows);
