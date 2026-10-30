// ESR у MongoDB: той самий запит під чотирма порядками полів складеного індексу.
// Кожен індекс існує сам (крім _id), план обирає планувальник, без hint.
// Запуск: docker exec idx-mongo mongosh --quiet shop /tmp/mongolib.js /tmp/esr_mongo.js  (див. run.sh)
const c = db.orders;
const ORDERS = {
  "E-S-R (status, created_at, amount)": { status: 1, created_at: 1, amount: 1 },
  "E-R-S (status, amount, created_at)": { status: 1, amount: 1, created_at: 1 },
  "S-E-R (created_at, status, amount)": { created_at: 1, status: 1, amount: 1 },
  "R-E-S (amount, status, created_at)": { amount: 1, status: 1, created_at: 1 },
};
const RANGES = { "range 10% (amount > 900)": 900, "range 0.1% (amount > 999)": 999, "range 0.01% (amount > 999.9)": 999.9 };
print("MongoDB " + db.version());
for (const [label, spec] of Object.entries(ORDERS)) {
  onlyIndex(c, spec);
  for (const [q, x] of Object.entries(RANGES)) {
    const r = measure(() => c.find({ status: "paid", amount: { $gt: x } }).sort({ created_at: 1 }).limit(20));
    print(JSON.stringify({ index: label, query: q, ...r }));
  }
}
c.dropIndexes();
