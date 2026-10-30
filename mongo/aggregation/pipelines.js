// Конвеєри як чисті функції: параметри на вході, масив стадій на виході.
// Їх імпортують і експеримент (agg.js), і тести (pipelines.test.js).
'use strict';

// Позиції замовлення дорожчі за minPrice і сума по них, без $unwind/$group.
// Порожній відфільтрований масив лишається в документі (items: []).
function expensiveItemsExpr(minPrice) {
  return [
    { $set: { items: { $filter: { input: '$items', cond: { $gt: ['$$this.price', minPrice] } } } } },
    { $set: { total: { $sum: { $map: { input: '$items', in: { $multiply: ['$$this.price', '$$this.qty'] } } } } } },
  ];
}

// Та сама задача через розгортання й повторне групування (антипатерн).
// Замовлення без жодної дорогої позиції зникає, інші поля документа губляться.
function expensiveItemsUnwind(minPrice) {
  return [
    { $unwind: '$items' },
    { $match: { 'items.price': { $gt: minPrice } } },
    { $group: {
      _id: '$_id',
      items: { $push: '$items' },
      total: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
    } },
  ];
}

// Повний перерахунок денних підсумків, починаючи з fromDay, із заміною документів.
// Повторний запуск на тих самих даних дає той самий результат.
function dailySummaryReplace(fromDay, into = 'daily_summary') {
  return [
    { $match: { day: { $gte: fromDay } } },
    { $group: { _id: '$day', total: { $sum: '$amount' }, n: { $sum: 1 } } },
    { $merge: { into, on: '_id', whenMatched: 'replace', whenNotMatched: 'insert' } },
  ];
}

// «Дельта»: додати до наявного підсумку нові події після водяного знака.
// Повтор того самого запуску (ретрай після таймауту) додає ту саму дельту вдруге.
function dailySummaryDelta(afterSeq, into = 'daily_summary_delta') {
  return [
    { $match: { seq: { $gt: afterSeq } } },
    { $group: { _id: '$day', total: { $sum: '$amount' }, n: { $sum: 1 } } },
    { $merge: {
      into, on: '_id',
      whenMatched: [{ $set: { total: { $add: ['$total', '$$new.total'] }, n: { $add: ['$n', '$$new.n'] } } }],
      whenNotMatched: 'insert',
    } },
  ];
}

// Наростаючий підсумок, зміна відносно попереднього дня і ранг дня за сумою в межах магазину.
function dailyWindow() {
  return [
    { $setWindowFields: {
      partitionBy: '$shop',
      sortBy: { day: 1 },
      output: {
        running: { $sum: '$amount', window: { documents: ['unbounded', 'current'] } },
        prev: { $shift: { output: '$amount', by: -1, default: null } },
        movAvg3: { $avg: '$amount', window: { documents: [-2, 'current'] } },
      },
    } },
    { $setWindowFields: {
      partitionBy: '$shop',
      sortBy: { amount: -1 },
      output: { rank: { $rank: {} } },
    } },
    { $sort: { shop: 1, day: 1 } },
  ];
}

module.exports = {
  expensiveItemsExpr, expensiveItemsUnwind,
  dailySummaryReplace, dailySummaryDelta, dailyWindow,
};
