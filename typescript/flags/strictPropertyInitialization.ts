// Bug class: a field declared as non-optional but never assigned in the
// constructor is `undefined` at runtime ("Cannot read properties of undefined").
export class Repo {
  private conn: { query(sql: string): unknown };
  find() {
    return this.conn.query("select 1");
  }
}
