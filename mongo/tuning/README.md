# Тюнінг MongoDB: цикл «знайти → виміряти → змінити → перевиміряти»

Основа для «перевірено» в `Obsidian Vault/Engineering/General/Mongo/Тюнінг продуктивності MongoDB.md`.

Дані (`seed.js`, детерміновано, PRNG mulberry32): `events` на 1 000 000 документів
(`userId` 50 000 різних; `type` view 60%, click 25%, cart 8%, buy 5%, refund 2%;
`country` UA 90% / DE 9,7% / PL 0,3% і `channel` web 90% / app 9,7% / sms 0,3%, перекошені
«навхрест»; `ts`, `amount`, `payload` на 200 байт) і `users` на 50 000 документів з полем
`uid` (не `_id`). Стартові індекси: `{type: 1}`, `{country: 1}`, `{channel: 1}`.

| Розділ `tuning.js` | Що перевіряє |
| ------------------ | ------------ |
| A | запит застосунку `find({userId, type: "click"}).sort({ts: -1}).limit(10)`: профайлер (`slowms: 20`), `$queryStats` (sample rate піднято до 1.0), `explain` до й після індексу `{userId: 1, type: 1, ts: -1}` |
| B | `$lookup` events → users: перестановка `$match` оптимізатором, стратегії `NestedLoopJoin` / `IndexedLoopJoin` / `HashJoin`, SBE проти класичного рушія, `$unwind` після `$lookup` |
| C | `$group` на 50 000 груп з лімітом стадії 1 МБ замість 100 МБ: spill на диск і `allowDiskUse: false` |
| D | plan cache: `$planCacheStats`, replanning (`replanned`, `replanReason` у профайлері), `planCacheClear` |
| E | `$indexStats`, `hideIndex`; ціна вставки 200 000 документів з 0, 3 і 6 вторинними індексами |
| F | лічильники кешу WiredTiger у контейнері з `--memory 2g` |

## Запуск

Потрібен лише Docker (образ `mongo:9`; прогін нижче на 9.0.4).

```bash
cd examples/mongo/tuning
bash run.sh          # ~8 хв; вивід у out/seed.out і out/tuning.out; контейнер видаляється
KEEP=1 bash run.sh   # лишити контейнер tune-mongo для ручних дослідів
```

## Результат прогону 2026-10-30

MongoDB 9.0.4 standalone у Docker з `--memory 2g`, один хост (12 ядер). Мілісекунди
плавають між прогонами до 1,5–2 разів (у попередньому прогоні того ж дня E2 з 6 індексами
дав 6,5 с замість 10,1 с), тому порівнюй лічильники ключів і документів: вони між
прогонами однакові.

### A. Запит застосунку: знайти, виміряти, змінити, перевиміряти

| Джерело | До (індекс `{type: 1}`) | Після (`{userId, type, ts: -1}`) |
| ------- | ----------------------- | -------------------------------- |
| профайлер, операцій > 20 мс з 30 | 30 | 0 |
| запис профайлера | `millis: 469`, `IXSCAN { type: 1 }`, `keysExamined = docsExamined = 250 081`, `nreturned: 4`, `hasSortStage: true`, `queryFramework: "classic"` | — |
| `$queryStats`, середнє на виконання (30 виконань) | 434,9 мс, 250 081 ключ, 250 081 документ | 0,4 мс, 6 ключів, 6 документів |
| `explain("executionStats")` | `SORT > FETCH > IXSCAN[type_1]`, keys 250 081, docs 250 081, nReturned 4 | `LIMIT > FETCH > IXSCAN[userId_1_type_1_ts_-1]`, keys 4, docs 4, nReturned 4 |
| медіана з боку клієнта (mongosh) | 438 мс | 2 мс |

`queryShapeHash` у профайлері (`C21C2B8D9B1C…`) збігся з ключем запису в `$queryStats`: за
ним дві системи зшиваються. Профайлер віддає один приклад, `$queryStats` агрегат форми.

### B. `$lookup` events → users

| Варіант | Рушій | Стратегія | Документів переглянуто | мс |
| ------- | ----- | --------- | ---------------------- | -- |
| 200 вхідних, без індексу на `users.uid` (50 000) | SBE | `NestedLoopJoin` | 10 000 200 | 5 454 |
| те саме | classic (`forceClassicEngine`) | — | 10 000 000 у `$lookup` | 6 890 |
| 200 вхідних, індекс `{uid: 1}` | SBE | `IndexedLoopJoin` | 400 | 7 |
| усі 19 963 refund, індекс | SBE (`$set: {$first: "$u.tier"}`) | `IndexedLoopJoin` | 39 926 | 354 |
| те саме, але `$unwind: "$u"` після `$lookup` | classic: `$lookup` не потрапив у SBE | — | 19 964 у `$lookup` | 1 816 |
| те саме з `$first`, classic примусово | classic | — | 19 963 у `$lookup` | 1 824 |
| 3 957 вхідних, `users10k` (10 000 док.) без індексу | SBE | `HashJoin` | 29 963 | 109 |
| те саме з індексом `{uid: 1}` | SBE | `IndexedLoopJoin` | 23 920 | 180 |

- Конвеєр `$lookup → $set → $match {type} → $group` оптимізатор переписав так, що фільтр
  пішов під `EQ_LOOKUP` як `IXSCAN[type_1]`: перестановку зроблено без нас.
- `HashJoin` обирається, лише якщо зовнішня колекція ≤ 10 000 документів і ≤ 100 МБ
  (`internalQueryCollectionMaxNoOfDocumentsToChooseHashJoin`,
  `internalQueryCollectionMax{Data,Storage}SizeBytesToChooseHashJoin`). На 50 000 `users`
  без індексу вийшов `NestedLoopJoin`: перший прогін з усіма 19 963 вхідними документами
  працював понад 6 хвилин і був знятий через `$currentOp` + `db.killOp(opid)`; клієнт
  отримав `MongoServerError: operation was interrupted`.
- `$lookup` + `$unwind` (оптимізатор зливає їх в одну стадію) на 9.0.4 лишився в
  класичному рушії (`explainVersion: "1"`, `stages: [$cursor, $lookup, $group]`), а з
  `$first` замість `$unwind` весь конвеєр пішов у SBE. У попередньому прогоні того ж дня
  співвідношення було 2 923 мс проти 420 мс.

### C. `$group` і ліміт пам'яті

| Ліміт стадії | мс | `usedDisk` | `spills` |
| ------------ | -- | ---------- | -------- |
| 100 МБ (типовий) | 2 368 | false | 0 |
| 1 МБ (`internalDocumentSourceGroupMaxMemoryBytes` і `internalQuerySlotBasedExecutionHashAggApproxMemoryUseInBytesBeforeSpill`) | 17 380 | true | 95 |
| 1 МБ з `allowDiskUse: false` | помилка `QueryExceededMemoryLimitNoDiskUseAllowed` | — | — |

### D. Plan cache і replanning

1. `{country: "PL", channel: "web"}` ×3 → `$planCacheStats`: `isActive: true`, `works: 118`,
   план `FETCH > IXSCAN[country_1]`.
2. `{country: "UA", channel: "sms"}` → профайлер: `replanned: true`, `replanReason: "cached
   plan was less efficient than expected: expected trial execution to take 118 works but it
   took at least 1180 works"`, новий план `IXSCAN { channel: 1 }`, 108 ключів, 3 мс.
3. Кеш після цього: `works: 108`, `FETCH > IXSCAN[channel_1]`. `planCacheClear` → 0 записів.

### E. Гігієна індексів

`$indexStats` після всього прогону: `type_1` 69, `userId_1_type_1_ts_-1` 30, `country_1` 3,
`channel_1` 1, `_id_` 0. Лічильник `type_1` включає 30 запитів застосунку до зміни й
агрегації розділів B–C, тож «популярний» індекс не обов'язково потрібен застосунку.
`explain` лічильник не збільшує (окрема перевірка: після `explain("executionStats")`
`accesses.ops` лишився 0). Hint на неіснуючий індекс дає помилку
`planner returned error … hint`, а не тихий `COLLSCAN`. `hideIndex("type_1")` не змінив план
запиту застосунку (`IXSCAN[userId_1_type_1_ts_-1]`).

Вставка 200 000 документів батчами по 10 000:

| Вторинних індексів | мс | `totalIndexSize`, МБ |
| ------------------ | -- | -------------------- |
| 0 | 3 069 | 1,7 |
| 3 | 4 759 | 6,1 |
| 6 | 10 137 | 16,0 |

У попередньому прогоні: 2 068 / 3 792 / 6 634 мс. Напрям стабільний, множник ні.

### F. Кеш WiredTiger у контейнері

`hostInfo.system.memLimitMB: 2048`, `maximum bytes configured`: 512 МБ, тобто
50% × (2 ГБ − 1 ГБ): mongod 9.0.4 врахував ліміт cgroup. Наприкінці прогону в кеші 348 МБ,
dirty 25 МБ.
