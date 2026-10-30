// "Application code" under test.

// Check-then-insert: the findOne makes a sequential duplicate look handled,
// but only the unique index makes concurrent registrations safe.
async function registerUser(db, email) {
  const users = db.collection("users");
  if (await users.findOne({ email })) return { ok: false, reason: "exists" };
  // widen the race window the way real I/O (hashing a password, a network hop) does
  await new Promise((r) => setTimeout(r, 5));
  try {
    await users.insertOne({ email, createdAt: new Date() });
    return { ok: true };
  } catch (e) {
    if (e.code === 11000) return { ok: false, reason: "exists" };
    throw e;
  }
}

// Index definitions live next to the code and are applied by deploy AND by test setup.
const INDEXES = {
  users: [{ key: { email: 1 }, name: "email_1", unique: true }],
  orders: [{ key: { tenantId: 1, status: 1, createdAt: -1 }, name: "tenant_status_createdAt" }],
};

async function createIndexes(db) {
  for (const [coll, specs] of Object.entries(INDEXES)) {
    await db.collection(coll).createIndexes(specs);
  }
}

async function openOrders(db, tenantId) {
  return db.collection("orders")
    .find({ tenantId, status: "open" })
    .sort({ createdAt: -1 })
    .limit(20);
}

module.exports = { registerUser, createIndexes, openOrders, INDEXES };
