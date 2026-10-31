# Сценарій: онлайн-міграція великої таблиці

Код за позначками «перевірено» в нотатці `Obsidian Vault/Engineering/General/Сценарні задачі/Онлайн-міграція великої таблиці.md`.

Умова з співбесіди: додати обов'язковий `tenant_id` та індекс до навантаженої таблиці з кількома
мільярдами рядків; кілька Node.js-сервісів читають і пишуть її, деплой rolling, вікна обслуговування
немає. Тут та сама задача на 5 млн рядків: що ламається при «прямому» підході і як працює кожен
крок безпечного.

## Запуск

```bash
cd examples/scenarios/online-migration
bash run.sh            # ~12 хв; вивід у out/*.out; контейнери видаляються наприкінці
KEEP=1 bash run.sh     # лишити контейнер scen-mig-pg (порт 55440) для ручних дослідів
MYSQL=0 bash run.sh    # без перевірки MySQL
```

Потрібні Docker (образи `postgres:18`, `mysql:8.4.2`) і Node.js 24. `run.sh` сам ставить залежності
(`npm ci`, лише `pg` 8.23.1). Дані живуть у tmpfs контейнера (RAM, до 6 ГБ), тож на диску нічого
не лишається; fsync там майже безкоштовний, і коміти дешевші, ніж на справжньому диску.

## Дані

`setup.sql`: `accounts` 50 000 рядків у 1 000 тенантах, `orders` 5 000 000 рядків (670 MB разом з
індексами `pkey` і `account_id`). Тенант замовлення *не* зберігається в `orders`: його виводять через
`orders.account_id → accounts.tenant_id`. Це й треба додати.

## Кроки

| Скрипт | Що робить |
| --- | --- |
| `01-add-column.mjs` | `ADD COLUMN` nullable, з константним default, з `NOT NULL DEFAULT 0` і з волатильним default; час під `ACCESS EXCLUSIVE` і чи змінився `relfilenode` (переписування) |
| `02-lock-queue.mjs` | транзакція «звіту» тримає `ACCESS SHARE` 5 с, `ALTER` чекає за нею, 8 клієнтів API читають; без `lock_timeout` і з `lock_timeout = 200ms` + повтори з backoff; знімок `pg_locks` |
| `03-dual-write.mjs` | «старий» код вставляє рядки без `tenant_id` 3 с без тригера й з тригером `BEFORE INSERT OR UPDATE`, що виводить значення з `accounts` |
| `04-backfill.mjs sweep` | backfill пачками 1 000 / 10 000 / 100 000 / 500 000 рядків, кожна на своєму діапазоні з 500 тис. рядків, поки 4 клієнти оновлюють випадкові рядки того самого діапазону; WAL на рядок, частка HOT |
| `04-backfill.mjs run` | перезапусковий backfill решти таблиці: пачки по 10 000, пауза 20 мс, прогрес у `backfill_progress` в тій самій транзакції; `--crash-after 250` імітує падіння, другий запуск продовжує |
| `05-not-null.mjs` | `SET NOT NULL` напряму; `CHECK NOT VALID` → `VALIDATE` → `SET NOT NULL`; PG 18 `NOT NULL … NOT VALID` → `VALIDATE`; і пастка `SET NOT NULL` поверх невалідного not-null. Під кожним кроком 4 читачі й 2 писачі |
| `06-index.mjs` | `CREATE INDEX` проти `CONCURRENTLY` під записом; `CONCURRENTLY` і стара транзакція на іншій таблиці; скасований `CONCURRENTLY` і `INVALID` індекс; `IF NOT EXISTS`; `CONCURRENTLY` у транзакції; плани «останні 50 замовлень тенанта» з трьома індексами |
| `07-partitioned.mjs` | партиційована таблиця: що поширюється з батьківської, `CONCURRENTLY` на батьківській, обхід через `ON ONLY` + `ATTACH PARTITION` |
| `08-mysql.sql` | MySQL 8.4 на 1 млн рядків: які `ALGORITHM` приймають `ADD COLUMN`, `NOT NULL` та `ADD INDEX` |

## Результати прогону 2026-10-31

PostgreSQL 18.6, MySQL 8.4.2, Node.js 24.14.1, Linux 6.8, 12 ядер. Машина в цей час була
навантажена іншими процесами (load average 11–13), тож абсолютні мілісекунди між прогонами
плавали до двох разів. Стабільні від прогону до прогону: режими блокувань, хто кого чекає,
співвідношення (у скільки разів), коди помилок і стани каталогу. Нижче вивід останнього повного
прогону `run.sh` (файли в `out/`).

### 01. ADD COLUMN

```
case | ms under ACCESS EXCLUSIVE | heap rewritten
nullable, no default | 1.3 | false
constant default 0 | 2.5 | false
constant default + NOT NULL | 1.2 | false
volatile default clock_timestamp() | 10253 | true
expand: ALTER TABLE orders ADD COLUMN tenant_id bigint -> 0.7 ms
```

### 02. Черга блокувань

```
== no lock_timeout
  long-report  AccessShareLock      granted
  api          AccessShareLock      waiting x8
  migration    AccessExclusiveLock  waiting
ALTER done after 5005 ms, attempts=1; traffic over 5.5 s: 5437 queries (987/s), p50=0.7 ms, p99=2.0 ms, max=5007 ms, >100ms: 8
== lock_timeout = '200ms' + retry with backoff
  (той самий знімок pg_locks під час однієї зі спроб)
ALTER done after 6010 ms, attempts=6; traffic over 6.5 s: 53646 queries (8241/s), p50=0.7 ms, p99=2.8 ms, max=203 ms, >100ms: 40
```

p99 тут оманливий: клієнтів 8, і всі 8 стоять 5 с, тож це 8 «повільних» запитів із тисяч. Дивитись
треба на пропускну здатність за вікно і на max.

### 03. Dual-write

```
v1 writes, no dual-write : 8236 inserts/s, p50=0.5 ms, p99=1.0 ms; new rows=24707, tenant_id NULL=24707
v1 writes, with trigger  : 8014 inserts/s, p50=0.5 ms, p99=0.8 ms; new rows=24043, tenant_id NULL=0
v2 insert keeps its tenant_id=8; account change re-derives it -> 9
```

### 04. Backfill

```
batch | rows/s | batch avg ms | batch max ms | WAL bytes/row | HOT % | app UPDATEs/s | app UPDATE p99 / max ms
1000 | 16954 | 59.0 | 100 | 897 | 31 | 7674 | 1.0 / 66.2
10000 | 24767 | 404 | 752 | 623 | 9 | 2841 | 1.1 / 674
100000 | 76931 | 1300 | 1352 | 567 | 1 | 971 | 0.6 / 1227
500000 | 85824 | 5826 | 5826 | 691 | 0 | 221 | 1.6 / 5725
```

```
start: last_id=0 target_id=5048751 rows_done=0 batch=10000 sleep=20ms
simulated crash after 250 batches at last_id=2500000
start: last_id=2500000 target_id=5048751 rows_done=500000 batch=10000 sleep=20ms
done: 255 batches, 2524707 rows in 34.3 s (73667 rows/s), WAL 1542 MiB (45.0 MiB/s); rows with tenant_id NULL left: 0
```

Перші 2 млн рядків уже заповнив `sweep`, тож перші 200 пачок задачі оновили 0 рядків (умова
`tenant_id IS NULL` робить пачку ідемпотентною); `rows_done=500000` це пачки 201–250. Другий
запуск почав з `last_id=2500000`. `target_id` більший за 5 000 000, бо `03` вставив нові рядки.

### 05. NOT NULL

```
step | duration | concurrent reads | concurrent writes | note
(a) SET NOT NULL, naive (rolled back) | 786 ms | reads max 785 ms | writes max 785 ms
(b1) ADD CHECK … NOT VALID | 0.8 ms | reads max 5.9 ms | writes max 6.3 ms
(b2) VALIDATE CONSTRAINT | 1888 ms | reads max 7.0 ms | writes max 7.0 ms | lock: ShareUpdateExclusiveLock
(b3) SET NOT NULL using the CHECK | 2.6 ms | reads max 2.0 ms | writes max 2.6 ms | existing constraints on column "orders.tenant_id" are sufficient to prove that it does not contain nulls
(c1) ADD CONSTRAINT … NOT NULL tenant_id NOT VALID | 0.8 ms | reads max 2.0 ms | writes max 2.1 ms
    catalog after NOT VALID: {"attnotnull":true,"convalidated":false}
    insert with NULL tenant_id: rejected (23502 null value in column "tenant_id" of relation "orders" violates not-null constraint)
(c2) VALIDATE CONSTRAINT (NOT NULL) | 2697 ms | reads max 10.2 ms | writes max 8.1 ms | lock: ShareUpdateExclusiveLock
    catalog after VALIDATE: {"attnotnull":true,"convalidated":true}
    probe: NOT VALID added over an existing NULL; VALIDATE -> 23502 column "x" of relation "nn_probe" contains null values
(c3) SET NOT NULL over the NOT VALID one | 1145 ms | reads max 1145 ms | writes max 1145 ms | lock: AccessExclusiveLock
    catalog after SET NOT NULL: {"attnotnull":true,"convalidated":true}
```

### 06. Індекс

```
== build under 4 writers (50% UPDATE, 50% INSERT)
CREATE INDEX              | build 3630 ms | writes during build 2 (1/s, baseline 3319/s) | write max 3630 ms
CREATE INDEX CONCURRENTLY | build 11325 ms | writes during build 36023 (3181/s, baseline 3561/s) | write max 7.7 ms
== CIC waits for any transaction holding an old snapshot (here: on another table)
phases seen: building index: scanning table -> building index: sorting live tuples -> building index: loading tuples in tree -> index validation: scanning index -> index validation: sorting tuples -> index validation: scanning table -> waiting for old snapshots
reached "waiting for old snapshots" at 4607 ms, still "waiting for old snapshots" 5 s later; finished 0.5 ms after the other transaction committed
== failed CIC leaves an INVALID index
CIC cancelled: 57014 canceling statement due to statement timeout
cancelled during the first scan, left behind: {"indisvalid":false,"indisready":false,"size":"0 bytes"}
cancelled while "waiting for old snapshots" (57014), left behind: {"indisvalid":false,"indisready":true,"size":"152 MB"}
re-run with IF NOT EXISTS: "relation "orders_tenant_created_idx" already exists, skipping" -> still {"indisvalid":false,"indisready":true,"size":"152 MB"}
after DROP INDEX CONCURRENTLY + CIC: {"indisvalid":true,"indisready":true,"size":"152 MB"}
== CIC inside a transaction (what a migration runner does by default)
25001 CREATE INDEX CONCURRENTLY cannot run inside a transaction block
== which index serves "latest 50 orders of a tenant"
(tenant_id, created_at) | Limit > Index Scan(orders_tenant_created_idx) | buffers 55 | 0.25 ms
(tenant_id) only        | Limit > Sort > Bitmap Heap Scan > Bitmap Index Scan(orders_tenant_only_idx) | buffers 4882 | 17.21 ms
(created_at) only       | Limit > Index Scan(orders_created_only_idx) | buffers 48911 | 57.16 ms
```

### 07. Партиційована таблиця

```
ok    | ADD COLUMN tenant_id on the parent (propagates to partitions)
ok    | ADD CHECK (tenant_id IS NOT NULL) NOT VALID on the parent
ok    | VALIDATE CONSTRAINT on the parent (recurses)
ok    | ADD … NOT NULL tenant_id NOT VALID on the parent (PG 18)
error | CREATE INDEX CONCURRENTLY on the parent -> 0A000 cannot create index on partitioned table "events" concurrently
ok    | CREATE INDEX ON ONLY events (parent only, no data)
      parent index valid: false
ok    | CREATE INDEX CONCURRENTLY on events_2026_09
ok    | ALTER INDEX events_tenant_idx ATTACH PARTITION events_2026_09_tenant_idx
      parent index valid: false
ok    | CREATE INDEX CONCURRENTLY on events_2026_10
ok    | ALTER INDEX events_tenant_idx ATTACH PARTITION events_2026_10_tenant_idx
      parent index valid: true
```

### 08. MySQL 8.4.2

```
| ADD COLUMN NULL, ALGORITHM=INSTANT |
Query OK, 0 rows affected (0.00 sec)
| MODIFY NOT NULL, ALGORITHM=INSTANT (expected to be refused) |
ERROR 1845 (0A000) at line 20: ALGORITHM=INSTANT is not supported for this operation. Try ALGORITHM=COPY/INPLACE.
| MODIFY NOT NULL, ALGORITHM=INPLACE, LOCK=NONE (online, but rebuilds the table) |
Query OK, 0 rows affected (1.22 sec)
| ADD INDEX, ALGORITHM=INSTANT (expected to be refused) |
ERROR 1845 (0A000) at line 26: ALGORITHM=INSTANT is not supported for this operation. Try ALGORITHM=COPY/INPLACE.
| ADD INDEX, ALGORITHM=INPLACE, LOCK=NONE |
Query OK, 0 rows affected (1.81 sec)
```

## Чого цей прогін не показує

- Реплік тут немає: лаг реплікації не виміряно, виміряно лише обсяг WAL, який репліка мала б
  прийняти й програти (45 МіБ/с у повному backfill-і).
- 5 млн рядків замість мільярдів: тривалість кроків масштабується приблизно лінійно з обсягом,
  але кеш, диск і autovacuum на продовому обсязі поводяться інакше. Числа для мільярдів у нотатці
  позначені як екстраполяція.
- Пул з'єднань застосунку не змодельовано: «8 клієнтів» це 8 окремих з'єднань у циклі. Як черга
  блокувань виглядає для пулу (вичерпання, таймаути) розібрано в `../db-connections/`.
