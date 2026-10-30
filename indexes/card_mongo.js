// Кардинальність у MongoDB: індекс на полі з 5 значеннями, вибір плану без статистики
// (змагання кандидатів і plan cache), порядок {status, customer_id} проти {customer_id, status}.
const c = db.orders;
const out = (label, r) => print(JSON.stringify({ case: label, ...r }));

// 1. Індекс на status: планувальник не знає розподілу й бере індекс навіть для 60% документів
onlyIndex(c, { status: 1 });
out("status 'paid' (60%), індекс {status}, план за вибором", measure(() => c.find({ status: "paid" })));
out("status 'paid' (60%), hint COLLSCAN", measure(() => c.find({ status: "paid" }).hint({ $natural: 1 })));
out("status 'refunded' (2%), індекс {status}", measure(() => c.find({ status: "refunded" })));
out("status 'refunded' (2%), hint COLLSCAN", measure(() => c.find({ status: "refunded" }).hint({ $natural: 1 })));

// 2. Два кандидати: план обирає пробний прогін, переможця кешує форма запиту
c.dropIndexes();
c.createIndex({ status: 1, created_at: 1 }, { name: "status_created" });
c.createIndex({ customer_id: 1 }, { name: "customer" });
c.getPlanCache().clear();
const ex = c.find({ status: "paid", customer_id: 4242 }).sort({ created_at: 1 }).explain("allPlansExecution");
print(JSON.stringify({
  case: "кандидати для {status:'paid', customer_id:4242} sort created_at",
  winning: stages(ex.queryPlanner.winningPlan.queryPlan || ex.queryPlanner.winningPlan).join(" → "),
  rejected: ex.queryPlanner.rejectedPlans.length,
  trial: ex.executionStats.allPlansExecution.map((p) => ({
    plan: stages(p.executionStages).join(" → "), works: p.executionStages.works, keys: p.totalKeysExamined, n: p.nReturned,
  })),
}));
c.find({ status: "paid", customer_id: 4242 }).sort({ created_at: 1 }).toArray();
c.find({ status: "paid", customer_id: 4242 }).sort({ created_at: 1 }).toArray();
print(JSON.stringify({
  case: "plan cache після двох виконань",
  entries: c.getPlanCache().list().map((e) => ({ queryHash: e.queryHash, planCacheKey: e.planCacheKey, isActive: e.isActive, works: e.works })),
}));

// 3. Порядок двох рівностей і префікс для інших запитів
for (const [label, spec] of [["{status, customer_id}", { status: 1, customer_id: 1 }], ["{customer_id, status}", { customer_id: 1, status: 1 }]]) {
  onlyIndex(c, spec);
  out(`${label}: status 'paid' AND customer_id 4242`, measure(() => c.find({ status: "paid", customer_id: 4242 })));
  out(`${label}: лише customer_id 4242, план за вибором`, measure(() => c.find({ customer_id: 4242 })));
  out(`${label}: лише customer_id 4242, hint ix`, measure(() => c.find({ customer_id: 4242 }).hint("ix")));
  out(`${label}: лише status 'refunded', план за вибором`, measure(() => c.find({ status: "refunded" })));
  out(`${label}: лише status 'refunded', hint ix`, measure(() => c.find({ status: "refunded" }).hint("ix")));
}
c.dropIndexes();
// Чи хоч раз план обирав cost-based ranker (з 8.3 це запасний механізм після multi-planner)
const cbr = db.serverStatus().metrics.query.cbr;
print(JSON.stringify({ case: "serverStatus.metrics.query.cbr", count: cbr.count, choseWinningPlan: cbr.choseWinningPlan }));
