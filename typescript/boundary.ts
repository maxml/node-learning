// A schema-validated boundary: the type is inferred FROM the runtime schema,
// so the check and the type cannot drift apart. One parse function accepts any
// Standard Schema (Zod, Valibot, ...). Run: npm run boundary
import { z } from "zod";
import * as v from "valibot";
import type { StandardSchemaV1 } from "@standard-schema/spec";

// --- Zod: schema is the source of truth, type is derived from it -------------
const UserId = z.uuid().brand<"UserId">();
type UserId = z.infer<typeof UserId>;

const User = z.object({
  id: UserId,
  email: z.email(),
  age: z.number().int().min(0),
});
type User = z.infer<typeof User>; // { id: string & BRAND<"UserId">; email: string; age: number }

const StrictUser = z.strictObject(User.shape);

// --- Valibot: a different library, same Standard Schema interface ------------
const VUser = v.object({
  id: v.pipe(v.string(), v.uuid()),
  email: v.pipe(v.string(), v.email()),
  age: v.pipe(v.number(), v.integer(), v.minValue(0)),
});

// --- One boundary function for every Standard Schema library -----------------
function parseAt<S extends StandardSchemaV1>(schema: S, input: unknown): StandardSchemaV1.InferOutput<S> {
  const r = schema["~standard"].validate(input);
  if (r instanceof Promise) throw new TypeError("async schema used at a sync boundary");
  if (r.issues) {
    const where = r.issues.map((i) => `${(i.path ?? []).map((p) => (typeof p === "object" ? String(p.key) : String(p))).join(".") || "(root)"}: ${i.message}`);
    throw new TypeError(`${schema["~standard"].vendor}: ${where.join("; ")}`);
  }
  return r.value;
}

// --- Branded IDs: a plain string is not a UserId without passing the schema --
function loadUser(id: UserId): string {
  return `load ${id}`;
}
// @ts-expect-error a raw string is not a UserId (if this ever compiles, tsc fails with TS2578)
loadUser("not-checked");

const ok = { id: "3f1c2a9e-8b4d-4c1e-9f3a-2b7c6d5e4f10", email: "a@b.co", age: 30 };
const bodies: Record<string, unknown> = {
  valid: ok,
  "age as string": { ...ok, age: "30" },
  "bad uuid": { ...ok, id: "42" },
  "extra field": { ...ok, isAdmin: true },
};

for (const [label, body] of Object.entries(bodies)) {
  const asserted = body as User; // what a cast "guarantees"
  const row = [`${label.padEnd(14)} as-cast typeof age=${typeof asserted.age}`];
  for (const [name, schema] of [["zod", User], ["zod strict", StrictUser], ["valibot", VUser]] as const) {
    try {
      const out = parseAt(schema, body);
      row.push(`${name}: OK keys=${Object.keys(out).join(",")}`);
    } catch (e) {
      row.push(`${name}: REJECT (${(e as Error).message.split(": ").slice(1).join(": ")})`);
    }
  }
  console.log(row.join("\n    "));
}

const id = parseAt(UserId, ok.id); // typed UserId only after the runtime check
console.log(loadUser(id));
