// Branch by Abstraction: callers depend on PricingPort; a flag decides which
// implementation answers. 'shadow' is the parallel run: legacy stays authoritative
// (its result and its side effects), the new core is evaluated on the SAME input
// with no side effects at all, and every mismatch is reported.
import type { Db, PriceResult } from '../infra/ports.ts';
import { LegacyPricingService } from '../legacy/pricing.service.ts';
import { decide } from './decide.ts';
import { PricingService, toResult } from './pricing.service.ts';
import { DEFAULT_POLICY, type PricingPolicy } from './rules.ts';

export interface PricingPort {
  price(orderId: string): Promise<PriceResult>;
}

export type PricingMode = 'legacy' | 'shadow' | 'new';

export interface Mismatch { orderId: string; legacy: PriceResult; candidate: PriceResult | { error: string } }

export class PricingRouter implements PricingPort {
  legacy: LegacyPricingService;
  next: PricingService;
  mode: (orderId: string) => PricingMode;
  onMismatch: (m: Mismatch) => void;
  candidatePolicy: PricingPolicy;

  constructor(opts: {
    legacy: LegacyPricingService;
    next: PricingService;
    mode: (orderId: string) => PricingMode;
    onMismatch: (m: Mismatch) => void;
    candidatePolicy?: PricingPolicy;
  }) {
    this.legacy = opts.legacy;
    this.next = opts.next;
    this.mode = opts.mode;
    this.onMismatch = opts.onMismatch;
    this.candidatePolicy = opts.candidatePolicy ?? DEFAULT_POLICY;
  }

  async price(orderId: string): Promise<PriceResult> {
    const mode = this.mode(orderId);
    if (mode === 'new') return this.next.price(orderId);
    if (mode === 'legacy') return this.legacy.calculatePrice(orderId);

    // shadow: snapshot the input BEFORE legacy mutates order and customer
    // (legacy bumps ordersCount, so reading afterwards would flip firstOrder)
    const { input } = await this.next.loadInput(orderId);
    const authoritative = await this.legacy.calculatePrice(orderId);
    let candidate: PriceResult | { error: string };
    try {
      candidate = toResult(decide(input, this.candidatePolicy));
    } catch (err) {
      candidate = { error: (err as Error).message };
    }
    if (JSON.stringify(candidate) !== JSON.stringify(authoritative)) {
      this.onMismatch({ orderId, legacy: authoritative, candidate });
    }
    return authoritative;
  }
}

export function createPricing(db: Db, notifier: ConstructorParameters<typeof LegacyPricingService>[1], mode: (id: string) => PricingMode, onMismatch: (m: Mismatch) => void, candidatePolicy?: PricingPolicy): PricingRouter {
  return new PricingRouter({
    legacy: new LegacyPricingService(db, notifier),
    next: new PricingService(db),
    mode,
    onMismatch,
    candidatePolicy,
  });
}
