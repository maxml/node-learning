// GRASP (Larman, Applying UML and Patterns, 3rd ed.) на одному бекенд-сценарії «оформити замовлення».
// Запуск: node grasp.ts (Node 24, type stripping).

const log = (label: string, value: unknown) => console.log(label.padEnd(48), value);

// ── Information Expert + Creator ───────────────────────────────────────────
// Expert: total рахує той, хто має дані (Order має рядки, рядок має ціну й кількість).
// Creator: Order містить рядки, тож саме він їх і створює (addLine), а не сервіс.
class OrderLine {
  readonly sku: string;
  readonly unitPrice: number;
  readonly qty: number;
  constructor(sku: string, unitPrice: number, qty: number) {
    if (!Number.isInteger(qty) || qty <= 0) throw new RangeError("qty must be a positive integer");
    this.sku = sku;
    this.unitPrice = unitPrice;
    this.qty = qty;
  }
  subtotal() {
    return this.unitPrice * this.qty;
  }
}

class Order {
  readonly id: string;
  #lines: OrderLine[] = [];
  #status: "draft" | "placed" = "draft";
  constructor(id: string) {
    this.id = id;
  }
  addLine(sku: string, unitPrice: number, qty: number) {
    if (this.#status !== "draft") throw new Error("order already placed");
    this.#lines.push(new OrderLine(sku, unitPrice, qty)); // Creator
  }
  total() {
    return this.#lines.reduce((s, l) => s + l.subtotal(), 0); // Expert
  }
  place() {
    if (this.#lines.length === 0) throw new Error("empty order");
    this.#status = "placed";
  }
  get status() {
    return this.#status;
  }
}

// ── Polymorphism ───────────────────────────────────────────────────────────
// Поведінка залежить від «типу» доставки: кожен варіант має свою реалізацію, без switch.
interface ShippingPolicy {
  cost(orderTotal: number): number;
}
const shipping: Record<string, ShippingPolicy> = {
  standard: { cost: (t) => (t >= 100 ? 0 : 7) },
  express: { cost: () => 25 },
};

// ── Protected Variations ───────────────────────────────────────────────────
// Точка передбачуваної зміни (ставки податку / провайдер) закрита стабільним інтерфейсом.
interface TaxRates {
  rateFor(country: string): number;
}
const staticRates: TaxRates = { rateFor: (c) => (c === "UA" ? 0.2 : 0) };

// ── Indirection ────────────────────────────────────────────────────────────
// Проміжний об'єкт між доменом і зовнішнім SDK. Домен не знає форму SDK (центи, поля).
const fakePspSdk = {
  async createCharge(req: { amount_cents: number; currency: string; idempotency_key: string }) {
    return { id: `ch_${req.idempotency_key}`, status: "succeeded" as const, amount: req.amount_cents };
  },
};
interface PaymentGateway {
  charge(orderId: string, amount: number): Promise<{ ok: boolean; ref: string }>;
}
const pspAdapter: PaymentGateway = {
  async charge(orderId, amount) {
    const r = await fakePspSdk.createCharge({
      amount_cents: Math.round(amount * 100),
      currency: "UAH",
      idempotency_key: orderId,
    });
    return { ok: r.status === "succeeded", ref: r.id };
  },
};

// ── Pure Fabrication ───────────────────────────────────────────────────────
// Репозиторія немає в предметній області. Це вигаданий клас заради High Cohesion
// (Order не знає про збереження) і Low Coupling (домен не знає про БД).
class InMemoryOrderRepository {
  #rows = new Map<string, Order>();
  async save(o: Order) {
    this.#rows.set(o.id, o);
  }
  async get(id: string) {
    return this.#rows.get(id);
  }
}

// ── Controller ─────────────────────────────────────────────────────────────
// Перший об'єкт за межею UI/транспорту, що приймає системну операцію і делегує її.
// Він координує, але не рахує: total, доставку, податок роблять експерти.
type PlaceOrderCommand = {
  orderId: string;
  country: string;
  shipping: string;
  lines: { sku: string; price: number; qty: number }[];
};
class PlaceOrderHandler {
  repo: InMemoryOrderRepository;
  payments: PaymentGateway;
  taxes: TaxRates;
  constructor(repo: InMemoryOrderRepository, payments: PaymentGateway, taxes: TaxRates) {
    this.repo = repo;
    this.payments = payments;
    this.taxes = taxes;
  }
  async handle(cmd: PlaceOrderCommand) {
    const order = new Order(cmd.orderId);
    for (const l of cmd.lines) order.addLine(l.sku, l.price, l.qty);
    const policy = shipping[cmd.shipping];
    if (!policy) throw new Error(`unknown shipping "${cmd.shipping}"`);
    const net = order.total();
    const gross = net * (1 + this.taxes.rateFor(cmd.country)) + policy.cost(net);
    const payment = await this.payments.charge(order.id, gross);
    if (!payment.ok) throw new Error("payment failed");
    order.place();
    await this.repo.save(order);
    return { orderId: order.id, net, gross: Number(gross.toFixed(2)), ref: payment.ref };
  }
}

// Два різні «UI» викликають той самий контролер: HTTP-роут і консюмер черги.
const repo = new InMemoryOrderRepository();
const handler = new PlaceOrderHandler(repo, pspAdapter, staticRates);

async function httpRoute(body: unknown) {
  return { status: 201, body: await handler.handle(body as PlaceOrderCommand) };
}
async function queueConsumer(message: string) {
  return handler.handle(JSON.parse(message) as PlaceOrderCommand);
}

const cmd: PlaceOrderCommand = {
  orderId: "o-1",
  country: "UA",
  shipping: "standard",
  lines: [
    { sku: "book", price: 30, qty: 2 },
    { sku: "pen", price: 5, qty: 3 },
  ],
};
log("HTTP route → controller", await httpRoute(cmd));
log("queue consumer → same controller", await queueConsumer(JSON.stringify({ ...cmd, orderId: "o-2", shipping: "express" })));
log("repo status of o-1 (Pure Fabrication)", (await repo.get("o-1"))?.status);

// Protected Variations у дії: нова ставка = новий об'єкт TaxRates, контролер не змінюється.
const handlerEU = new PlaceOrderHandler(repo, pspAdapter, { rateFor: () => 0.21 });
log("same controller, swapped TaxRates", await handlerEU.handle({ ...cmd, orderId: "o-3" }));

// Інкапсуляція агрегату тримає інваріант: рядок не додати після place().
try {
  (await repo.get("o-1"))!.addLine("x", 1, 1);
} catch (e) {
  log("addLine after place()", (e as Error).message);
}
