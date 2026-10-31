// DELIBERATELY MESSY. This is the "before" picture: one method that loads data,
// decides eligibility and price through nested ifs, mutates entities, sends
// notifications and saves, in that (wrong) order. Do not copy this style.
// In the real app it is `@Injectable() class PricingService` in NestJS; decorators
// are dropped here because Node's type stripping does not run them.
import type { Db, Notifier, PriceResult } from '../infra/ports.ts';

export class LegacyPricingService {
  db: Db;
  notifier: Notifier;

  constructor(db: Db, notifier: Notifier) {
    this.db = db;
    this.notifier = notifier;
  }

  // 2019 v1 (prices), 2021 promos, 2022 finance cap, 2023 DE services, 2024 PL partners.
  // Ask sales before touching anything here.
  async calculatePrice(orderId: string): Promise<PriceResult> {
    const order = await this.db.findOrder(orderId);
    if (!order) {
      throw new Error('Order not found: ' + orderId);
    }
    const customer = await this.db.findCustomer(order.customerId);
    const product = await this.db.findProduct(order.productId);

    let price = product.priceCents * order.quantity;
    let ok = true;
    let reason: string | null = null;

    // ---- eligibility -------------------------------------------------------
    if (customer.country === 'US') {
      if (product.category === 'hardware') {
        if (customer.type !== 'business') {
          ok = false;
          reason = 'HARDWARE_EXPORT';
        }
      }
    } else {
      if (customer.country === 'DE') {
        if (product.category === 'service') {
          if (customer.type === 'retail') {
            ok = false;
            reason = 'SERVICE_NOT_AVAILABLE';
          }
        }
      }
    }
    if (ok) {
      if (product.category === 'hardware') {
        if (customer.type === 'retail') {
          if (order.quantity > 20) {
            ok = false;
            reason = 'QUANTITY_LIMIT';
          }
        }
      }
    }
    if (!ok) {
      order.status = 'rejected';
      order.rejectReason = reason!;
      // notification goes out before the save: if the save fails the customer
      // is still told the order was rejected
      await this.notifier.send(customer.email, 'order-rejected', { orderId: order.id, reason });
      await this.db.saveOrder(order);
      return { eligible: false, reason: reason! };
    }

    // retail cannot sign multi-year; sales asked to downgrade silently (and it
    // is written back to the order below, so the customer sees "annual")
    if (order.contract === 'multiYear' && customer.type === 'retail') {
      order.contract = 'annual';
    }

    // ---- customer discount ------------------------------------------------
    if (customer.type === 'vip') {
      price = Math.round(price * (1 - 15 / 100));
    } else {
      if (customer.type === 'business') {
        if (order.quantity >= 10) {
          price = Math.round(price * (1 - 8 / 100));
        } else {
          price = Math.round(price * (1 - 3 / 100));
        }
        if (customer.country === 'PL') {
          if (product.category === 'software' && order.contract === 'annual') {
            price = Math.round(price * (1 - 2 / 100)); // PL partner programme
          }
        }
      }
    }

    // ---- contract discount (not with BLACKFRIDAY, except services) --------
    if (order.promoCode !== 'BLACKFRIDAY' || product.category === 'service') {
      if (product.category !== 'hardware') {
        if (order.contract === 'annual') {
          price = Math.round(price * (1 - 5 / 100));
        } else if (order.contract === 'multiYear') {
          price = Math.round(price * (1 - 10 / 100));
        }
      }
    }

    // ---- promo codes --------------------------------------------------------
    if (order.promoCode) {
      if (order.promoCode === 'WELCOME10') {
        if (customer.ordersCount === 0) {
          if (customer.type === 'retail') {
            price = Math.round(price * 0.9);
          }
        }
      } else if (order.promoCode === 'BULK') {
        if (customer.type !== 'vip') {
          if (order.quantity >= 50) {
            price = Math.round(price * (1 - 12 / 100));
          } else if (order.quantity >= 10) {
            price = Math.round(price * (1 - 6 / 100));
          }
        } else {
          if (order.quantity >= 50) {
            price = Math.round(price * (1 - 5 / 100));
          }
        }
      } else if (order.promoCode === 'BLACKFRIDAY') {
        if (product.category === 'hardware') {
          price = Math.round(price * (1 - 10 / 100));
        } else {
          price = Math.round(price * (1 - 20 / 100));
        }
      }
      // unknown or expired codes are silently ignored
    }

    // finance 2022: never more than 35% off the list price
    const list = product.priceCents * order.quantity;
    if (price < Math.round(list * 0.65)) {
      price = Math.round(list * 0.65);
    }

    // ---- tax ----------------------------------------------------------------
    let tax = 0;
    if (customer.country === 'UA') {
      tax = Math.round(price * 0.2);
    } else if (customer.country === 'PL') {
      tax = Math.round(price * 0.23);
    } else if (customer.country === 'DE') {
      tax = Math.round(price * 0.19);
    }

    // ---- shipping -------------------------------------------------------------
    let shipping = 0;
    if (product.category === 'hardware') {
      if (customer.type !== 'vip') {
        if (customer.country === 'UA') {
          if (price < 20000) {
            shipping = 500;
          }
        } else {
          shipping = 1500;
        }
      }
    }

    const total = price + tax + shipping;

    // ---- mutate entities --------------------------------------------------------
    order.status = 'priced';
    order.netCents = price;
    order.taxCents = tax;
    order.shippingCents = shipping;
    order.totalCents = total;
    if (customer.type !== 'retail') {
      let pts = Math.floor(total / 1000);
      if (customer.type === 'vip') {
        pts = pts * 2;
      }
      customer.loyaltyPoints = customer.loyaltyPoints + pts;
    }
    customer.ordersCount++;

    // ---- notifications (before the save, again) ---------------------------------
    if (total > 100000) {
      await this.notifier.send('sales@example.com', 'large-order', { orderId: order.id, total });
    }
    if (customer.type === 'vip') {
      await this.notifier.send(customer.email, 'vip-thanks', { orderId: order.id });
    }

    await this.db.saveOrder(order);
    await this.db.saveCustomer(customer);

    return { eligible: true, net: price, tax, shipping, total };
  }
}
