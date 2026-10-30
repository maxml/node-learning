# Приклади MongoDB

Код експериментів, на які спираються нотатки `Obsidian Vault/Engineering/General/Mongo/`.
Експеримент з тюнінгу (профайлер, `$queryStats`, plan cache, `$lookup`, spill) лежить
окремо в [`tuning/`](tuning/README.md).

- `pool.js` (нижче): пул з'єднань драйвера, для `Практики MongoDB.md`.
- [`cluster-diagnostics/`](cluster-diagnostics/README.md): лаг реплікації, flow control,
  вибори, initial sync на трьох контейнерах, для `Діагностика кластера MongoDB.md`.
- [`aggregation/`](aggregation/README.md): масиви виразами проти `$unwind`, стратегії
  `$lookup`, `$merge`, оптимізатор, віконні функції, для `Просунута агрегація MongoDB.md`.
- [`schema-patterns/`](schema-patterns/README.md): collation проти регекспа, версіонування
  схеми й валідатор, approximation, багато колекцій, для `Моделювання даних у MongoDB.md`.
- [`search/`](search/README.md): `$search`, `$vectorSearch`, гібридний пошук і затримка
  індексу, для `Atlas Search і Vector Search.md`.
- [`aws/`](aws/README.md): з'єднання драйвера в режимі Lambda і `serverSelectionTimeoutMS`,
  для `MongoDB в AWS.md`.
- [`testing/`](testing/README.md): гонка без унікального індексу, транзакції на standalone,
  guard тенанта, Testcontainers проти mongodb-memory-server, для `Практики MongoDB.md` і
  `Мультитенантність у MongoDB.md`.

## `pool.js`: пул з'єднань драйвера

Основа для розділу «Як влаштований пул» у `Практики MongoDB.md`. Перевіряє три речі:

1. Операції однієї транзакції йдуть різними з'єднаннями пулу, і транзакція лишається
   цілою, бо живе в сесії (`lsid` + `txnNumber`), а не в з'єднанні.
2. Пул відкривається окремо до кожного вузла replica set.
3. Що відбувається при вичерпаному пулі з типовими налаштуваннями, з `waitQueueTimeoutMS`
   і з `timeoutMS`.

Запуск (replica set з трьох вузлів в одному контейнері, порти 27021–27023):

```bash
docker run -d --rm --name pooltest --network host mongo:9 bash -c 'mkdir -p /d1 /d2 /d3; for p in 1 2 3; do mongod --replSet rs0 --port 2702$p --dbpath /d$p --bind_ip 127.0.0.1 --fork --logpath /d$p.log; done; tail -f /dev/null'
sleep 8
docker exec pooltest mongosh --quiet --port 27021 --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27021",priority:2},{_id:1,host:"127.0.0.1:27022"},{_id:2,host:"127.0.0.1:27023"}]})'
# зачекати ~10 с на вибори primary
npm install
npm run pool
docker rm -f pooltest
```

Результат прогону 2026-10-29 (MongoDB 9.0.4, драйвер 7.7.0, Node v24.14.1):

```
1) транзакцій (txnNumber, включно з повторами): 134; з них на >1 з'єднанні: 111; commits=40, aborts=0; сума балансів=2000 (очікується 2000)
2) з'єднань пулу на вузол (maxPoolSize 10): { '127.0.0.1:27021': 8, '127.0.0.1:27023': 6, '127.0.0.1:27022': 6 }
   на primary з боку сервера ($currentOp, appName pooltest): [{"_id":"pooltest","n":9}]
   serverStatus.connections на primary: {"current":26,"available":383}
3) типові налаштування: друга операція чекала 1904 мс і виконалась
3) waitQueueTimeoutMS=300: через 301 мс MongoWaitQueueTimeoutError: Timed out while checking out a connection from connection pool
3) timeoutMS=300: через 301 мс MongoOperationTimeoutError: Timed out during connection checkout
```

Числа в рядках 1 і 2 від прогону до прогону трохи різняться: вони залежать від того, хто
першим забрав з'єднання й скільки було write conflict. Стабільні висновки: транзакції
проходять через кілька з'єднань і всі комітяться; пул існує на кожен вузол; без таймаутів
операція чекає в черзі без помилки.
