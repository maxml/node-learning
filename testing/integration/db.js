'use strict';
// Shared setup for the integration experiments: a real PostgreSQL 18.6 in Docker.
//   docker run -d --name kb-testing-pg --label kb.example=testing -e POSTGRES_PASSWORD=test \
//     -p 127.0.0.1:55444:5432 postgres:18.6-alpine
const { Pool } = require('pg');

const PG_URL = process.env.PG_URL ?? 'postgres://postgres:test@127.0.0.1:55444/postgres';

const SCHEMA = `
  DROP TABLE IF EXISTS transfers, accounts;
  CREATE TABLE accounts (
    id      serial PRIMARY KEY,
    owner   text    NOT NULL,
    balance numeric NOT NULL CHECK (balance >= 0)
  );
  CREATE TABLE transfers (
    id      serial PRIMARY KEY,
    -- DEFERRABLE INITIALLY DEFERRED: checked at COMMIT, not at INSERT
    from_id int NOT NULL REFERENCES accounts(id) DEFERRABLE INITIALLY DEFERRED,
    to_id   int NOT NULL REFERENCES accounts(id) DEFERRABLE INITIALLY DEFERRED,
    amount  numeric NOT NULL
  );`;

async function createPool() {
  const pool = new Pool({ connectionString: PG_URL, max: 5 });
  await pool.query(SCHEMA);
  return pool;
}

// Code under test, variant 1: runs its own transaction on the connection it is given.
async function transferOnClient(client, fromId, toId, amount) {
  await client.query('BEGIN');
  try {
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
    await client.query('INSERT INTO transfers (from_id, to_id, amount) VALUES ($1, $2, $3)', [fromId, toId, amount]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

// Code under test, variant 2: takes its own connection from the pool (the usual shape).
async function transferViaPool(pool, fromId, toId, amount) {
  const client = await pool.connect();
  try {
    const r = await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    if (r.rowCount !== 1) throw new Error(`account ${fromId} not found`);
    return r.rowCount;
  } finally {
    client.release();
  }
}

module.exports = { createPool, transferOnClient, transferViaPool, PG_URL };
