# Патерни й антипатерни схеми MongoDB: експерименти

Основа для розділів «Наближені значення», «Еволюція схеми й версіонування» та
«Антипатерни» в `Obsidian Vault/Engineering/General/Mongo/Моделювання даних у MongoDB.md`.
Усе запускається в Docker-образі `mongo:9` (MongoDB 9.0.4), окремий контейнер і порт, щоб не
заважати іншим контейнерам MongoDB.

| Файл                    | Що перевіряє                                                                 |
| ----------------------- | ---------------------------------------------------------------------------- |
| `case_insensitive.js`   | collation-індекс проти `$regex /i`, strength 1 і 2, покриття, унікальний регістронезалежний індекс, типовий collation колекції |
| `schema_versioning.js`  | `oneOf` на дві версії, `strict` / `moderate`, ледача й пакетна міграції, `validationLevel: "constraint"` (9.0) |
| `approximation.js`      | скільки записів економить approximation-патерн і яка похибка залежно від кількості подій |
| `index_stats.js`        | чого не видно в `$indexStats` (unique, TTL), що робить `hideIndex`, чи замінює `{day, time}` індекс `{time}` |
| `many_collections.js` + `run_many.sh` | ціна десяти тисяч колекцій: файли, дескриптори, data handles, вставки, рестарт; зависання при низькому `ulimit -n` |

## Запуск

```bash
cd examples/mongo/schema-patterns
docker run -d --rm --name schpat-mongo -p 127.0.0.1:27067:27017 -v "$PWD":/work:ro mongo:9
sleep 6
docker exec schpat-mongo mongosh --quiet /work/case_insensitive.js
docker exec schpat-mongo mongosh --quiet /work/schema_versioning.js
docker exec schpat-mongo mongosh --quiet /work/approximation.js
docker exec schpat-mongo mongosh --quiet /work/index_stats.js
docker rm -f schpat-mongo

./run_many.sh 10000                 # окремий контейнер schpat-many (порт 27068), nofile 64000, ~30 хв
NOFILE=1024 PHASE_TIMEOUT=120 ./run_many.sh 2000   # відтворює зависання при soft-ліміті 1024
```

## Результати прогону 2026-10-30 (MongoDB 9.0.4)

### `case_insensitive.js`

200 005 документів, 20 000 різних імен у трьох варіантах регістру плюс `ann`, `Ann`, `ANN`,
`Anna`, `Ánn`. Індекси `name_bin` (бінарний), `name_ci2` (`en`, strength 2), `name_ci1`
(`en`, strength 1). Час це медіана з п'яти прогонів.

```
A. рівність без collation {name:'ann'}
   nReturned=1 keys=1 docs=1 median=2ms plan=FETCH <- IXSCAN(name_bin)
B. $regex /^ann$/i без collation
   nReturned=3 keys=200005 docs=3 median=272ms plan=FETCH <- IXSCAN(name_bin)
C. $regex /^ann$/i, hint на name_bin
   nReturned=3 keys=200005 docs=3 median=263ms plan=FETCH <- IXSCAN(name_bin)
D. рівність + collation {en, strength 2}
   nReturned=3 keys=3 docs=3 median=2ms plan=FETCH <- IXSCAN(name_ci2)
E. рівність + collation {en, strength 1}
   nReturned=4 keys=4 docs=4 median=2ms plan=FETCH <- IXSCAN(name_ci1)
F. рівність + collation {en} (strength 3 за замовчуванням)
   nReturned=1 keys=0 docs=200005 median=90ms plan=COLLSCAN
G. $regex /^ann$/i + collation strength 2
   nReturned=3 keys=200005 docs=3 median=280ms plan=FETCH <- IXSCAN(name_bin)
H. $regex /^ann/ (чутливий до регістру префікс)
   nReturned=1 keys=2 docs=1 median=2ms plan=FETCH <- IXSCAN(name_bin)
I. $regex /^ann/i (префікс без регістру)
   nReturned=4 keys=200005 docs=4 median=275ms plan=FETCH <- IXSCAN(name_bin)
J. покривна проєкція {_id:0,name:1} + collation 2
   nReturned=3 keys=3 docs=3 median=2ms plan=PROJECTION_SIMPLE <- FETCH <- IXSCAN(name_ci2)
K. покривна проєкція {_id:0,name:1} без collation
   nReturned=1 keys=1 docs=0 median=2ms plan=PROJECTION_COVERED <- IXSCAN(name_bin)

indexSizes: name_bin=2097152 name_ci2=2498560 name_ci1=2064384

unique ci: другий insert відхилено, code=11000
default collation: індекс first_1 успадкував collation strength=2
default collation: find({first:'betsy'}) -> 3
default collation: той самий запит з .collation({locale:'en'}) -> 1
collMod collation: error code=40415 IDLUnknownField: BSON field 'collMod.collation' is an unknown field.
```

Висновки: `/i` переглядає весь індекс (200 005 ключів) навіть тоді, коли в запиті є
collation (G): `$regex` collation не враховує. Рівність із тим самим collation, що в індексі,
читає 3 ключі. Strength 1 ігнорує ще й діакритику (`Ánn` знайдено, 4 проти 3). Запит з
collation, що не збігається з індексом (F, strength 3 за замовчуванням), робить COLLSCAN.
Collation-індекс не покриває запит (J: FETCH), бінарний покриває (K: `docs=0`). Розміри
індексів на 200 тис. коротких рядків майже однакові, тож висновків про розмір не робимо.

### `schema_versioning.js`

```
1. additionalProperties:false, _id не описано, insert {name}: MongoServerError (code 121)
2a. insert v2: OK
2b. insert v1 без schemaVersion: OK
2c. insert з полем-опечаткою: MongoServerError (code 121)
3a. oneOf, нечіткі схеми, insert {name, schemaVersion:2}: MongoServerError (code 121)
3b. те саме з anyOf: OK
4a. strict, валідатор лише v2, $set name на v1-документі: MongoServerError (code 121)
4b. moderate, той самий $set: OK
4c. moderate, insert v1: MongoServerError (code 121)
5. після ледачої міграції _id 1: v1 лишилось 3
6a. prepareConstraintValidationLevel: OK
6b. validationLevel constraint при наявних v1: Location12370902 (code 12370902)
7. пакетна міграція: modified=3
7b. validationLevel constraint після міграції: OK
7c. insert v1 при constraint: MongoServerError (code 121)
7d. bypassDocumentValidation при constraint: n=0 bypassDocumentValidation is not permitted with 'constraint' validationLevel
7e. зміна validator при constraint: BadValue (code 2)
8. невалідні документи через $nor + $jsonSchema: 1
```

Окремо перевірено: `collMod … validationLevel: "constraint"` без попереднього
`prepareConstraintValidationLevel: true` на валідній колекції відмовляє з кодом 2 («Cannot
upgrade validationLevel to 'constraint' without first setting
prepareConstraintValidationLevel to true»). Повідомлення 12370902 називає `_id` першого
порушника й підказує запит `find({"$nor": [{ $jsonSchema: … }]})`.

### `approximation.js` (K = 10, 200 повторів на кожне n)

```
DB: 100000 подій -> 9906 записів замість 100000, лічильник 99060 (похибка -0.94%)
n=20: p95 відносної похибки 100.0% (теорія σ/n = 67.1%)
n=100: p95 відносної похибки 60.0% (теорія σ/n = 30.0%)
n=1000: p95 відносної похибки 17.0% (теорія σ/n = 9.5%)
n=10000: p95 відносної похибки 6.1% (теорія σ/n = 3.0%)
n=100000: p95 відносної похибки 1.9% (теорія σ/n = 0.9%)
```

Числа випадкові й від прогону до прогону трохи змінюються; p95 близько двох σ, як і
очікується.

### `run_many.sh 10000` (`--ulimit nofile=64000`)

Прогін зроблено версією скрипту без фази «рестарт порожньої бази» (її додано пізніше,
базове число взято з прогону з `NOFILE=1024` нижче).

```
server 9.0.4
Max open files            64000                64000                files
== порожня база
{"wtFiles": 11, "openFds": 32, "dbpathMB": 201}
{"phase":"stats","collections":0,"indexes":0,"dhandlesActive":21,"checkpointMostRecentMs":0,"checkpointMaxMs":0,"cacheBytes":42149,"residentMB":163}
== створення 10000 колекцій
{"phase":"create","collections":10000,"indexes":20000,"ms":1293547}
{"wtFiles": 30011, "openFds": 7972, "dbpathMB": 924}
{"phase":"stats","collections":10000,"indexes":20000,"dhandlesActive":32462,"checkpointMostRecentMs":7684,"checkpointMaxMs":19169,"cacheBytes":155662225,"residentMB":1720}
== вставки
{"phase":"write","inserts":20000,"oneCollectionBatchedMs":485,"oneCollectionInsertOneMs":12630,"spreadOverNInsertOneMs":38294}
== рестарт
{"startupMs": 64783}
{"restartTotalMs": 75705}
{"wtFiles": 30014, "openFds": 30032, "dbpathMB": 1422}
{"phase":"stats","collections":10000,"indexes":20000,"dhandlesActive":60023,"checkpointMostRecentMs":35915,"checkpointMaxMs":35915,"cacheBytes":213005139,"residentMB":3462}
== читання з кожної колекції
{"phase":"touch","ms":7603,"dhandlesActive":40117,"checkpointMostRecentMs":35915,"checkpointMaxMs":35915,"cacheBytes":213005139,"residentMB":3470}
{"wtFiles": 30014, "openFds": 30032, "dbpathMB": 1413}
{"phase":"stats","collections":10000,"indexes":20000,"dhandlesActive":54634,"checkpointMostRecentMs":35915,"checkpointMaxMs":35915,"cacheBytes":213174995,"residentMB":3556}
```

Темп створення падав приблизно від 17 до 6–7 колекцій на секунду (рахував файли
`collection-*.wt` під час прогону). Фази вставок ідуть послідовно в одному процесі:
пакетна вставка в одну колекцію, потім `insertOne` по 10 000 колекціях, потім `insertOne`
в одну колекцію. Порядок і прогрів кешу могли вплинути на числа, тож дивись на напрям
(приблизно втричі повільніше), а не на точний множник. Один прогін, одна машина.

### `NOFILE=1024 PHASE_TIMEOUT=120 ./run_many.sh 2000`

```
Max open files            1024                 1024                 files
== порожня база
{"wtFiles": 11, "openFds": 32, "dbpathMB": 201}
== рестарт порожньої бази
{"startupMs": 1220}
{"restartTotalMs": 1725}
== створення 2000 колекцій
{"collectionFilesAtExit": 488}
{"t":{"$date":"2026-10-30T11:07:19.072+00:00"},"s":"W", ... "Failed to collect mount stats" ... "Too many open files" ...
exit=124
```

Клієнт зависає без помилки (фазу обриває `timeout`, код 124), а `mongod` пише в лог
`Too many open files` і перестає приймати нові з'єднання (`Error accepting new connection
… Too many open files`). Перший прогін з типовим soft-лімітом контейнера (1024 soft /
524288 hard) зупинився так само, на 489 колекціях.

### `index_stats.js`

Колекція з індексами `email_1` (unique), `exp_1` (TTL 0 с), `day_1_time_1`, `time_1`,
1000 документів:

```
1. unique: дублікат відхилено, code=11000
2. ops після 5 запитів за time: {"day_1_time_1":0,"exp_1":0,"_id_":0,"time_1":5,"email_1":0}
3. ops після hideIndex(time_1): time_1=0
4. find({time}) при прихованому time_1: COLLSCAN, docsExamined=1000
5. той самий запит з hint на {day, time}: keysExamined=1000 з 1000
6. прихований unique: дублікат відхилено, code=11000
7. документів після TTL: 0; ops: {"day_1_time_1":0,"time_1":0,"exp_1":0,"email_1":0,"_id_":0}
```

Унікальний індекс відхилив дублікат, TTL видалив усі 1000 документів, але `$indexStats`
для обох показує `ops: 0`: їхня робота не рахується як використання. Складений
`{day, time}` не замінює `{time}` (приклад на сторінці мануалу «Remove Unnecessary Indexes»
стверджує протилежне). `hideIndex` обнуляє лічильник, а прихований унікальний індекс далі
перевіряє унікальність.
