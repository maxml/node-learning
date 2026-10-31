// Money is an integer number of minor units (cents). Every percentage goes
// through ONE function, so the rounding point and the rounding rule live in one place.
//
// `legacyMoney` reproduces what production does today (float multiply, then
// Math.round). The refactor PR keeps it so the golden master stays byte-identical.
// `exactMoney` is pure integer arithmetic with half-up rounding. Switching to it is
// a behaviour change and ships as its own PR with its own re-approved golden master
// (scripts/rounding-diff.ts counts what it would change).

export type Minor = number;

export interface MoneyPolicy {
  name: string;
  /** amount reduced by `percent` %, rounded to a whole minor unit */
  percentOff(amount: Minor, percent: number): Minor;
  /** `basisPoints`/10000 of amount, rounded to a whole minor unit (tax, caps) */
  share(amount: Minor, basisPoints: number): Minor;
}

function assertMinor(x: number): void {
  if (!Number.isSafeInteger(x)) throw new RangeError(`not a whole minor amount: ${x}`);
}

export const legacyMoney: MoneyPolicy = {
  name: 'legacy-float',
  percentOff(amount, percent) {
    assertMinor(amount);
    return Math.round(amount * (1 - percent / 100));
  },
  share(amount, basisPoints) {
    assertMinor(amount);
    return Math.round(amount * (basisPoints / 10000));
  },
};

/** n / d rounded half-up, for n >= 0, d > 0, all integers */
function divHalfUp(n: number, d: number): number {
  return Math.floor((2 * n + d) / (2 * d));
}

export const exactMoney: MoneyPolicy = {
  name: 'exact-integer',
  percentOff(amount, percent) {
    assertMinor(amount);
    return divHalfUp(amount * (100 - percent), 100);
  },
  share(amount, basisPoints) {
    assertMinor(amount);
    return divHalfUp(amount * basisPoints, 10000);
  },
};
