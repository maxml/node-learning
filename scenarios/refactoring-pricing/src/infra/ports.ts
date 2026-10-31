// Shapes of the persisted rows and the two side-effect ports (DB, notifications).
// In the NestJS app these are injected providers; injection is the seam that lets
// the characterization test run the legacy method against fakes.

export type CustomerType = 'retail' | 'business' | 'vip';
export type Country = 'UA' | 'PL' | 'DE' | 'US';
export type Category = 'software' | 'hardware' | 'service';
export type Contract = 'none' | 'annual' | 'multiYear';

export interface Customer {
  id: string;
  type: CustomerType;
  country: Country;
  email: string;
  ordersCount: number;
  loyaltyPoints: number;
}

export interface Product {
  id: string;
  category: Category;
  priceCents: number;
}

export interface Order {
  id: string;
  customerId: string;
  productId: string;
  quantity: number;
  contract: Contract;
  promoCode: string | null;
  status: 'new' | 'priced' | 'rejected';
  rejectReason?: string;
  netCents?: number;
  taxCents?: number;
  shippingCents?: number;
  totalCents?: number;
}

export interface OutboxRow {
  id: number;
  type: string;
  to: string;
  template: string;
  data: Record<string, unknown>;
  sentAt: string | null;
}

export interface AuditRow {
  orderId: string;
  breakdown: unknown;
}

export interface Db {
  findOrder(id: string): Promise<Order | null>;
  findCustomer(id: string): Promise<Customer>;
  findProduct(id: string): Promise<Product>;
  saveOrder(order: Order): Promise<void>;
  saveCustomer(customer: Customer): Promise<void>;
  insertOutbox(rows: Omit<OutboxRow, 'id' | 'sentAt'>[]): Promise<void>;
  insertAudit(row: AuditRow): Promise<void>;
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

export interface Notifier {
  send(to: string, template: string, data: Record<string, unknown>): Promise<void>;
}

// What the HTTP layer returns today; the refactor must keep this contract.
export type PriceResult =
  | { eligible: false; reason: string }
  | { eligible: true; net: number; tax: number; shipping: number; total: number };
