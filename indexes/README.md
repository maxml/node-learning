# Приклади: індекси, кардинальність і ESR

Код експериментів, на які спираються нотатки
`Obsidian Vault/Engineering/General/Бази даних/Правило ESR.md`,
`Бази даних/Кардинальність і селективність.md`, `SQL/Індекси.md` і `Mongo/Індекси MongoDB.md`.

Дані: 1 000 000 рядків `orders(id, status, customer_id, region, created_at, amount)`.
Генерує їх `gen.sql` у PostgreSQL (детерміновано, `setseed(0.42)`), а `export-mongo.sql`
вивантажує ті самі рядки в MongoDB через `mongoimport`, тож обидва рушії працюють з
однаковими даними. `status`: paid 600 162, new 199 161, shipped 100 535, cancelled 80 414,
refunded 19 728. `customer_id`: 99 995 різних значень. `region = customer_id % 20`.

| Файл                                 | Що перевіряє                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `esr_pg.py`, `esr_mongo.js`          | запит `status = 'paid' AND amount > X ORDER BY created_at LIMIT 20` під індексами E-S-R, E-R-S, S-E-R, R-E-S і трьома діапазонами (10%, 0,1%, 0,01% від `paid`) |
| `nuances_pg.py`, `nuances_mongo.js`  | `IN` / `$in` (зокрема поріг 200/201 для `SORT_MERGE`), `<>` / `$ne`, змішаний напрям сортування, покривні індекси й `INCLUDE` |
| `card_pg.py`, `card_mongo.js`        | індекс на `status` для 60% і 2%, частковий індекс, `pg_stats`, `CREATE STATISTICS`, порядок `(status, customer_id)` проти `(customer_id, status)`, skip scan (PG 18 проти PG 17), вибір плану й plan cache у MongoDB, лічильник CBR |
| `unique_pg.sql`, `unique_mongo.js`   | `NULL` / відсутнє поле в унікальному індексі, `NULLS NOT DISTINCT`, частковий унікальний, `sparse`, multikey, складений ключ, FK на унікальний індекс |
| `race_pg.py`                         | check-then-insert з двох сесій: без `UNIQUE`, з `UNIQUE`, на `SERIALIZABLE`                       |
| `pglib.py`, `mongolib.js`            | спільні функції: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` / `explain("executionStats")`, медіана з 5 прогонів після прогріву |

## Запуск

Потрібні Docker (образи `postgres:18`, `postgres:17`, `mongo:9`) і Python 3 без
сторонніх пакетів.

```bash
cd examples/indexes
bash run.sh            # ~4 хв; результати в out/*.out; контейнери видаляються наприкінці
KEEP=1 bash run.sh     # лишити контейнери idx-pg, idx-pg17, idx-mongo для ручних дослідів
```

Порти за замовчуванням: PostgreSQL 18 на 55434, PostgreSQL 17 на 55435, MongoDB на 27051
(змінні `PG_PORT`, `PG17_PORT`, `MONGO_PORT`). Скрипти ходять у контейнери через
`docker exec`, тож порти потрібні лише для ручного підключення.

## Результати прогону 2026-10-29

PostgreSQL 18.6 і 17.11, MongoDB 9.0.4 (standalone), один хост. Мілісекунди між
прогонами плавали до двох разів (у попередньому прогоні того ж дня E-R-S на 10% дав 18 мс
замість 44), тому порівнювати варто buffers і ключі: вони від прогону до прогону однакові.

### ESR: `status = 'paid' AND amount > X ORDER BY created_at LIMIT 20`

| Індекс | Діапазон | PostgreSQL план                       | buffers | мс    | MongoDB план             | keys    | docs | мс  |
| ------ | -------- | ------------------------------------- | ------- | ----- | ------------------------ | ------- | ---- | --- |
| E-S-R  | 10%      | Limit → Index Scan                    | 13      | 0,157 | LIMIT → FETCH → IXSCAN   | 186     | 20   | 0   |
| E-R-S  | 10%      | Limit → Gather Merge → Sort → Bitmap  | 8 512   | 43,9  | FETCH → SORT → IXSCAN    | 59 863  | 20   | 83  |
| S-E-R  | 10%      | Limit → Index Scan                    | 13      | 0,189 | LIMIT → FETCH → IXSCAN   | 325     | 20   | 1   |
| R-E-S  | 10%      | Limit → Gather Merge → Sort → Bitmap  | 8 723   | 36,5  | FETCH → SORT → IXSCAN    | 76 292  | 20   | 266 |
| E-S-R  | 0,1%     | Limit → Index Scan                    | 116     | 1,63  | LIMIT → FETCH → IXSCAN   | 17 702  | 20   | 33  |
| E-R-S  | 0,1%     | Limit → Sort → Bitmap                 | 575     | 3,37  | FETCH → SORT → IXSCAN    | 578     | 20   | 1   |
| S-E-R  | 0,1%     | Limit → Index Scan                    | 177     | 3,73  | LIMIT → FETCH → IXSCAN   | 29 683  | 20   | 42  |
| R-E-S  | 0,1%     | Limit → Sort → Bitmap                 | 582     | 3,24  | FETCH → SORT → IXSCAN    | 747     | 20   | 3   |
| E-S-R  | 0,01%    | Limit → Index Scan                    | 1 352   | 26,1  | LIMIT → FETCH → IXSCAN   | 268 486 | 20   | 586 |
| E-R-S  | 0,01%    | Limit → Sort → Index Scan             | 63      | 0,472 | FETCH → SORT → IXSCAN    | 56      | 20   | 0   |
| S-E-R  | 0,01%    | Limit → Index Scan                    | 2 275   | 56,3  | LIMIT → FETCH → IXSCAN   | 448 042 | 20   | 621 |
| R-E-S  | 0,01%    | Limit → Sort → Bitmap                 | 67      | 0,532 | FETCH → SORT → IXSCAN    | 71      | 20   | 0   |

### Тонкощі ESR

| Випадок                                                     | PostgreSQL 18                                           | MongoDB 9                                        |
| ----------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| `status IN ('paid','shipped')`, ESR-індекс                   | Seq Scan → Sort, 8 239 buffers; з `enable_seqscan=off` Bitmap (2 пошуки) → Sort, 11 683 | `SORT_MERGE` над 2 IXSCAN, 188 ключів, без SORT   |
| `status <> 'paid'` / `$ne`                                   | Seq Scan → Sort                                         | SORT, 399 839 ключів                              |
| `$in` 200 / 201 значень `customer_id`, індекс `{customer_id, created_at}` | не перевірялось                              | 200: `SORT_MERGE`, 219 ключів; 201: SORT, 1 987 ключів |
| покритий запит (`created_at, amount`), ESR-індекс            | Index Only Scan, 11 buffers, Heap Fetches 0             | `PROJECTION_COVERED`, 186 ключів, 0 документів   |
| `(status, created_at) INCLUDE (amount)`                      | Index Only Scan, `Filter: amount > 900`, 166 відкинуто, 5 buffers | немає аналога                          |
| `ORDER BY customer_id, created_at DESC` при `(status, customer_id, created_at)` | Incremental Sort → Index Scan, 39 buffers | SORT, 600 162 ключі, 1 436 мс             |
| те саме при `(status, customer_id, created_at DESC)`         | Index Scan, 23 buffers                                  | IXSCAN, 20 ключів                                |

### Кардинальність

| Випадок                                                        | PostgreSQL 18                         | PostgreSQL 17                    | MongoDB 9                                       |
| -------------------------------------------------------------- | ------------------------------------- | -------------------------------- | ----------------------------------------------- |
| `status = 'paid'` (60%), індекс `(status)`                      | Seq Scan, 8 163 buffers               | Seq Scan                         | IXSCAN 600 162 ключі, 1 877 мс; COLLSCAN з hint 546 мс |
| `status = 'refunded'` (2%), індекс `(status)`                   | Bitmap, 7 487 buffers, 17 мс          | Bitmap                           | IXSCAN 19 728 ключів, 42 мс; COLLSCAN 528 мс     |
| частковий `(created_at) WHERE status = 'refunded'`             | 448 kB проти 31 MB у `(status, created_at)`; `LIMIT 20` за 10 buffers | те саме | не перевірялось                         |
| `customer_id = 4242 AND region = 2`, оцінка rows (факт 10)     | 1; з `CREATE STATISTICS (dependencies)` 11 | 1; 11                        | немає статистики                                 |
| `pg_stats.n_distinct` для `customer_id` (факт 99 995)          | 90 867                                | 90 457                           | —                                                |
| лише `customer_id = 4242` при `(status, customer_id)`           | Index Scan, 11 Index Searches, 51 buffers | Seq Scan, 8 192 buffers      | COLLSCAN; з hint 1 000 000 ключів               |
| лише `customer_id = 4242` при `(customer_id, status)`           | Bitmap, 13 buffers                    | Bitmap, 13 buffers               | IXSCAN, 10 ключів                                |
| лише `status = 'refunded'` при `(customer_id, status)`          | Seq Scan; примусово весь індекс, 1 974 buffers | Seq Scan; 1 965 buffers  | COLLSCAN; з hint 1 000 000 ключів               |
| лише `status = 'refunded'` при `(status, customer_id)`          | Index Only Scan, 76 buffers           | 76 buffers                       | IXSCAN, 19 728 ключів                            |
| вибір плану з двох кандидатів                                   | —                                     | —                                | пробний запуск: обидва по 17 works; переміг `customer` (5 результатів проти 0); 1 активний запис у plan cache |
| `serverStatus().metrics.query.cbr.count` після всіх прогонів     | —                                     | —                                | 0                                                |

### Унікальність

```
PostgreSQL 18.6
UNIQUE: два NULL                          -> INSERT 0 2
UNIQUE NULLS NOT DISTINCT: другий NULL     -> duplicate key value violates unique constraint
частковий (email) WHERE deleted_at IS NULL -> після soft delete вставка ок; друга жива -> duplicate key
ON CONFLICT (email) без WHERE              -> there is no unique or exclusion constraint matching the ON CONFLICT specification
ON CONFLICT (email) WHERE deleted_at IS NULL -> INSERT 0 0
ADD CONSTRAINT … UNIQUE USING INDEX (частковий) -> "accounts_email_live" is a partial index
UNIQUE (tenant_id, email): (1, NULL) двічі -> INSERT 0 2
FK на повний унікальний індекс            -> ок; на частковий -> there is no unique constraint matching given keys

race_pg.py
без UNIQUE, READ COMMITTED: рядків 'a' = 2
з UNIQUE, READ COMMITTED:   рядків 'a' = 1; друга сесія: duplicate key value violates unique constraint "r_email_key"
без UNIQUE, SERIALIZABLE:   рядків 'a' = 1; одна сесія: could not serialize access due to read/write dependencies among transactions

MongoDB 9.0.4
unique: {} двічі                          -> E11000 dup key: { email: null }
unique + sparse: {} двічі ок; {email:null} двічі -> E11000; find().sort({email:1}) без hint -> SORT (індекс не обрано)
unique + partial {$type:"string"}: {} і {email:null} по двічі ок; рядок двічі -> E11000
partialFilterExpression {deleted:false} і {deleted_at:null}: після soft delete вставка ок; друга жива -> E11000
partialFilterExpression {deleted_at:{$exists:false}} -> 67 Error in specification
multikey unique: ["x","x"] ок; другий документ з "x" -> E11000; ["y","z"] ок; ["z"] -> E11000
складений {tenant, email}: {tenant:1} двічі -> E11000; {tenant:2} ок
```

Сирий вивід кожного скрипта після `run.sh` лежить в `out/`.
