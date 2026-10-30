// Creational patterns as they look in a Node/TS backend.
// Runs directly with Node >= 22.18 / 24 type stripping: `node gof/creational.ts`.
// Only erasable TS syntax here (no enums, no parameter properties, no decorators).

// --- Factory: a function chooses the implementation from config ------------
interface BlobStore {
  put(key: string, body: string): Promise<void>;
  get(key: string): Promise<string | undefined>;
}

class MemoryStore implements BlobStore {
  #data = new Map<string, string>();
  async put(key: string, body: string) { this.#data.set(key, body); }
  async get(key: string) { return this.#data.get(key); }
}

class FakeS3Store implements BlobStore {
  #bucket: string;
  #data = new Map<string, string>();
  constructor(bucket: string) { this.#bucket = bucket; }
  async put(key: string, body: string) { this.#data.set(`${this.#bucket}/${key}`, body); }
  async get(key: string) { return this.#data.get(`${this.#bucket}/${key}`); }
}

type StoreConfig = { kind: "memory" } | { kind: "s3"; bucket: string };

function createBlobStore(cfg: StoreConfig): BlobStore {
  switch (cfg.kind) {
    case "memory": return new MemoryStore();
    case "s3": return new FakeS3Store(cfg.bucket);
  }
}

// --- Builder: only when construction has steps or invariants ------------
class QueryBuilder {
  #table = "";
  #where: string[] = [];
  #params: unknown[] = [];
  #limit?: number;
  from(table: string) { this.#table = table; return this; }
  where(column: string, value: unknown) {
    this.#params.push(value);
    this.#where.push(`${column} = $${this.#params.length}`);
    return this;
  }
  limit(n: number) { this.#limit = n; return this; }
  build(): { text: string; values: unknown[] } {
    if (!this.#table) throw new Error("from() is required");
    let text = `SELECT * FROM ${this.#table}`;
    if (this.#where.length) text += ` WHERE ${this.#where.join(" AND ")}`;
    if (this.#limit !== undefined) text += ` LIMIT ${this.#limit}`;
    return { text, values: this.#params };
  }
}

// Without invariants an options object is the idiomatic "builder" in TS:
type HttpClientOptions = { baseUrl: string; timeoutMs?: number; retries?: number };
function createHttpClient({ baseUrl, timeoutMs = 5_000, retries = 2 }: HttpClientOptions) {
  return { baseUrl, timeoutMs, retries };
}

// --- Prototype: dissolved into the language ------------------------------
const template = { retries: 3, tags: ["a"] };
const shallow = { ...template };          // nested array is shared
const deep = structuredClone(template);   // nested array is copied
shallow.tags.push("b");

// --- run ----------------------------------------------------------------
const store = createBlobStore({ kind: "s3", bucket: "invoices" });
await store.put("1.pdf", "pdf-bytes");
console.log("factory:", store.constructor.name, await store.get("1.pdf"));

console.log("builder:", new QueryBuilder().from("users").where("tenant_id", 7).where("active", true).limit(10).build());
try { new QueryBuilder().where("a", 1).build(); } catch (e) { console.log("builder invariant:", (e as Error).message); }
console.log("options object:", createHttpClient({ baseUrl: "https://api.example" }));

console.log("prototype: template.tags =", template.tags, "deep.tags =", deep.tags);
