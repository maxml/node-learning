// Спільні функції для mongosh-скриптів: стадії плану й медіана часу з explain("executionStats").
function stages(s, acc = []) {
  acc.push(s.stage + (s.indexName ? `[${s.indexName}]` : ""));
  if (s.inputStage) stages(s.inputStage, acc);
  (s.inputStages || []).forEach((c) => stages(c, acc));
  return acc;
}
function measure(cursorFn, runs = 5) {
  cursorFn().toArray(); // прогрів
  const ex = [];
  for (let i = 0; i < runs; i++) ex.push(cursorFn().explain("executionStats"));
  const t = ex.map((e) => e.executionStats.executionTimeMillis).sort((a, b) => a - b);
  const e = ex[ex.length - 1], st = e.executionStats;
  const plan = stages(st.executionStages);
  const shown = []; // сусідні однакові стадії згортаються: IXSCAN[ix] ×200
  for (const p of plan) {
    const last = shown[shown.length - 1];
    if (last && last.s === p) last.n++; else shown.push({ s: p, n: 1 });
  }
  return {
    plan: shown.map((x) => x.s + (x.n > 1 ? ` ×${x.n}` : "")).join(" → "),
    sort: plan.some((p) => p === "SORT"),
    nReturned: st.nReturned,
    keys: st.totalKeysExamined,
    docs: st.totalDocsExamined,
    ms: t[Math.floor(t.length / 2)],
  };
}
function onlyIndex(coll, spec, name = "ix") {
  coll.dropIndexes(); // лишає тільки _id
  coll.createIndex(spec, { name });
}
