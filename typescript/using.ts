// Explicit resource management: `using` / `await using` нативно в Node 24 (V8 13.6).
// `node using.ts`: Node лише стирає типи, синтаксис `using` виконує сам V8.
import { mkdtempDisposable } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const log: string[] = [];

class Lock implements Disposable {
  static held = new Set<string>();
  readonly key: string;
  private readonly failOnRelease: boolean;
  constructor(key: string, failOnRelease = false) {
    this.key = key;
    this.failOnRelease = failOnRelease;
    if (Lock.held.has(key)) throw new Error(`already locked: ${key}`);
    Lock.held.add(key);
    log.push(`acquire ${key}`);
  }
  [Symbol.dispose]() {
    Lock.held.delete(this.key);
    log.push(`release ${this.key}`);
    if (this.failOnRelease) throw new Error(`release failed: ${this.key}`);
  }
}

// 1. Порядок звільнення: LIFO, також при раньому виході через throw.
function transfer(fail: boolean) {
  using a = new Lock("account:1");
  using b = new Lock("account:2");
  log.push(`work with ${a.key}, ${b.key}`);
  if (fail) throw new Error("insufficient funds");
}
try { transfer(true); } catch (e) { log.push(`caught: ${(e as Error).message}`); }
console.log("1.", log.join(" | "), "| held after:", Lock.held.size);

// 2. Помилка і в тілі, і в dispose: SuppressedError, обидві збережено.
log.length = 0;
try {
  using l = new Lock("job:7", true);
  throw new Error(`body failed for ${l.key}`);
} catch (e) {
  const s = e as SuppressedError;
  console.log("2.", s.name, "| error:", (s.error as Error).message, "| suppressed:", (s.suppressed as Error).message);
}

// 3. await using з вбудованим Node API: тимчасова тека видаляється на виході зі scope.
let dirPath = "";
{
  await using dir = await mkdtempDisposable(join(tmpdir(), "ts-using-"));
  dirPath = dir.path;
  console.log("3. inside scope exists:", existsSync(dirPath));
}
console.log("3. after scope exists: ", existsSync(dirPath));

// 4. DisposableStack: прибирання для API без Symbol.dispose і передача власності.
log.length = 0;
function openPool() {
  using stack = new DisposableStack();
  stack.defer(() => log.push("close conn A"));
  stack.defer(() => log.push("close conn B"));
  const owned = stack.move(); // успіх: власність переходить до викликача, тут нічого не закривається
  return { [Symbol.dispose]: () => owned.dispose() };
}
{
  using pool = openPool();
  log.push("use pool");
}
console.log("4.", log.join(" | "));

// 5. Забутий `using`: const замість using компілюється, ресурс не звільняється.
log.length = 0;
{
  const leaked = new Lock("leak:1");
  void leaked;
}
console.log("5. const instead of using, held:", [...Lock.held]);
