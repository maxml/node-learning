// Each function below type-checks under `strict: true` (see tsconfig.json) with
// zero errors, then fails at runtime. Run: npm run holes:check && npm run holes:run

type Animal = { name: string };
type Dog = Animal & { bark(): string };
type Cat = Animal & { meow(): string };
const rex: Dog = { name: "rex", bark: () => "woof" };
const tom: Cat = { name: "tom", meow: () => "meow" };

// 1. Mutable arrays are covariant: Dog[] is accepted as Animal[], then a Cat is pushed in.
function arrayCovariance() {
  const dogs: Dog[] = [rex];
  const animals: Animal[] = dogs;
  animals.push(tom);
  return dogs[1]!.bark();
}

// 2. Method-syntax parameters stay bivariant even with strictFunctionTypes
//    (the flag covers only function-type syntax `(a: T) => void`).
interface Listener {
  handle(a: Animal): void;
}
function methodBivariance() {
  const l: Listener = { handle: (d: Dog) => d.bark() };
  l.handle(tom);
}

// 3. A type assertion is a promise to the compiler, not a check.
type User = { id: number; email: string };
function assertion() {
  const u = JSON.parse('{"id":"7"}') as User;
  return u.email.toLowerCase();
}

// 4. `any` from JSON.parse flows into a generic return type: no assertion in sight.
function parseAs<T>(s: string): T {
  return JSON.parse(s);
}
function hiddenAny() {
  const cfg = parseAs<{ retries: number }>('{"retries":"3"}');
  return cfg.retries.toFixed(0);
}

// 5. Index access: without noUncheckedIndexedAccess `xs[i]` is typed as present.
function indexAccess() {
  const byId: Record<string, User> = {};
  return byId["42"].email;
}

// 6. Narrowing is not invalidated by a function call that mutates the object.
type Session = { token: string | null };
function narrowingAcrossCall() {
  const s: Session = { token: "abc" };
  const logout = () => {
    s.token = null;
  };
  if (s.token !== null) {
    logout();
    return s.token.length; // still narrowed to string
  }
  return 0;
}

// 7. Non-null assertion `!` silences strictNullChecks for one expression.
function nonNull() {
  const m = new Map<string, User>();
  return m.get("x")!.id.toFixed();
}

const holes = { arrayCovariance, methodBivariance, assertion, hiddenAny, indexAccess, narrowingAcrossCall, nonNull };
for (const [name, fn] of Object.entries(holes)) {
  try {
    const v = fn();
    console.log(`${name.padEnd(20)} no throw, returned ${JSON.stringify(v)}`);
  } catch (e) {
    console.log(`${name.padEnd(20)} ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`);
  }
}
