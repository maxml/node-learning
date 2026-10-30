// Compiles with 0 errors under `strict: true` (it is in tsconfig.json `files`),
// yet every function hides a runtime-risk that only type-aware lint reports.
// Run: npm run lint
type User = { id: number; email: string };
type Event = { type: "created" } | { type: "deleted" } | { type: "renamed" };

export function fromBody(raw: string): number {
  const body = JSON.parse(raw); // any
  const id: number = body.id; // any spreads silently
  return id;
}

export function fromCast(raw: string): User {
  return JSON.parse(raw) as User; // assertion instead of validation
}

async function save(u: User): Promise<void> {
  await Promise.resolve(u);
}
export function handler(users: User[]): void {
  users.forEach(async (u) => {
    await save(u); // forEach does not await: errors become unhandled rejections
  });
  save(users[0]!); // floating promise, plus a non-null assertion
}

export function label(e: Event): string {
  switch (e.type) {
    case "created":
      return "new";
    case "deleted":
      return "gone";
  } // "renamed" silently falls through to the generic fallback below
  return "";
}

export function greet(name: string | undefined, count: number): string {
  if (name) return `hi ${name}`; // "" and undefined are lumped together
  return `count ${count}` + (count && "!");
}

export function parseCatch(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch (e: any) {
    return e.message;
  }
}
