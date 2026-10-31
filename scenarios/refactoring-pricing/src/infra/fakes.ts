// In-memory fakes for the DB and the notifier. Rows are cloned on read and write,
// so code under test cannot "save" by mutating a shared reference (a real DB would
// not let it either). transaction() restores the snapshot when the callback throws.
import type { AuditRow, Customer, Db, Notifier, Order, OutboxRow, Product } from './ports.ts';

export interface Seed {
  customers: Customer[];
  products: Product[];
  orders: Order[];
}

interface State {
  orders: Map<string, Order>;
  customers: Map<string, Customer>;
  outbox: OutboxRow[];
  audit: AuditRow[];
}

export class FakeDb implements Db {
  state: State;
  products: Map<string, Product>;
  failOn: 'saveOrder' | 'saveCustomer' | null = null;
  private nextOutboxId = 1;

  constructor(seed: Seed) {
    this.state = {
      orders: new Map(seed.orders.map((o) => [o.id, structuredClone(o)])),
      customers: new Map(seed.customers.map((c) => [c.id, structuredClone(c)])),
      outbox: [],
      audit: [],
    };
    this.products = new Map(seed.products.map((p) => [p.id, structuredClone(p)]));
  }

  async findOrder(id: string): Promise<Order | null> {
    const o = this.state.orders.get(id);
    return o ? structuredClone(o) : null;
  }

  async findCustomer(id: string): Promise<Customer> {
    const c = this.state.customers.get(id);
    if (!c) throw new Error(`customer ${id} not found`);
    return structuredClone(c);
  }

  async findProduct(id: string): Promise<Product> {
    const p = this.products.get(id);
    if (!p) throw new Error(`product ${id} not found`);
    return structuredClone(p);
  }

  async saveOrder(order: Order): Promise<void> {
    if (this.failOn === 'saveOrder') throw new Error('db: saveOrder failed');
    this.state.orders.set(order.id, structuredClone(order));
  }

  async saveCustomer(customer: Customer): Promise<void> {
    if (this.failOn === 'saveCustomer') throw new Error('db: saveCustomer failed');
    this.state.customers.set(customer.id, structuredClone(customer));
  }

  async insertOutbox(rows: Omit<OutboxRow, 'id' | 'sentAt'>[]): Promise<void> {
    for (const r of rows) this.state.outbox.push({ ...structuredClone(r), id: this.nextOutboxId++, sentAt: null });
  }

  async insertAudit(row: AuditRow): Promise<void> {
    this.state.audit.push(structuredClone(row));
  }

  async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    const snapshot = structuredClone(this.state);
    try {
      return await fn(this);
    } catch (err) {
      this.state = snapshot; // ROLLBACK
      throw err;
    }
  }
}

export class FakeNotifier implements Notifier {
  sent: { to: string; template: string; data: Record<string, unknown> }[] = [];
  async send(to: string, template: string, data: Record<string, unknown>): Promise<void> {
    this.sent.push({ to, template, data: structuredClone(data) });
  }
}
