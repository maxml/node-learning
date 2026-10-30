// Що утримує замикання в пам'яті V8. Запуск: node --expose-gc 05-closure-retention.js
// Метод: WeakRef на великий об'єкт + примусовий gc(). Якщо deref() не undefined,
// об'єкт досі досяжний із чогось живого (тут: з контексту замикання).
if (typeof gc !== 'function') { console.error('run with --expose-gc'); process.exit(1); }
const log = (label, v) => console.log(label.padEnd(60), v);

async function collect() {
  // WeakRef-ціль не збирається до кінця поточного job (спец: KeepDuringJob),
  // тому чекаємо макрозадачу перед і після gc().
  await new Promise((r) => setImmediate(r));
  gc();
  await new Promise((r) => setImmediate(r));
  gc();
}

// A. Замикання не згадує big, і жодна інша функція в області теж: big не потрапляє в контекст
function noReference() {
  const big = new Array(1e6).fill(0);
  const ref = new WeakRef(big);
  const keep = () => 1;
  return { keep, ref };
}

// B. Замикання keep не згадує big, але сусіднє замикання useBig згадує.
//    В V8 обидва замикання ділять один контекст області, тож keep утримує big.
function siblingReference() {
  const big = new Array(1e6).fill(0);
  const ref = new WeakRef(big);
  const useBig = () => big.length; // ніде не зберігається і не викликається
  void useBig;
  const keep = () => 1;
  return { keep, ref };
}

// C. Те саме, що B, але великий об'єкт явно відпущено
function siblingReleased() {
  let big = new Array(1e6).fill(0);
  const ref = new WeakRef(big);
  const useBig = () => big && big.length;
  void useBig;
  big = null;
  const keep = () => 1;
  return { keep, ref };
}

// D. Замикання справді використовує big: утримує, поки живе
function directReference() {
  const big = new Array(1e6).fill(0);
  const ref = new WeakRef(big);
  const keep = () => big.length;
  return { keep, ref };
}

(async () => {
  const a = noReference();
  const b = siblingReference();
  const c = siblingReleased();
  const d = directReference();
  await collect();
  log('A: no closure mentions big -> big collected?', a.ref.deref() === undefined);
  log('B: only a sibling closure mentions big -> big collected?', b.ref.deref() === undefined);
  log('C: sibling mentions big, big=null -> big collected?', c.ref.deref() === undefined);
  log('D: keep itself uses big -> big collected?', d.ref.deref() === undefined);
  // Тримаємо keep-функції живими до кінця вимірювання
  void [a.keep, b.keep, c.keep, d.keep];
  // Після того як keep з B стає недосяжним, big збирається
  b.keep = null;
  await collect();
  log('B after dropping keep -> big collected?', b.ref.deref() === undefined);
  log('node / v8', `${process.version} / ${process.versions.v8}`);
})();
