// NoSQL operator injection demo (MongoDB + native driver and Mongoose).
// A login handler that drops a parsed JSON body straight into a query filter
// lets an attacker send an operator object instead of a string.
// Teaching example for Security/Ін'єкції.md.
const { MongoClient } = require("mongodb");
const mongoose = require("mongoose");

const URI = process.env.MONGO_URL || "mongodb://127.0.0.1:55451";

// What a login route receives after JSON.parse. A normal client sends strings;
// a hostile client sends { "$ne": null } for the password field.
const honestBody = { email: "admin@x", password: "hunter2" };
const hostileBody = { email: "admin@x", password: { $ne: null } };

async function main() {
  const out = {};
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db("injdemo");
  const col = db.collection("users");
  await col.deleteMany({});
  await col.insertOne({ email: "admin@x", password: "hunter2", role: "admin" });

  // Vulnerable: body fields used directly as the filter.
  const vulnerable = (body) => col.findOne({ email: body.email, password: body.password });

  out.honest_login = !!(await vulnerable(honestBody));            // true: real password
  out.wrong_password = !!(await vulnerable({ email: "admin@x", password: "nope" })); // false
  out.operator_bypass = !!(await vulnerable(hostileBody));        // TRUE: { $ne: null } matches

  // Fix 1: reject non-string credentials before querying.
  const typeChecked = (body) =>
    typeof body.password === "string" && typeof body.email === "string"
      ? col.findOne({ email: body.email, password: body.password })
      : null;
  out.typecheck_blocks_bypass = !!(await typeChecked(hostileBody)); // false

  await client.close();

  await mongoose.connect(URI, { dbName: "injdemo" });

  // A typed String schema path does NOT block this: `$ne` is a legitimate query
  // operator and its operand `null` casts fine, so the query runs and matches.
  // Schema typing stops only a non-operator object value, not operator injection.
  const Typed = mongoose.model("Typed", new mongoose.Schema({ email: String, password: String }), "users");
  try {
    out.mongoose_typed_still_bypassed =
      !!(await Typed.findOne({ email: hostileBody.email, password: hostileBody.password })); // true
  } catch (e) {
    out.mongoose_typed_still_bypassed = e.name;
  }

  // sanitizeFilter wraps a user-supplied operator object in $eq, so it is matched
  // as a literal value, not run as an operator. On a String path that literal is
  // an object, so the query is refused with a CastError — either way, no bypass.
  try {
    out.mongoose_blocked_with_sanitize =
      !!(await Typed.findOne({ email: hostileBody.email, password: hostileBody.password }).setOptions({ sanitizeFilter: true }));
  } catch (e) {
    out.mongoose_blocked_with_sanitize = e.name; // CastError: operator object matched as literal on a String path
  }
  await mongoose.disconnect();

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
