// Детерміновані дані для експерименту з тюнінгом (mongosh, база shop).
// events: 1 000 000 подій; users: 50 000 користувачів (поле uid, не _id).
// mulberry32: 32-бітні операції через Math.imul. Наївний LCG на double (seed * 1103515245) втрачає
// точність понад 2^53 і дав лише 5 784 різних userId замість 50 000: перевіряй розподіл після seed.
let seed = 42;
function rnd() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const TYPES = [["view", 0.6], ["click", 0.25], ["cart", 0.08], ["buy", 0.05], ["refund", 0.02]];
function pick(table) { let r = rnd(), acc = 0; for (const [v, w] of table) { acc += w; if (r < acc) return v; } return table[table.length - 1][0]; }
// country і channel перекошені «навхрест»: для перевірки replanning
const COUNTRY = [["UA", 0.9], ["PL", 0.003], ["DE", 0.097]];
const CHANNEL = [["web", 0.9], ["sms", 0.003], ["app", 0.097]];

db.events.drop(); db.users.drop();
const T0 = new Date("2026-01-01T00:00:00Z").getTime();
const N = 1_000_000, B = 10_000;
for (let i = 0; i < N; i += B) {
  const batch = [];
  for (let j = i; j < i + B; j++) {
    batch.push({
      userId: Math.floor(rnd() * 50_000),
      type: pick(TYPES),
      country: pick(COUNTRY),
      channel: pick(CHANNEL),
      ts: new Date(T0 + Math.floor(rnd() * 300 * 86400_000)),
      amount: Math.round(rnd() * 100_000) / 100,
      payload: "x".repeat(200), // щоб документ важив як справжня подія (~300 Б)
    });
  }
  db.events.insertMany(batch, { ordered: false });
}
const users = [];
for (let u = 0; u < 50_000; u++) users.push({ uid: u, name: "user" + u, tier: ["free", "pro", "team"][u % 3] });
db.users.insertMany(users);
// «правдоподібний, але не той» індекс, з яким стартує колекція
db.events.createIndex({ type: 1 });
db.events.createIndex({ country: 1 });
db.events.createIndex({ channel: 1 });
print("seeded", db.events.countDocuments(), "events,", db.users.countDocuments(), "users");
print("distinct userId:", db.events.aggregate([{ $group: { _id: "$userId" } }, { $count: "n" }]).next().n);
print("by type:", JSON.stringify(db.events.aggregate([{ $sortByCount: "$type" }]).toArray()));
print("by country:", JSON.stringify(db.events.aggregate([{ $sortByCount: "$country" }]).toArray()));
print("by channel:", JSON.stringify(db.events.aggregate([{ $sortByCount: "$channel" }]).toArray()));
