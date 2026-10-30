'use strict';
// Strategy "wrap every test in a transaction and roll it back". Fast, but it changes
// what is being tested. Each test below documents one way it lies.
const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { createPool, transferOnClient, transferViaPool } = require('./db');
const { anAccount } = require('./builders');

let pool; let client; const notices = [];

before(async () => { pool = await createPool(); });
after(() => pool.end());

beforeEach(async () => {
  client = await pool.connect();
  client.on('notice', (n) => notices.push(n.message));
  await client.query('BEGIN');
});
afterEach(async () => {
  await client.query('ROLLBACK');
  client.removeAllListeners('notice');
  client.release();
});

test('1. code that takes its own pooled connection cannot see the fixture', async (t) => {
  const acc = await anAccount().withBalance(50).insert(client); // uncommitted, visible only to `client`
  await assert.rejects(transferViaPool(pool, acc.id, acc.id, 10), /not found/);
  t.diagnostic(`fixture id=${acc.id} visible to test connection only; READ COMMITTED hides it from the pool`);
});

test('2. code that COMMITs itself commits the test transaction: rollback does nothing', async (t) => {
  const a = await anAccount().withOwner('leak-a').insert(client);
  const b = await anAccount().withOwner('leak-b').insert(client);
  notices.length = 0;
  await transferOnClient(client, a.id, b.id, 10);
  t.diagnostic(`server notices: ${JSON.stringify(notices)}`);
  assert.ok(notices.some((m) => /already a transaction in progress/.test(m)));
});

test('2b. ...and the rows of test 2 survived the ROLLBACK', async (t) => {
  // Separate connection, separate transaction: sees only committed data.
  const { rows } = await pool.query("SELECT count(*)::int AS n FROM accounts WHERE owner LIKE 'leak-%'");
  t.diagnostic(`rows left behind by test 2: ${rows[0].n}`);
  assert.equal(rows[0].n, 2);
});

test('3. a DEFERRED foreign key is never checked, because COMMIT never happens', async (t) => {
  const a = await anAccount().insert(client);
  // to_id 999999 does not exist. With INITIALLY DEFERRED the check runs at COMMIT.
  await client.query('INSERT INTO transfers (from_id, to_id, amount) VALUES ($1, 999999, 1)', [a.id]);
  t.diagnostic('insert with a dangling FK accepted inside the test transaction');
  // The same statement in a real, committed transaction:
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const real = await anAccount().insert(c);
    await c.query('INSERT INTO transfers (from_id, to_id, amount) VALUES ($1, 999999, 1)', [real.id]);
    await assert.rejects(c.query('COMMIT'), (err) => {
      t.diagnostic(`on COMMIT: ${err.code} ${err.message}`);
      return err.code === '23503';
    });
  } finally { c.release(); }
});
