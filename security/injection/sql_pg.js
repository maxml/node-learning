// SQL injection demo (PostgreSQL + node-postgres): vulnerable concatenation vs
// parameterized query. Teaching example for the KB note Security/Ін'єкції.md.
const { Client } = require("pg");

const URL = process.env.PG_URL || "postgres://postgres:pw@127.0.0.1:55450/postgres";

async function setup(c) {
  await c.query("DROP TABLE IF EXISTS users");
  await c.query("CREATE TABLE users (id serial primary key, email text, is_admin boolean, secret text)");
  await c.query(
    "INSERT INTO users (email, is_admin, secret) VALUES ($1,$2,$3),($4,$5,$6)",
    ["alice@x", false, "s-alice", "admin@x", true, "s-admin"]
  );
}

// The app intends: look up exactly one user by the email they typed.
function vulnerable(email) {
  return `SELECT id,email,is_admin FROM users WHERE email = '${email}'`;
}

async function main() {
  const c = new Client({ connectionString: URL });
  await c.connect();
  await setup(c);
  const out = {};

  // 1. Classic: a crafted value turns a single-row lookup into "all rows".
  const payload = "' OR 1=1 --";
  const r1 = await c.query(vulnerable(payload));
  out.classic_rows_returned = r1.rowCount; // expect 2 (whole table leaked)

  // Parameterized: the same value is data, matches nothing.
  const r2 = await c.query("SELECT id,email,is_admin FROM users WHERE email = $1", [payload]);
  out.param_rows_returned = r2.rowCount; // expect 0

  // 2. Time-based blind: concatenation lets the value run pg_sleep.
  const t0 = Date.now();
  await c.query(vulnerable("x' OR (SELECT pg_sleep(2)) IS NOT NULL --"));
  out.timebased_ms_concat = Date.now() - t0; // ~2000+

  const t1 = Date.now();
  await c.query("SELECT id FROM users WHERE email = $1", ["x' OR (SELECT pg_sleep(2)) IS NOT NULL --"]);
  out.timebased_ms_param = Date.now() - t1; // ~0, treated as literal

  // 3. ORDER BY injection: the sort direction/column is NOT a bindable parameter.
  // Attacker flips order by injecting into the ORDER BY clause.
  const dir = "email DESC"; // imagine this came from ?sort=
  const r3 = await c.query(`SELECT email FROM users ORDER BY ${dir}`);
  out.orderby_first_when_injected = r3.rows[0].email; // alice@x (DESC applied by injected clause)

  // Fix for identifiers/direction: allowlist, never interpolate raw input.
  const ALLOWED = { email_asc: "email ASC", email_desc: "email DESC" };
  const safeDir = ALLOWED["email_asc"] || "id ASC";
  const r4 = await c.query(`SELECT email FROM users ORDER BY ${safeDir}`);
  out.orderby_allowlisted = r4.rows[0].email; // admin@x (ASC from allowlist)

  // 4. LIKE wildcard: user input containing % / _ silently widens the match
  // even when parameterized. Parameterization stops injection, not wildcards.
  const r5 = await c.query("SELECT count(*)::int n FROM users WHERE email LIKE $1", ["%"]);
  out.like_raw_percent_matches = r5.rows[0].n; // 2: every row
  const escaped = "%".replace(/([%_\\])/g, "\\$1");
  const r6 = await c.query("SELECT count(*)::int n FROM users WHERE email LIKE $1 ESCAPE '\\'", [escaped]);
  out.like_escaped_percent_matches = r6.rows[0].n; // 0: literal percent

  console.log(JSON.stringify(out, null, 2));
  await c.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
