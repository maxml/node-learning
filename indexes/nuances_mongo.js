// Тонкощі ESR у MongoDB: $in (SORT_MERGE і поріг 201), $ne, напрям сортування, покритий запит.
const c = db.orders;
const out = (label, r) => print(JSON.stringify({ case: label, ...r }));

onlyIndex(c, { status: 1, created_at: 1, amount: 1 });
out("$in 2 значення, ESR-індекс",
  measure(() => c.find({ status: { $in: ["paid", "shipped"] }, amount: { $gt: 900 } }).sort({ created_at: 1 }).limit(20)));
out("$ne 'paid', ESR-індекс",
  measure(() => c.find({ status: { $ne: "paid" }, amount: { $gt: 900 } }).sort({ created_at: 1 }).limit(20)));
out("покритий: projection created_at, amount",
  measure(() => c.find({ status: "paid", amount: { $gt: 900 } }, { _id: 0, created_at: 1, amount: 1 }).sort({ created_at: 1 }).limit(20)));

onlyIndex(c, { customer_id: 1, created_at: 1 });
for (const n of [200, 201]) {
  const ids = Array.from({ length: n }, (_, i) => i + 1);
  out(`$in ${n} значень customer_id, індекс {customer_id, created_at}`,
    measure(() => c.find({ customer_id: { $in: ids } }).sort({ created_at: 1 }).limit(20)));
}

onlyIndex(c, { status: 1, customer_id: 1, created_at: 1 });
out("напрям: sort {customer_id:1, created_at:-1} при {status, customer_id, created_at}",
  measure(() => c.find({ status: "paid" }).sort({ customer_id: 1, created_at: -1 }).limit(20)));
out("напрям: sort {customer_id:-1, created_at:-1} (зворотний обхід)",
  measure(() => c.find({ status: "paid" }).sort({ customer_id: -1, created_at: -1 }).limit(20)));
onlyIndex(c, { status: 1, customer_id: 1, created_at: -1 });
out("напрям: sort {customer_id:1, created_at:-1} при {status, customer_id, created_at:-1}",
  measure(() => c.find({ status: "paid" }).sort({ customer_id: 1, created_at: -1 }).limit(20)));
c.dropIndexes();
