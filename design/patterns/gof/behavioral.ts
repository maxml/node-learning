// Behavioral patterns in a Node/TS backend. Run: `node gof/behavioral.ts`.
import { EventEmitter } from "node:events";

// --- Strategy: a map of functions instead of a class hierarchy -----------
type Order = { total: number; country: string };
const shippingStrategies: Record<string, (o: Order) => number> = {
  standard: (o) => (o.total >= 100 ? 0 : 7),
  express: () => 15,
  pickup: () => 0,
};
function shippingCost(order: Order, method: string) {
  const strategy = shippingStrategies[method];
  if (!strategy) throw new Error(`unknown shipping method: ${method}`);
  return strategy(order);
}

// --- Observer = EventEmitter: synchronous, in registration order ---------
async function observer() {
  const bus = new EventEmitter();
  const seen: string[] = [];
  bus.on("order.paid", () => seen.push("first"));
  bus.on("order.paid", () => seen.push("second"));
  bus.prependListener("order.paid", () => seen.push("prepended"));
  seen.push("before emit");
  bus.emit("order.paid", { id: 1 });
  seen.push("after emit");
  console.log("observer order:", seen.join(" -> "));

  // A throwing listener stops the remaining listeners and throws into emit()'s caller.
  const bus2 = new EventEmitter();
  const ran: string[] = [];
  bus2.on("x", () => { ran.push("a"); throw new Error("listener a failed"); });
  bus2.on("x", () => ran.push("b"));
  try { bus2.emit("x"); } catch (e) { console.log("observer throw:", (e as Error).message, "| ran:", ran); }

  // 'error' without a listener throws.
  try { new EventEmitter().emit("error", new Error("boom")); }
  catch (e) { console.log("observer 'error' w/o listener:", (e as Error).message); }

  // An async listener's rejection is not seen by emit(); with captureRejections it becomes 'error'.
  const bus3 = new EventEmitter({ captureRejections: true });
  const routed = new Promise<string>((resolve) => bus3.on("error", (e: Error) => resolve(e.message)));
  bus3.on("y", async () => { throw new Error("async listener failed"); });
  const returned = bus3.emit("y");
  console.log("observer async: emit() returned", returned, "| captured as 'error':", await routed);

  // Leak warning threshold.
  console.log("observer defaultMaxListeners:", EventEmitter.defaultMaxListeners);
}

// --- Command: an operation as data (queueable, retryable, undoable) -------
type Command = { name: string; execute(): void; undo(): void };
function makeRenameCommand(doc: { title: string }, next: string): Command {
  let prev: string | undefined;
  return {
    name: "rename",
    execute: () => { prev = doc.title; doc.title = next; }, // snapshot for undo taken at execute time
    undo: () => { if (prev !== undefined) doc.title = prev; },
  };
}
// Bug: snapshot taken when the command is created, not when it runs.
function makeRenameCommandBuggy(doc: { title: string }, next: string): Command {
  const prev = doc.title;
  return { name: "rename", execute: () => { doc.title = next; }, undo: () => { doc.title = prev; } };
}

// --- Template Method vs passing the varying step as a function ---------
abstract class Importer {
  run(raw: string) { return this.validate(this.parse(raw)).map((r) => r.toUpperCase()); }
  protected abstract parse(raw: string): string[];
  protected validate(rows: string[]) { return rows.filter(Boolean); } // hook with a default
}
class CsvImporter extends Importer { protected parse(raw: string) { return raw.split(","); } }
const runImport = (parse: (raw: string) => string[], raw: string) =>
  parse(raw).filter(Boolean).map((r) => r.toUpperCase());

// --- Chain of Responsibility = middleware --------------------------------
type Ctx = { path: string; user?: string; status?: number; trace: string[] };
type Middleware = (ctx: Ctx, next: () => Promise<void>) => Promise<void>;
function compose(stack: Middleware[]) {
  return (ctx: Ctx) => {
    const dispatch = (i: number): Promise<void> =>
      i < stack.length ? stack[i](ctx, () => dispatch(i + 1)) : Promise.resolve();
    return dispatch(0);
  };
}
const timing: Middleware = async (ctx, next) => { ctx.trace.push("timing>"); await next(); ctx.trace.push("<timing"); };
const auth: Middleware = async (ctx, next) => {
  if (!ctx.user) { ctx.status = 401; ctx.trace.push("auth stops"); return; } // handler ends the chain
  await next();
};
const handler: Middleware = async (ctx) => { ctx.status = 200; ctx.trace.push("handler"); };
// Bug: next() without await, the outer middleware finishes before the inner one.
const forgotAwait: Middleware = async (ctx, next) => { ctx.trace.push("log>"); next(); ctx.trace.push("<log"); };
const slowHandler: Middleware = async (ctx) => { await new Promise((r) => setTimeout(r, 5)); ctx.status = 200; ctx.trace.push("handler"); };

// --- Iterator = the iteration protocol -----------------------------------
function* paginate(total: number, pageSize: number) {
  for (let offset = 0; offset < total; offset += pageSize) {
    yield { offset, limit: Math.min(pageSize, total - offset) };
  }
}

// --- run ----------------------------------------------------------------
console.log("strategy:", shippingCost({ total: 120, country: "UA" }, "standard"), shippingCost({ total: 20, country: "UA" }, "standard"));
await observer();

const doc = { title: "Draft" };
const history: Command[] = [];
for (const cmd of [makeRenameCommand(doc, "v1"), makeRenameCommand(doc, "v2")]) { cmd.execute(); history.push(cmd); }
const afterExecute = doc.title;
history.pop()!.undo();
console.log("command:", afterExecute, "-> undo ->", doc.title);
const doc2 = { title: "Draft" };
const queued = [makeRenameCommandBuggy(doc2, "v1"), makeRenameCommandBuggy(doc2, "v2")]; // built before running
for (const cmd of queued) cmd.execute();
queued[1].undo();
console.log("command (snapshot at creation, bug):", "v2 -> undo ->", doc2.title);

console.log("template method:", new CsvImporter().run("a,,b"), "| function:", runImport((r) => r.split(","), "a,,b"));

const app = compose([timing, auth, handler]);
const anon: Ctx = { path: "/me", trace: [] };
const authed: Ctx = { path: "/me", user: "u1", trace: [] };
await app(anon); await app(authed);
console.log("chain anon:", anon.status, anon.trace.join(" "));
console.log("chain authed:", authed.status, authed.trace.join(" "));
const buggy: Ctx = { path: "/", user: "u1", trace: [] };
await compose([forgotAwait, slowHandler])(buggy);
console.log("chain forgot await: status right after app() =", buggy.status, "| trace:", buggy.trace.join(" "));

console.log("iterator:", [...paginate(25, 10)]);
const it = paginate(1_000_000, 10);
console.log("iterator lazy (helpers):", it.filter((p) => p.offset % 20 === 0).map((p) => p.offset).take(3).toArray());
console.log("iterator helpers available:", typeof Iterator !== "undefined" && typeof Iterator.prototype.map === "function");
