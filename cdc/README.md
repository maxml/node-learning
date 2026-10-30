# Приклади CDC

Код експериментів, на які спирається нотатка `Obsidian Vault/Engineering/General/Бази даних/CDC.md`
(розділ «Перевірено»), а також доповнення в `Mongo/Практики MongoDB.md` (розділ «Події й інтеграція»).

| Файл                    | Що перевіряє                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `pg_cdc.sql`            | логічне декодування PostgreSQL 18: INSERT/UPDATE/DELETE, `REPLICA IDENTITY` DEFAULT проти FULL, відкочена й багаторядкова транзакції, незмінений TOAST, DDL, утримання WAL слотом, `max_slot_wal_keep_size`, `pgoutput` з публікацією, failover-слот |
| `mongo_cdc.js`          | change streams MongoDB 9: insert/update/delete, `updateLookup`, pre/post-images, відновлення за resume token, транзакція, drop → invalidate |
| `mongo_history_lost.js` | resume token, що випав з вікна oplog → `ChangeStreamHistoryLost`                                                    |

## Запуск

```bash
# PostgreSQL 18 з wal_level=logical (порт 55440: у прогоні 55432 був зайнятий іншим контейнером)
docker run -d --rm --name cdc-pg -p 127.0.0.1:55440:5432 -e POSTGRES_PASSWORD=pg postgres:18 -c wal_level=logical
sleep 5
docker exec -i cdc-pg psql -U postgres -v ON_ERROR_STOP=1 < pg_cdc.sql

# MongoDB 9: replica set з одного вузла (порт 27041)
docker run -d --rm --name cdc-mongo -p 127.0.0.1:27041:27041 mongo:9 --replSet rs0 --bind_ip_all --port 27041
sleep 7
docker exec cdc-mongo mongosh --quiet --port 27041 --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27041"}]})'
npm install
MONGO_URL='mongodb://localhost:27041/?replicaSet=rs0' npm run mongo

# у тому самому контейнері: другий replica set з oplog 1 МБ і standalone mongod
docker exec -d cdc-mongo bash -c 'mkdir -p /small /sa && mongod --replSet rs1 --port 27042 --dbpath /small --oplogSize 1 --bind_ip_all --fork --logpath /small.log && mongod --port 27050 --dbpath /sa --bind_ip_all --fork --logpath /sa.log'
sleep 6
docker exec cdc-mongo mongosh --quiet --port 27042 --eval 'rs.initiate({_id:"rs1",members:[{_id:0,host:"localhost:27042"}]})'
IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' cdc-mongo)
MONGO_URL="mongodb://$IP:27042/?directConnection=true" npm run history-lost
docker exec cdc-mongo mongosh --quiet --port 27050 --eval 'try { db.getSiblingDB("t").c.watch().tryNext() } catch (e) { print(e.codeName, e.code, e.message) }'

docker rm -f cdc-pg cdc-mongo
```

## Результати прогону 2026-10-29

PostgreSQL 18.6 (образ `postgres:18`), MongoDB 9.0.4, драйвер `mongodb` 7.7.0, Node v24.14.1.
Значення xid і LSN від прогону до прогону інші; стабільна форма подій.

### PostgreSQL (`test_decoding`)

Типовий `REPLICA IDENTITY` (первинний ключ):

```
BEGIN 755
table public.items: INSERT: id[integer]:3 name[text]:'plum' qty[integer]:7 note[text]:'z'
COMMIT 755
table public.items: UPDATE: id[integer]:1 name[text]:'apple' qty[integer]:11 note[text]:'x'                  -- ключ не змінювався: старого рядка немає зовсім
table public.items: UPDATE: old-key: id[integer]:2 new-tuple: id[integer]:10 name[text]:'pear' qty[integer]:5 note[text]:'y'   -- ключ змінено: лише старий ключ
table public.items: DELETE: id[integer]:3                                                                     -- лише ключ
```

`REPLICA IDENTITY FULL`:

```
table public.items: UPDATE: old-key: id[integer]:1 name[text]:'apple' qty[integer]:11 note[text]:'x' new-tuple: id[integer]:1 name[text]:'apple' qty[integer]:12 note[text]:'x'
table public.items: DELETE: id[integer]:10 name[text]:'pear' qty[integer]:5 note[text]:'y'
```

Відкочена транзакція (вставка `id = 100`) відсутня; зафіксована транзакція з двох INSERT і двох
UPDATE прийшла одним блоком. Порожні блоки `BEGIN`/`COMMIT` без рядків це транзакції з DDL
(`ALTER TABLE`):

```
BEGIN 762
COMMIT 762
BEGIN 764
table public.items: INSERT: id[integer]:20 ...
table public.items: INSERT: id[integer]:21 ...
table public.items: UPDATE: id[integer]:20 ... qty[integer]:101 ...
table public.items: UPDATE: id[integer]:21 ... qty[integer]:102 ...
COMMIT 764
```

Незмінений TOAST-стовпець (10 000 символів, `STORAGE EXTERNAL`) в UPDATE не передано:

```
table public.items: UPDATE: id[integer]:30 name[text]:'big' qty[integer]:2 note[text]:unchanged-toast-datum
```

DDL `ALTER TABLE items ADD COLUMN color text` дав порожню транзакцію, а новий стовпець
з'явився лише в наступному INSERT (`... note[text]:null color[text]:'green'`).

Утримання WAL слотом, який ніхто не читає:

| Момент                                            | `restart_lsn` | утримано (`pg_wal_lsn_diff`) | `wal_status` |
| ------------------------------------------------- | ------------- | ---------------------------- | ------------ |
| до навантаження                                   | 0/1796FC0     | 32 kB                        | reserved     |
| після 200 000 вставок + `CHECKPOINT`              | 0/1796FC0     | 120 MB                       | reserved     |
| після `pg_replication_slot_advance` + `CHECKPOINT` | 0/9000048     | 6336 bytes                   | —            |

Кількість файлів у `pg_wal` після просування слота лишилась 9 (144 MB): сервер не видаляє
сегменти одразу, а перевикористовує їх. Мірило утримання тут `restart_lsn`, а не розмір теки.

`max_slot_wal_keep_size = 64MB`, далі 400 000 вставок і `CHECKPOINT`:

```
 cdc_slot  |             | lost       | wal_removed
ERROR:  can no longer access replication slot "cdc_slot"
DETAIL:  This replication slot has been invalidated due to "wal_removed".
```

`pgoutput` з публікацією `FOR TABLE items`: вставки в `items` і в таблицю поза публікацією
дали повідомлення `B R I C` (Begin, Relation, Insert, Commit), тобто лише одну вставку.
Слот із `failover = true` створюється на 18.6 (`failover = t`, `synced = f` на primary).
Типові значення: `max_slot_wal_keep_size = -1`, `idle_replication_slot_timeout = 0`.

`REPLICA IDENTITY NOTHING` для таблиці в публікації, що публікує UPDATE:

```
ERROR:  cannot update table "items" because it does not have a replica identity and publishes updates
```

### MongoDB (`mongo_cdc.js`)

```
== 1. insert / update / delete (default: no fullDocument for update)
{"op":"insert","key":{"_id":1},"fullDocument":{"_id":1,"name":"apple","qty":10}}
{"op":"update","key":{"_id":1},"updated":{"qty":11}}
{"op":"delete","key":{"_id":1}}

== 2. updateLookup returns the CURRENT document, not the state at update time
{"op":"update","key":{"_id":2},"updated":{"qty":2},"fullDocument":{"_id":2,"name":"pear","qty":4}}
{"op":"update","key":{"_id":2},"updated":{"qty":3},"fullDocument":{"_id":2,"name":"pear","qty":4}}
{"op":"update","key":{"_id":2},"updated":{"qty":4},"fullDocument":{"_id":2,"name":"pear","qty":4}}
-- same, but the document is deleted before the consumer reads the updates
{"op":"update","key":{"_id":2},"updated":{"qty":5},"fullDocument":null}
{"op":"delete","key":{"_id":2}}

== 3. pre- and post-images (changeStreamPreAndPostImages) give the state at the time of the change
{"op":"update","key":{"_id":3},"updated":{"qty":2},"fullDocument":{"_id":3,"name":"plum","qty":2},"before":{"_id":3,"name":"plum","qty":1}}
{"op":"update","key":{"_id":3},"updated":{"qty":3},"fullDocument":{"_id":3,"name":"plum","qty":3},"before":{"_id":3,"name":"plum","qty":2}}
{"op":"delete","key":{"_id":3},"before":{"_id":3,"name":"plum","qty":3}}

== 4. resume after consumer restart (resumeAfter = last processed token)
processed before "crash": [ 10, 11 ]
after resume: [ 12, 13, 14 ]
nothing else pending: true

== 5. multi-document transaction: one event per operation, shared lsid/txnNumber, no rolled-back writes
{"op":"insert","key":{"_id":20},"fullDocument":{"_id":20},"txnNumber":14} lsid? true
{"op":"update","key":{"_id":10},"updated":{"moved":true},"txnNumber":14} lsid? true
ghost seen: false

== 6. drop collection -> drop + invalidate; stream is closed
drop
invalidate
stream closed: true
```

### MongoDB (`mongo_history_lost.js`, oplog 1 МБ)

Три прогони поспіль дали той самий результат (числа першого):

```
oplog maxSize MB: 1
saved token of last-processed
written while down: ~53 MB in 57 s; event clusterTime t = 1793275188 | oldest oplog entry t = 1793275243 | event still in oplog window? false
resume failed: ChangeStreamHistoryLost 286 | Executor error during aggregate command on namespace: cdc.hl :: caused by :: Resume of change stream was not possible, as the resume point may no longer be in t
```

Обрізання oplog асинхронне: при максимумі 1 МБ найстаріший запис зсувався стрибками,
приблизно раз на хвилину, а не одразу після перевищення розміру. Попередня версія скрипта
обмежувала цикл обсягом (до 240 МБ, з `fsync` і без) і в трьох прогонах із п'яти не
дочекалась обрізання. Тому цикл тепер обмежено часом (до 240 с). Це спостереження, а не документована
гарантія: вікно oplog у байтах лише орієнтир, а не точна межа.

Change stream на standalone `mongod`:

```
Location40573 40573 The $changeStream stage is only supported on replica sets or mongos
```
