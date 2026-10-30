'use strict';
// Test Data Builder (Nat Pryce; Freeman & Pryce, GOOS ch. 22): valid defaults,
// the test overrides only what matters to it, so the test text shows its intent.
let seq = 0;

class AccountBuilder {
  constructor() { seq += 1; this.data = { owner: `owner-${seq}`, balance: 100 }; }
  withOwner(owner) { this.data.owner = owner; return this; }
  withBalance(balance) { this.data.balance = balance; return this; }
  empty() { return this.withBalance(0); }
  build() { return { ...this.data }; }
  async insert(db) {
    const { rows } = await db.query(
      'INSERT INTO accounts (owner, balance) VALUES ($1, $2) RETURNING id, owner, balance::float AS balance',
      [this.data.owner, this.data.balance],
    );
    return rows[0];
  }
}

const anAccount = () => new AccountBuilder();
module.exports = { anAccount };
