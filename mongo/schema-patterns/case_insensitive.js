// Регістронезалежний пошук: collation-індекс проти $regex /i.
// Запуск: mongosh --quiet /work/case_insensitive.js (див. README.md)
const N = 200000;
const d = db.getSiblingDB("ci");
d.dropDatabase();

// Імена: 20 000 різних, кожне в кількох варіантах регістру. "ann" трапляється як ann/Ann/ANN.
function variant(s, k) {
  if (k === 0) return s;
  if (k === 1) return s[0].toUpperCase() + s.slice(1);
  return s.toUpperCase();
}
const docs = [];
for (let i = 0; i < N; i++) {
  const base = "n" + (i % 20000);
  docs.push({ _id: i, name: variant(base, i % 3) });
}
docs.push({ _id: N + 1, name: "ann" }, { _id: N + 2, name: "Ann" }, { _id: N + 3, name: "ANN" },
          { _id: N + 4, name: "Anna" }, { _id: N + 5, name: "Ánn" });
for (let i = 0; i < docs.length; i += 10000) d.people.insertMany(docs.slice(i, i + 10000));

d.people.createIndex({ name: 1 }, { name: "name_bin" });
d.people.createIndex({ name: 1 }, { name: "name_ci2", collation: { locale: "en", strength: 2 } });
d.people.createIndex({ name: 1 }, { name: "name_ci1", collation: { locale: "en", strength: 1 } });

function plan(stats) {
  const stages = [];
  let s = stats.executionStages;
  while (s) {
    stages.push(s.stage + (s.indexName ? "(" + s.indexName + ")" : ""));
    s = s.inputStage;
  }
  return stages.join(" <- ");
}
function run(label, mk) {   // mk: функція, що щоразу будує новий курсор
  const e = mk().explain("executionStats");
  const st = e.executionStats;
  // кілька прогонів для часу, беремо медіану
  const times = [];
  for (let i = 0; i < 5; i++) {
    const t0 = Date.now();
    mk().toArray();
    times.push(Date.now() - t0);
  }
  times.sort((a, b) => a - b);
  print(`${label}\n   nReturned=${st.nReturned} keys=${st.totalKeysExamined} docs=${st.totalDocsExamined} median=${times[2]}ms plan=${plan(st)}`);
}

print(`server ${db.version()}, ${d.people.countDocuments()} documents\n`);
run("A. рівність без collation {name:'ann'}", () => d.people.find({ name: "ann" }));
run("B. $regex /^ann$/i без collation", () => d.people.find({ name: /^ann$/i }));
run("C. $regex /^ann$/i, hint на name_bin", () => d.people.find({ name: /^ann$/i }).hint("name_bin"));
run("D. рівність + collation {en, strength 2}", () => d.people.find({ name: "ann" }).collation({ locale: "en", strength: 2 }));
run("E. рівність + collation {en, strength 1}", () => d.people.find({ name: "ann" }).collation({ locale: "en", strength: 1 }));
run("F. рівність + collation {en} (strength 3 за замовчуванням)", () => d.people.find({ name: "ann" }).collation({ locale: "en" }));
run("G. $regex /^ann$/i + collation strength 2", () => d.people.find({ name: /^ann$/i }).collation({ locale: "en", strength: 2 }));
run("H. $regex /^ann/ (чутливий до регістру префікс)", () => d.people.find({ name: /^ann/ }));
run("I. $regex /^ann/i (префікс без регістру)", () => d.people.find({ name: /^ann/i }));
run("J. покривна проєкція {_id:0,name:1} + collation 2", () => d.people.find({ name: "ann" }, { _id: 0, name: 1 }).collation({ locale: "en", strength: 2 }));
run("K. покривна проєкція {_id:0,name:1} без collation", () => d.people.find({ name: "ann" }, { _id: 0, name: 1 }));

// Розмір індексів: collation-ключі (ICU sort keys) проти бінарних
const sz = d.people.stats().indexSizes;
print(`\nindexSizes: name_bin=${sz.name_bin} name_ci2=${sz.name_ci2} name_ci1=${sz.name_ci1}`);

// Унікальний регістронезалежний індекс (email)
d.users.createIndex({ email: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
d.users.insertOne({ email: "Ann@Example.com" });
try { d.users.insertOne({ email: "ann@example.com" }); print("\nunique ci: другий insert пройшов"); }
catch (e) { print(`\nunique ci: другий insert відхилено, code=${e.code}`); }

// Типовий collation колекції й чи можна його змінити
d.createCollection("names", { collation: { locale: "en", strength: 2 } });
d.names.createIndex({ first: 1 });
d.names.insertMany([{ first: "betsy" }, { first: "Betsy" }, { first: "BETSY" }]);
const ix = d.names.getIndexes().find(i => i.name === "first_1");
print(`default collation: індекс first_1 успадкував collation strength=${ix.collation && ix.collation.strength}`);
print(`default collation: find({first:'betsy'}) -> ${d.names.countDocuments({ first: "betsy" })}`);
print(`default collation: той самий запит з .collation({locale:'en'}) -> ${d.names.find({ first: "betsy" }).collation({ locale: "en" }).toArray().length}`);
try {
  const r =d.runCommand({ collMod: "names", collation: { locale: "en", strength: 3 } });
  print(`collMod collation: ok=${r.ok} ${r.errmsg || ""} code=${r.code || ""}`);
} catch (e) { print(`collMod collation: error code=${e.code} ${e.codeName}: ${e.message.slice(0, 120)}`); }
