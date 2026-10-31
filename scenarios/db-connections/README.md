# Сценарій: вичерпання з'єднань з БД під навантаженням

Код за позначками «перевірено» в нотатці
`Obsidian Vault/Engineering/General/Сценарні задачі/Вичерпання з'єднань з БД під навантаженням.md`.

Умова з співбесіди: Node.js API, 20 реплік з пулом до 30 з'єднань кожна. Під піком латентність
понад 10 с, база близько до ліміту з'єднань; масштабування до 60 реплік робить гірше. Моніторинг:
високий CPU бази, повільні запити, очікування пулу, трохи затримки event loop, і планові воркери
на тій самій базі.

Тут та сама картина в масштабі ноутбука: PostgreSQL 18 обмежений `--cpus=2` і
`max_connections = 100`, «репліки» це окремі Node-процеси з власним `pg.Pool`, «20 реплік × 30»
стає 2 × 30, а «60 реплік × 30» стає 6 × 30 (180 > 100).

## Запуск

```bash
cd examples/scenarios/db-connections
bash run.sh              # ~12 хв; вивід у out/*.out; контейнери й мережа видаляються наприкінці
KEEP=1 bash run.sh       # лишити scen-conn-pg (55441) і scen-conn-bouncer (55442)
SPIKE=200 NORMAL=60 bash run.sh   # інша машина: перекалібрувати за out/1-sweep.out
```

Потрібні Docker (образи `postgres:18`, `edoburu/pgbouncer:v1.23.1-p3`) і Node.js 24.
Залежність одна: `pg` 8.23.1 (`npm ci`). Дані в tmpfs контейнера.

## Що в теці

| Файл | Що робить |
| --- | --- |
| `setup.sql` | `orders` 300 000 рядків *без* індексу на `customer_id` (API-запит = seq scan, ~15 мс CPU), `ledger` 2 млн рядків для звіту воркерів (~0,5 с), роль `app` без superuser (резервні слоти лишаються адміну), `pg_stat_statements` |
| `sweep.mjs` | закритий цикл: C з'єднань крутять API-запит 10 с, без черги в застосунку; міряє, що база робить з C паралельними запитами |
| `replica.mjs` | одна «репліка API»: власний `pg.Pool`, відкритий потік запитів із заданою частотою (користувачі не сповільнюються, коли ми повільні), міряє латентність і очікування пулу, затримку event loop; або «воркер» зі звітами в закритому циклі |
| `fleet.mjs` | запускає N реплік (+ воркер), спостерігає базу: пік backend-ів, CPU контейнера з cgroup, `mean_exec_time` API-запиту з `pg_stat_statements` |
| `diagnose.sql` | топ запитів з `pg_stat_statements` і `EXPLAIN (ANALYZE, BUFFERS)` API-запиту |
| `bouncer-session-state.mjs` | `statement_timeout` як startup-параметр через PgBouncer і `SET LOCAL` |

Колонки рядка `fleet.mjs`: `offered` = частота × 20 с (фактично надіслано може бути на 1 більше на
репліку); `ok` = завершені успішно, у дужках скільки з них за ≤ 1 с (goodput при SLO 1 с);
`p50/p99` латентність успішних запитів з урахуванням очікування пулу; `pool-wait p99` лише
очікування `pool.connect()`; `errors` за кодом (`53300` too many clients, `08P01` від PgBouncer,
`pool-timeout` = `connectionTimeoutMillis`); `pgss mean` = середній час виконання запиту *у базі*
за `pg_stat_statements`; `ELD p99` = затримка event loop найгіршої репліки.

## Результати прогону 2026-10-31

PostgreSQL 18.6, PgBouncer 1.23.1, Node.js 24.14.1, Linux 6.8, 12 ядер, база обмежена 2 ядрами.
Машина паралельно була навантажена іншими процесами, тож окремі прогони плавали (див. повтори
3c нижче). Повний вивід у `out/`.

### 1. Що база робить з C паралельними запитами

```
connections | queries/s | p50 ms | p99 ms | DB CPU cores | L = λ·W
1 | 72 | 13.4 | 39.3 | 0.98 | 1.0
2 | 113 | 17.3 | 24.2 | 1.96 | 2.0
4 | 117 | 17.4 | 78.5 | 2.01 | 4.0
8 | 89 | 97.7 | 193.9 | 2.01 | 8.0
16 | 80 | 194.0 | 392.1 | 2.02 | 16.0
32 | 80 | 399.8 | 694.1 | 2.02 | 31.8
64 | 76 | 803.8 | 1611.7 | 2.01 | 63.1
90 | 79 | 995.0 | 3675.1 | 2.01 | 88.1
```

Пік на 2–4 з'єднаннях (≈ кількість ядер), далі −30% пропускної здатності при тому самому CPU.

### 2. Інцидент: пік 140 rps (~1,2× місткості), 20 с

```
2a 'twenty replicas' | 2x30=60 | offered 2800 | ok 2800 (<=1s: 71) | p50 8898 | p99 16953 | pool-wait p99 16464 | errors {} | backends peak 60 (active 60) | DB CPU 2.00 cores | pgss mean 726.1 ms | ELD p99 12.1 ms
2b 'sixty replicas'  | 6x30=180 | offered 2800 | ok 1596 (<=1s: 38) | p50 3380 | p99 7283 | pool-wait p99 5852 | errors {"53300":1206} | backends peak 96 (active 96) | DB CPU 2.00 cores | pgss mean 1417.5 ms | ELD p99 13.0 ms
```

`diagnose.sql` одразу після 2b: один запит займає 100% часу бази, `mean_ms` 1 417,5; той самий
запит на вільній базі `Execution Time: 16.948 ms` (Seq Scan, `Rows Removed by Filter: 299996`).

### 3. Обмежити сумарну паралельність і швидко відмовляти

```
3a pools capped 6x1, no acquire timeout | 6x1=6 | offered 2800 | ok 2801 (<=1s: 213) | p50 6289 | p99 12300 | pool-wait p99 12257 | errors {} | backends peak 6 (active 6) | DB CPU 1.99 cores | pgss mean 65.9 ms | ELD p99 10.8 ms
3b pools capped 6x1, acquire 250ms    | 6x1=6 | offered 2800 | ok 1736 (<=1s: 1736) | p50 296 | p99 348 | pool-wait p99 250 | errors {"pool-timeout":1065} | backends peak 6 (active 6) | DB CPU 1.99 cores | pgss mean 68.1 ms | ELD p99 10.8 ms
3c PgBouncer tx pool=4, wait 250ms  | 6x30=180 | offered 2800 | ok 544 (<=1s: 370) | p50 711 | p99 1434 | pool-wait p99 493 | errors {"08P01":2254} | backends peak 4 (active 4) | DB CPU 0.75 cores | pgss mean 35.2 ms | ELD p99 11.2 ms
```

3c в цьому прогоні вийшов викидом (CPU бази 0,75 ядра). Повтори того самого на свіжому
середовищі, тим самим кодом (вивід скопійовано з термінала, в `out/` його немає), плюс PgBouncer
без `query_wait_timeout`:

```
3c qwt=0.25 #1 | 6x30=180 | offered 2800 | ok 1555 (<=1s: 1555) | p50 387 | p99 746 | pool-wait p99 181 | errors {"08P01":1243} | backends peak 4 (active 4) | DB CPU 1.92 cores | pgss mean 43.9 ms
3c qwt=0.25 #2 | 6x30=180 | offered 2800 | ok 1657 (<=1s: 1657) | p50 380 | p99 508 | pool-wait p99 67.6 | errors {"08P01":1144} | backends peak 4 (active 4) | DB CPU 1.98 cores | pgss mean 43.3 ms
3c qwt=0 #1    | 6x30=180 | offered 2800 | ok 2799 (<=1s: 188) | p50 3739 | p99 6325 | pool-wait p99 4778 | errors {} | backends peak 4 (active 4) | DB CPU 1.99 cores | pgss mean 36.2 ms
3c qwt=0 #2    | 6x30=180 | offered 2800 | ok 2802 (<=1s: 173) | p50 5342 | p99 13401 | pool-wait p99 11278 | errors {} | backends peak 4 (active 4) | DB CPU 1.99 cores | pgss mean 46.2 ms
```

`query_wait_timeout` у PgBouncer не повертає помилку запиту, а *закриває з'єднання клієнта*
(`closing because: query_wait_timeout` у журналі PgBouncer). Пул застосунку потім
перепідключається, і цей churn робить результат нестабільним (goodput 370, 1 469, 1 555, 1 657 у
чотирьох прогонах того дня). Відмова в застосунку (3b) стабільніша.

```
startup parameter statement_timeout=1000 via PgBouncer: refused (08P01 unsupported startup parameter: statement_timeout)
SET LOCAL statement_timeout = 200ms inside a transaction: 57014 canceling statement due to statement timeout
```

### 4. Планові воркери на тій самій базі, нормальний трафік 45 rps

```
4a no workers             | 3x10=30 | offered 900 | ok 900 (<=1s: 900) | p50 15.1 | p99 67.4 | pool-wait p99 0.3 | errors {} | backends peak 11 (active 4) | DB CPU 0.75 cores | pgss mean 16.9 ms | ELD p99 11.5 ms
4b workers, 8 jobs/pool 8 | 3x10=30 +worker 8 jobs/pool 8 | offered 900 | ok 900 (<=1s: 749) | p50 574 | p99 1582 | pool-wait p99 638 | errors {} | backends peak 42 (active 38) | DB CPU 2.00 cores | pgss mean 491.2 ms | ELD p99 12.9 ms | reports 22
4c workers, 8 jobs/pool 1 | 3x10=30 +worker 8 jobs/pool 1 | offered 900 | ok 900 (<=1s: 900) | p50 20.6 | p99 227 | pool-wait p99 21.0 | errors {} | backends peak 19 (active 10) | DB CPU 1.81 cores | pgss mean 30.9 ms | ELD p99 10.8 ms | reports 39
```

Воркер з пулом на 1 з'єднання встиг 39 звітів проти 22 з пулом на 8: обмеження паралельності
прискорило й сам воркер.

### 5. Виправити повільний запит і повторити інцидент

```
EXPLAIN після CREATE INDEX CONCURRENTLY orders_customer_id_idx: Bitmap Index Scan, Buffers: shared hit=7, Execution Time: 0.085 ms
5 'sixty replicas' + index | 6x30=180 | offered 2800 | ok 2800 (<=1s: 2800) | p50 0.6 | p99 1.1 | pool-wait p99 0.1 | errors {} | backends peak 10 (active 1) | DB CPU 0.04 cores | pgss mean 0.0 ms | ELD p99 11.0 ms
```

## Чого цей прогін не показує

- **Затримку event loop як симптом.** Репліки тут майже не роблять JS-роботи, тож `ELD p99`
  тримався 11–13 мс (роздільність монітора 10 мс) в усіх прогонах. У справжньому сервісі lag
  під таким навантаженням дають серіалізація великих відповідей, логування й тисячі
  промісів у черзі пулу; тут це не відтворено.
- **Репліки читання й кеш.** Запропоновані в нотатці як структурні виправлення, але не
  змодельовані.
- **Ретраї клієнтів.** Генератор не повторює відмовлені запити; з ретраями shedding
  потребує бюджету ретраїв (див. `examples/system-design/resilience/retry-storm.mjs`).
- Механізм падіння пропускної здатності понад 4 з'єднання (перемикання контексту, CFS-квота
  `--cpus`, кеші) не розкладено; виміряно лише сам ефект.
