// MongoDB Search / Vector Search experiment for "Atlas Search і Vector Search.md".
// Runs inside the mongodb/mongodb-atlas-local container via mongosh (see run.sh).
// Prints one line per check: "CHECK <name>: <result>".

const dbx = db.getSiblingDB("kbsearch");
const coll = dbx.docs;
coll.drop();

const out = (name, value) => print(`CHECK ${name}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
const sleep = (ms) => { const t = Date.now(); while (Date.now() - t < ms) {} };

// 4-dim toy vectors: [db, search, cooking, travel]
const docs = [
  { _id: 1, title: "Database indexing basics", category: "db", year: 2021, vec: [0.9, 0.2, 0.0, 0.0] },
  { _id: 2, title: "Full text search with Lucene analyzers", category: "search", year: 2023, vec: [0.3, 0.9, 0.0, 0.0] },
  { _id: 3, title: "Vector search and embeddings", category: "search", year: 2025, vec: [0.2, 0.8, 0.0, 0.1] },
  { _id: 4, title: "Replication and failover in databases", category: "db", year: 2022, vec: [0.95, 0.05, 0.0, 0.0] },
  { _id: 5, title: "Pasta carbonara recipe", category: "food", year: 2020, vec: [0.0, 0.0, 1.0, 0.0] },
  { _id: 6, title: "Travel guide to Lviv", category: "travel", year: 2024, vec: [0.0, 0.0, 0.1, 0.95] },
  { _id: 7, title: "Searching a database by keywords", category: "db", year: 2024, vec: [0.6, 0.6, 0.0, 0.0] },
  { _id: 8, title: "Cooking for database engineers", category: "food", year: 2019, vec: [0.3, 0.0, 0.9, 0.0] },
];
coll.insertMany(docs);

coll.createSearchIndex({
  name: "default",
  definition: {
    mappings: {
      dynamic: false,
      fields: {
        title: { type: "string", analyzer: "lucene.english" },
        category: { type: "token" },
        year: { type: "number" },
      },
    },
  },
});
coll.createSearchIndex({
  name: "vec_idx",
  type: "vectorSearch",
  definition: {
    fields: [
      { type: "vector", path: "vec", numDimensions: 4, similarity: "cosine" },
      { type: "filter", path: "category" },
    ],
  },
});

// Wait for both indexes to become queryable.
const t0 = Date.now();
while (true) {
  const idx = coll.getSearchIndexes();
  const ready = idx.length === 2 && idx.every((i) => i.queryable === true);
  if (ready) break;
  if (Date.now() - t0 > 120000) { out("indexes_ready", "TIMEOUT " + JSON.stringify(idx)); quit(1); }
  sleep(200);
}
out("indexes_ready_ms", String(Date.now() - t0));
out("index_status", coll.getSearchIndexes().map((i) => `${i.name}:${i.type}:${i.status}`).join(","));

const ids = (cur) => cur.toArray().map((d) => d._id);

// 1. Analyzer: "indexes" (plural) matches "indexing" via English stemming? and "databases" vs "database".
out("text_databases_english", ids(coll.aggregate([
  { $search: { text: { query: "databases", path: "title" } } }, { $project: { _id: 1 } },
])));

// 2. Fuzzy: typo "databse" without/with fuzzy
out("text_typo_nofuzzy", ids(coll.aggregate([{ $search: { text: { query: "databse", path: "title" } } }])));
out("text_typo_fuzzy", ids(coll.aggregate([{ $search: { text: { query: "databse", path: "title", fuzzy: { maxEdits: 1 } } } }])));

// 3. compound: must "search", filter category=db (no score), should year>=2024 (boost)
const comp = coll.aggregate([
  { $search: { compound: {
      must: [{ text: { query: "search", path: "title" } }],
      should: [{ range: { path: "year", gte: 2024 } }],
    } } },
  { $project: { _id: 1, score: { $meta: "searchScore" } } },
]).toArray();
out("compound_must_should", comp.map((d) => `${d._id}:${d.score.toFixed(3)}`).join(" "));
const compF = coll.aggregate([
  { $search: { compound: {
      must: [{ text: { query: "search", path: "title" } }],
      filter: [{ equals: { path: "category", value: "db" } }],
    } } },
  { $project: { _id: 1, score: { $meta: "searchScore" } } },
]).toArray();
out("compound_must_filter_db", compF.map((d) => `${d._id}:${d.score.toFixed(3)}`).join(" "));

// 4. Sort inside $search by year desc (needs number mapping)
out("search_sort_year_desc", ids(coll.aggregate([
  { $search: { text: { query: "database", path: "title" }, sort: { year: -1 } } },
])));

// 5. Facets via $searchMeta on token field
const meta = coll.aggregate([
  { $searchMeta: { facet: {
      operator: { exists: { path: "title" } },
      facets: { cat: { type: "string", path: "category" } },
    } } },
]).toArray()[0];
out("facet_category", { count: meta.count, buckets: meta.facet.cat.buckets });

// 6. Silent empty results: wrong index name, unindexed field
out("wrong_index_name", ids(coll.aggregate([{ $search: { index: "no_such_index", text: { query: "database", path: "title" } } }])));
out("unindexed_path", ids(coll.aggregate([{ $search: { text: { query: "db", path: "nonexistent" } } }])));

// 7. Vector search: ANN vs ENN, filter
const q = [0.85, 0.3, 0.0, 0.0];
const vs = (stage) => coll.aggregate([
  { $vectorSearch: stage },
  { $project: { _id: 1, score: { $meta: "vectorSearchScore" } } },
]).toArray().map((d) => `${d._id}:${d.score.toFixed(4)}`).join(" ");
out("vector_ann", vs({ index: "vec_idx", path: "vec", queryVector: q, numCandidates: 100, limit: 3 }));
out("vector_enn", vs({ index: "vec_idx", path: "vec", queryVector: q, exact: true, limit: 3 }));
out("vector_ann_filter_food", vs({ index: "vec_idx", path: "vec", queryVector: q, numCandidates: 100, limit: 3, filter: { category: "food" } }));
try {
  out("vector_filter_unindexed", vs({ index: "vec_idx", path: "vec", queryVector: q, numCandidates: 100, limit: 3, filter: { year: { $gte: 2024 } } }));
} catch (e) { out("vector_filter_unindexed", "ERROR " + e.codeName + ": " + String(e.message).slice(0, 160)); }
try {
  out("vector_limit_gt_candidates", vs({ index: "vec_idx", path: "vec", queryVector: q, numCandidates: 2, limit: 3 }));
} catch (e) { out("vector_limit_gt_candidates", "ERROR " + e.codeName + ": " + String(e.message).slice(0, 160)); }

// 8. Hybrid: $rankFusion and $scoreFusion
try {
  const rf = coll.aggregate([
    { $rankFusion: {
        input: { pipelines: {
          text: [{ $search: { text: { query: "database search", path: "title" } } }, { $limit: 5 }],
          vec: [{ $vectorSearch: { index: "vec_idx", path: "vec", queryVector: [0.5, 0.7, 0.0, 0.0], numCandidates: 50, limit: 5 } }],
        } },
        combination: { weights: { text: 1, vec: 1 } },
    } },
    { $project: { _id: 1, s: { $meta: "score" } } },
  ]).toArray();
  out("rankFusion", rf.map((d) => `${d._id}:${d.s.toFixed(4)}`).join(" "));
} catch (e) { out("rankFusion", "ERROR " + e.codeName + ": " + String(e.message).slice(0, 200)); }
try {
  const sf = coll.aggregate([
    { $scoreFusion: {
        input: { pipelines: {
          text: [{ $search: { text: { query: "database search", path: "title" } } }, { $limit: 5 }],
          vec: [{ $vectorSearch: { index: "vec_idx", path: "vec", queryVector: [0.5, 0.7, 0.0, 0.0], numCandidates: 50, limit: 5 } }],
        }, normalization: "sigmoid" },
        combination: { method: "avg" },
    } },
    { $project: { _id: 1, s: { $meta: "score" } } },
  ]).toArray();
  out("scoreFusion", sf.map((d) => `${d._id}:${d.s.toFixed(4)}`).join(" "));
} catch (e) { out("scoreFusion", "ERROR " + e.codeName + ": " + String(e.message).slice(0, 200)); }

// 9. Eventual consistency: write, then immediately search. Repeat N times.
const N = 20;
const lags = [];
let immediateMiss = 0;
for (let i = 0; i < N; i++) {
  const term = `zephyrquux${i}`;
  coll.insertOne({ _id: 1000 + i, title: `Fresh note ${term}`, category: "db", year: 2026, vec: [0.5, 0.5, 0.0, 0.0] }, { writeConcern: { w: "majority" } });
  const tw = Date.now();
  const findHit = coll.countDocuments({ title: { $regex: term } });
  const first = coll.aggregate([{ $search: { text: { query: term, path: "title" } } }]).toArray().length;
  if (first === 0) immediateMiss++;
  if (i === 0) out("ec_first_try", `find=${findHit} search=${first}`);
  let seen = first > 0;
  while (!seen) {
    if (Date.now() - tw > 30000) break;
    sleep(10);
    seen = coll.aggregate([{ $search: { text: { query: term, path: "title" } } }]).toArray().length > 0;
  }
  lags.push(seen ? Date.now() - tw : -1);
}
lags.sort((a, b) => a - b);
out("ec_immediate_miss", `${immediateMiss}/${N}`);
out("ec_visible_after_ms", `min=${lags[0]} median=${lags[Math.floor(N / 2)]} max=${lags[N - 1]}`);

// 10. Same for vector index: update a vector, immediately query
coll.updateOne({ _id: 5 }, { $set: { vec: [1.0, 0.0, 0.0, 0.0] } });
const tv = Date.now();
const firstTop = coll.aggregate([{ $vectorSearch: { index: "vec_idx", path: "vec", queryVector: [1, 0, 0, 0], exact: true, limit: 1 } }]).toArray()[0]._id;
let top = firstTop;
while (top !== 5 && Date.now() - tv < 30000) {
  sleep(10);
  top = coll.aggregate([{ $vectorSearch: { index: "vec_idx", path: "vec", queryVector: [1, 0, 0, 0], exact: true, limit: 1 } }]).toArray()[0]._id;
}
out("ec_vector_update", `first_top=${firstTop} final_top=${top} after_ms=${Date.now() - tv}`);

// 11. Versions
out("server_version", db.version());
