// Structural patterns in a Node/TS backend. Run: `node gof/structural.ts`.
import { promisify } from "node:util";

// --- Adapter: your port, their SDK -------------------------------------
interface Mailer { send(to: string, subject: string): Promise<{ id: string }>; }

// A third-party SDK with a different, callback-style interface:
const legacySdk = {
  deliver(msg: { rcpt: string; title: string }, cb: (err: Error | null, res?: { messageId: string }) => void) {
    setImmediate(() => cb(null, { messageId: `m-${msg.rcpt}` }));
  },
};

class LegacySdkMailer implements Mailer {
  #deliver = promisify(legacySdk.deliver.bind(legacySdk)); // promisify itself is an adapter
  async send(to: string, subject: string) {
    const res = await this.#deliver({ rcpt: to, title: subject });
    return { id: res!.messageId };
  }
}

// --- Decorator (GoF): same interface, added behaviour, composable --------
function withRetry(inner: Mailer, attempts: number): Mailer {
  return {
    async send(to, subject) {
      for (let i = 1; ; i++) {
        try { return await inner.send(to, subject); }
        catch (e) { if (i >= attempts) throw e; }
      }
    },
  };
}

function withLogging(inner: Mailer, log: (s: string) => void): Mailer {
  return {
    async send(to, subject) {
      const t0 = performance.now();
      try { return await inner.send(to, subject); }
      finally { log(`send ${to} ${(performance.now() - t0).toFixed(1)}ms`); }
    },
  };
}

let failuresLeft = 2;
const flaky: Mailer = {
  async send(to) {
    if (failuresLeft-- > 0) throw new Error("ECONNRESET");
    return { id: `ok-${to}` };
  },
};

// --- Facade: one call over several subsystems ----------------------------
class SignupFacade {
  #users: Map<string, { email: string }>;
  #mailer: Mailer;
  constructor(users: Map<string, { email: string }>, mailer: Mailer) { this.#users = users; this.#mailer = mailer; }
  async signUp(email: string) {
    const id = String(this.#users.size + 1);
    this.#users.set(id, { email });
    await this.#mailer.send(email, "Welcome");
    return id;
  }
}

// --- Proxy: GoF proxy vs JS Proxy and private fields ---------------------
class Account {
  #balance = 100;
  balance() { return this.#balance; }
}

const target = new Account();
const jsProxy = new Proxy(target, {
  get(t, prop, receiver) {
    if (prop === "balance") console.log("  proxy: access to balance()");
    return Reflect.get(t, prop, receiver);
  },
});

// GoF-style proxy: an explicit wrapper with the same interface works with #private.
const gofProxy = {
  balance() { console.log("  gof proxy: access to balance()"); return target.balance(); },
};

// --- Composite: uniform interface over leaves and groups -----------------
type Rule = { check(input: string): string[] };
const minLen = (n: number): Rule => ({ check: (s) => (s.length >= n ? [] : [`min ${n}`]) });
const hasDigit: Rule = { check: (s) => (/\d/.test(s) ? [] : ["digit"]) };
const allOf = (...rules: Rule[]): Rule => ({ check: (s) => rules.flatMap((r) => r.check(s)) });

// --- run ----------------------------------------------------------------
console.log("adapter:", await new LegacySdkMailer().send("a@x.io", "hi"));

const logs: string[] = [];
const mailer = withLogging(withRetry(flaky, 3), (s) => logs.push(s));
console.log("decorator:", await mailer.send("b@x.io", "hi"), "log lines:", logs.length);

console.log("facade:", await new SignupFacade(new Map(), new LegacySdkMailer()).signUp("c@x.io"));

console.log("gof proxy:", gofProxy.balance());
try {
  console.log("js proxy:", jsProxy.balance());
} catch (e) {
  console.log("js proxy:", (e as Error).constructor.name, "-", (e as Error).message);
}

const passwordPolicy = allOf(minLen(12), allOf(hasDigit));
console.log("composite:", passwordPolicy.check("short"), passwordPolicy.check("long-enough-pass-1"));
