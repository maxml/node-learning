// Approximation pattern: з імовірністю 1/K записати +K замість +1 на кожну подію.
// Скільки записів зекономлено і яка похибка лічильника залежно від кількості подій.
// Запуск: mongosh --quiet /work/approximation.js (див. README.md)
const d = db.getSiblingDB("approx");
d.dropDatabase();
const K = 10, TRIALS = 200;

// 1. Реальні записи в базу: n подій переглядів, лічильник у документі книги
function simulate(n, coll) {
  coll.insertOne({ _id: 1, views: 0 });
  let writes = 0;
  for (let i = 0; i < n; i++) {
    if (Math.floor(Math.random() * K) === 0) {     // ~1 з K подій
      coll.updateOne({ _id: 1 }, { $inc: { views: K } });
      writes++;
    }
  }
  const v = coll.findOne({ _id: 1 }).views;
  coll.drop();
  return { writes, v };
}
const r = simulate(100000, d.books);
print(`DB: 100000 подій -> ${r.writes} записів замість 100000, лічильник ${r.v} (похибка ${((r.v - 100000) / 1000).toFixed(2)}%)`);

// 2. Розподіл похибки (без бази, та сама логіка): p95 відносної похибки
function relErrP95(n) {
  const errs = [];
  for (let t = 0; t < TRIALS; t++) {
    let v = 0;
    for (let i = 0; i < n; i++) if (Math.floor(Math.random() * K) === 0) v += K;
    errs.push(Math.abs(v - n) / n);
  }
  errs.sort((a, b) => a - b);
  return (errs[Math.floor(TRIALS * 0.95)] * 100).toFixed(1);
}
for (const n of [20, 100, 1000, 10000, 100000]) {
  print(`n=${n}: p95 відносної похибки ${relErrP95(n)}% (теорія σ/n = ${(100 * Math.sqrt(n * (K - 1)) / n).toFixed(1)}%)`);
}
