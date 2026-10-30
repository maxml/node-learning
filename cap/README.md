# CAP: розрив мережі на PostgreSQL і MongoDB

Код експериментів для розділу «Перевірено експериментом» у
`Obsidian Vault/Engineering/General/Бази даних/CAP-теорема.md` і для розділу «CAP і PACELC» у
`Mongo/Транзакції та узгодженість у MongoDB.md`. Розрив мережі імітує
`docker network disconnect` на окремій мережі `cap-net`; клієнти підключаються до кожного вузла
напряму через `docker exec`, тож обидві сторони розриву видно окремо.

## Запуск

```bash
bash pg_exp.sh async     # PostgreSQL 18: primary + асинхронна репліка
bash pg_exp.sh sync      # те саме з synchronous_standby_names='*'
bash mongo_exp.sh        # MongoDB 9: replica set з трьох контейнерів, ізолюємо primary
bash mongo_exp.sh mongo:8   # інший образ
```

Скрипти самі піднімають і видаляють контейнери й мережу. `pg_hba.conf` (trust для всіх) лише для
локального експерименту.

## Результати 2026-10-29

PostgreSQL 18.6, асинхронна репліка:

- `INSERT` на primary під час розриву одразу повернув `INSERT 0 1`;
- ізольована репліка читає лише рядок 1, запис на ній: `cannot execute INSERT in a read-only transaction`;
- після `docker kill` primary і `pg_promote()` новий primary має лише рядок 1: підтверджений запис втрачено.

PostgreSQL 18.6, синхронна репліка (вивід сесії, що чекала, з `pg_sync_insert.out`):

```
SET
INSERT 0 1
WARNING:  canceling wait for synchronous replication due to user request
DETAIL:  The transaction has already committed locally, but might not have been replicated to the standby.
psql exit=0
```

`INSERT` висів у `wait_event=SyncRep` (12 с до скасування; `statement_timeout=5s` його не перервав),
інші сесії рядка не бачили. Після `pg_cancel_backend` рядок видно на primary, але не на репліці, і після
failover його немає.

MongoDB 9.0.4 (`mongo_exp.sh`):

```
[13:54:28.325] PARTITION: disconnect cap-m1 (primary) from the network
--- minority side (cap-m1), right after the cut
[13:54:28.433] m1 hello: isWritablePrimary=true
[13:54:29.308] m1 update v=2 w:1: {"acknowledged":true,...,"modifiedCount":1,...}
[13:54:30.535] m1 read readConcern local: {"_id":"k","v":2}
[13:54:31.673] m1 read readConcern majority: [{"_id":"k","v":1}]
[13:54:32.755] m1 read readConcern linearizable (maxTimeMS 4000): MaxTimeMSExpired
[13:54:37.918] m1 update v=99 w:majority wtimeout 3000: NotWritablePrimary
--- majority side (cap-m2, cap-m3)
[13:54:40.732] new primary cap-m2 elected 12 s after the cut
[13:54:40.735] cap-m2 update v=3 w:majority: {"acknowledged":true,...,"modifiedCount":1,...}
[13:54:42.224] cap-m2 read linearizable: [{"_id":"k","v":3}]
--- minority side again
[13:54:44.887] m1 stepped down 16 s after the cut: isWritablePrimary=false secondary=true
[13:54:45.674] m1 write w:1: NotWritablePrimary
[13:54:46.320] m1 read secondaryPreferred local: {"_id":"k","v":2}
[13:54:47.074] m1 read secondaryPreferred majority: [{"_id":"k","v":1}]
[13:54:48.428] (same instant) majority side value: {"_id":"k","v":3}
--- heal
[13:54:51.939] m1 after heal: {"_id":"k","v":3}
[13:54:52.731] m1 rollback files: 2
```

Ще три прогони (двічі 9.0.4, один 8.3.13) дали ті самі висновки; час виборів 11–13 с. На 8.3.13 значення
невдалого `w:"majority"`-запису (v:99) потім було видно через `local` на ізольованому вузлі: запис
застосовано локально, хоча клієнт отримав помилку. Рядок `readPreference primary` з ранньої версії
скрипта прибрано: пряме підключення mongosh послаблює read preference, тож він нічого не доводив.
