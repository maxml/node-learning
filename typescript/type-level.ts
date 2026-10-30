// Compile-time assertions: this file has no runtime output. `tsc -p tsconfig.json`
// passing with 0 errors IS the result. A wrong Expect<Equal<...>> is a TS2344 error,
// and an unused @ts-expect-error is TS2578, so neither can pass vacuously.
export type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
export type Expect<T extends true> = T;

// 1. Distributive conditional types: a naked type parameter distributes over a union.
type ToArray<T> = T extends unknown ? T[] : never;
type ToArrayND<T> = [T] extends [unknown] ? T[] : never; // [] wrapping turns distribution off
export type _1a = Expect<Equal<ToArray<string | number>, string[] | number[]>>;
export type _1b = Expect<Equal<ToArrayND<string | number>, (string | number)[]>>;
// ...and `never` is the empty union: distributing over it yields never, not never[].
export type _1c = Expect<Equal<ToArray<never>, never>>;
export type _1d = Expect<Equal<ToArrayND<never>, never[]>>;

// 2. `infer` and how the built-in utility types are made (lib.es5.d.ts definitions).
type MyReturnType<F> = F extends (...args: never[]) => infer R ? R : never;
type MyAwaited<T> = T extends PromiseLike<infer U> ? MyAwaited<U> : T;
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
type MyExclude<T, U> = T extends U ? never : T; // relies on distribution from (1)
export type _2a = Expect<Equal<MyReturnType<() => Promise<number>>, Promise<number>>>;
export type _2b = Expect<Equal<MyAwaited<Promise<Promise<string>>>, string>>;
export type _2c = Expect<Equal<MyPick<{ a: 1; b: 2 }, "a">, { a: 1 }>>;
export type _2d = Expect<Equal<MyExclude<"a" | "b" | "c", "a">, "b" | "c">>;

// 3. Mapped types with key remapping and template literal types.
type Getters<T> = { [K in keyof T & string as `get${Capitalize<K>}`]: () => T[K] };
export type _3a = Expect<Equal<Getters<{ id: number; name: string }>, { getId: () => number; getName: () => string }>>;
type Route = `/${"users" | "orders"}/${"list" | "get"}`;
export type _3b = Expect<Equal<Route, "/users/list" | "/users/get" | "/orders/list" | "/orders/get">>;
type ParamNames<S extends string> = S extends `${string}:${infer P}/${infer Rest}` ? P | ParamNames<`/${Rest}`> : S extends `${string}:${infer P}` ? P : never;
export type _3c = Expect<Equal<ParamNames<"/orgs/:orgId/users/:userId">, "orgId" | "userId">>;

// 4. Discriminated union + exhaustiveness: adding a variant breaks every unhandled switch.
type Payment = { kind: "card"; last4: string } | { kind: "sepa"; iban: string } | { kind: "refund"; of: string };
function assertNever(x: never): never {
  throw new Error(`unhandled: ${JSON.stringify(x)}`);
}
export function describe(p: Payment): string {
  switch (p.kind) {
    case "card":
      return `card *${p.last4}`; // narrowed: p.last4 exists only here
    case "sepa":
      return `sepa ${p.iban}`;
    default:
      // @ts-expect-error "refund" is not handled, so p is not never here (remove the directive to see TS2345)
      return assertNever(p);
  }
}

// 5. const type parameters (5.0) and NoInfer (5.4).
function tuple<const T extends readonly unknown[]>(...xs: T): T {
  return xs;
}
export const t = tuple("a", 1);
export type _5a = Expect<Equal<typeof t, readonly ["a", 1]>>;
function withDefault<T extends string>(allowed: T[], fallback: NoInfer<T>): T {
  return allowed[0] ?? fallback;
}
// @ts-expect-error without NoInfer, "blue" would widen T to "red" | "green" | "blue"
withDefault(["red", "green"], "blue");

// 6. `satisfies` (4.9): check against a type without replacing the inferred type.
const annotated: Record<string, `/${string}`> = { home: "/", user: "/users/:id" };
const routes = { home: "/", user: "/users/:id" } satisfies Record<string, `/${string}`>;
export type _6a = Expect<Equal<keyof typeof annotated, string>>; // annotation forgets the keys: annotated.typo compiles
export type _6b = Expect<Equal<keyof typeof routes, "home" | "user">>; // satisfies keeps them
// The template-literal contextual type even keeps the literal value (no `as const` needed).
export type _6c = Expect<Equal<typeof routes.user, "/users/:id">>;
// @ts-expect-error satisfies rejects a value that breaks the contract
export const bad = { home: "no-slash" } satisfies Record<string, `/${string}`>;

// 7. Variance annotations (4.7): `out` declares covariance and is checked against the body.
interface Producer<out T> {
  get(): T;
}
// @ts-expect-error T in an input position: `out` is a lie and tsc says so (TS2636)
interface BadProducer<out T> {
  set: (v: T) => void;
}
// Caveat: with METHOD syntax `set(v: T): void` the same lie is NOT reported,
// because method parameters are bivariant (see soundness-holes.ts, hole 2)...
interface LyingProducer<out T> {
  set(v: T): void;
}
// ...and from then on the compiler trusts the annotation: a consumer of "a" is
// accepted where a consumer of any string is expected.
export type _7b = Expect<Equal<LyingProducer<"a"> extends LyingProducer<string> ? true : false, true>>;
export type _7c = Expect<Equal<LyingProducer<string> extends LyingProducer<"a"> ? true : false, false>>;
export type _7a = Expect<Equal<Producer<"a"> extends Producer<string> ? true : false, true>>;
