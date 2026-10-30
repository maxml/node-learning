# Агрегація MongoDB: експерименти

Основа для «перевірено» в нотатці `Obsidian Vault/Engineering/General/Mongo/Просунута агрегація MongoDB.md`.

| Файл                | Що це                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------- |
| `pipelines.js`      | конвеєри як чисті функції (масиви без `$unwind`, `$merge` replace і дельта, вікна)      |
| `agg.js`            | вимірювання A–E: масиви, `$lookup` з індексом і без, `$merge`, оптимізатор у `explain`, вікна/`$graphLookup`/`$densify`+`$fill` |
| `pipelines.test.js` | тести на властивості конвеєрів (`node --test`) на крихітних фікстурах у справжньому `mongod` |

Залежність (драйвер `mongodb` 7.7.0) береться з `examples/mongo/node_modules` (`npm install` у `examples/mongo`).

## Запуск

Окремий контейнер і порт 27047, щоб не конфліктувати з іншими експериментами:

```bash
docker run -d --rm --name aggkb-mongo -p 127.0.0.1:27047:27017 mongo:9
cd examples/mongo && npm install
node aggregation/agg.js            # усе (~9 хв, з них ~5 хв це $lookup без індексу)
node aggregation/agg.js AD         # лише частини A і D
node --test aggregation/pipelines.test.js
docker rm -f aggkb-mongo
```

`MONGO_URI` перевизначає адресу, `N_ORDERS` розмір колекції (типово 200 000).

## Результат прогону 2026-10-30 (MongoDB 9.0.4, драйвер 7.7.0, Node v24.14.1)

```
MongoDB 9.0.4, Node v24.14.1, N_ORDERS=200000
seed: 7042 мс

=== A. $filter/$map проти $unwind+$match+$group (200000 замовлень x 10 позицій, ціна > 90) ===
вирази        медіана 2988 мс; результат {"_id":null,"n":200000,"s":34224521,"k":180246}
   стадії: ["$cursor","$set","$set","$group"]
   group/unwind у плані: [{"stage":"$group","usedDisk":false,"spills":0,"spilledDataStorageSize":0,"peakTrackedMemBytes":616,"nReturned":1}]
unwind+group  медіана 3270 мс; результат {"_id":null,"n":121977,"s":34224521,"k":180246}
   стадії: ["$cursor","$unwind","$match","$group","$group"]
   group/unwind у плані: [{"stage":"$unwind","nReturned":2000000},{"stage":"$group","usedDisk":false,"spills":0,"spilledDataStorageSize":0,"peakTrackedMemBytes":72710924,"nReturned":121977},{"stage":"$group",...,"peakTrackedMemBytes":616,"nReturned":1}]

=== A. $filter/$map проти $unwind+$match+$group (200000 замовлень x 10 позицій, ціна > 40) ===
вирази        медіана 3774 мс; результат {"_id":null,"n":200000,"s":165195969,"k":1179886}
   стадії: ["$cursor","$set","$set","$group"]
unwind+group  медіана 6922 мс; результат {"_id":null,"n":199975,"s":165195969,"k":1179886}
   стадії: ["$cursor","$unwind","$match","$group","$group"]
   group/unwind у плані: [{"stage":"$unwind","nReturned":2000000},{"stage":"$group","usedDisk":true,"spills":3,"spilledDataStorageSize":15242898,"peakTrackedMemBytes":104857672,"nReturned":199975},...]

=== B. $lookup: 1000 замовлень -> payments (100k), foreignField = orderId ===
індекс=ні  localField/foreignField   47887 мс  n=1000  план: [{"stage":"EQ_LOOKUP","strategy":"NestedLoopJoin"},{"stage":"$lookup"}]
індекс=ні  let + $expr              150331 мс  n=1000  план: [{"stage":"$lookup","totalDocsExamined":100000000,"totalKeysExamined":0},{"stage":"$lookup"}]
індекс=так localField/foreignField      32 мс  n=1000  план: [{"stage":"EQ_LOOKUP","strategy":"IndexedLoopJoin"},{"stage":"$lookup"}]
індекс=так let + $expr                 182 мс  n=1000  план: [{"stage":"$lookup","totalDocsExamined":1000,"totalKeysExamined":1000},{"stage":"$lookup"}]

=== C. $merge: інкрементальне оновлення підсумків ===
replace, перший прогін       01:40/4 02:80/4 03:120/4 04:160/4 05:200/4
replace, повтор              01:40/4 02:80/4 03:120/4 04:160/4 05:200/4
delta, перший прогін         01:40/4 02:80/4 03:120/4 04:160/4 05:200/4
delta, повтор (ретрай)       01:80/8 02:160/8 03:240/8 04:320/8 05:400/8
replace після видалення дня 05 01:40/4 02:80/4 03:120/4 04:160/4 05:200/4
$merge on: day без унікального індексу: помилка 51183 Location51183

=== D. Оптимізатор у explain ===
D1 $sort -> $match -> $limit
   $cursor/план: ["LIMIT","IXSCAN(status_1_amount_-1)"]
   далі: []
D2 $match по обчисленому полю (dollars = cents/100)
   $cursor/план: ["COLLSCAN"]
   далі: ["$set","$match"]
D2b той самий фільтр, переписаний на сире поле
   $cursor/план: ["IXSCAN(cents_1)"]
   далі: ["$set"]
D3 $lookup -> $unwind -> $match
   $cursor/план: ["IXSCAN(_id_)"]
   далі: ["$lookup(unwinding={\"preserveNullAndEmptyArrays\":false}, pipeline=[{\"$match\":{\"sum\":{\"$gt\":500}}}])"]
D4 $group -> $sort -> $limit
   $cursor/план: ["GROUP","COLLSCAN"]
   далі: ["$sort(limit=3)"]
D5 $lookup, потім $set+$match по полю вхідного документа (правило 9.0)
   $cursor/план: ["EQ_LOOKUP","MATCH","PROJECTION_DEFAULT","COLLSCAN","IXSCAN(orderId_1)"]
   далі: []

=== E. $setWindowFields, $graphLookup, $densify/$fill ===
вікна: A1: run=10 prev=null avg3=10 rank=4 | A2: run=40 prev=10 avg3=20 rank=1 | A3: run=60 prev=30 avg3=20 rank=3 | A4: run=90 prev=20 avg3=26.7 rank=1 | B1: run=5 prev=null avg3=5 rank=2 | B2: run=12 prev=5 avg3=6 rank=1
цикл a->b->c->a: path=["a@2","b@0","c@1"]
$graphLookup ланцюг 3000 предків у колекції 20k: без індексу на connectToField 29451 мс (n=3000), з індексом 658 мс (n=3000); maxDepth: 9 -> n=10
densify+fill(linear): 0h=10 1h=20 2h=30 3h=40 4h=50 5h=60
```

(Рядки A скорочено: прибрано повтор фінального `$group` з `peakTrackedMemBytes: 616`.)

Тести: `node --test aggregation/pipelines.test.js` дав 5/5 pass. Кожен тест перевірено мутацією
(конвеєр підмінено через `--require`): вирази замінено на `$unwind`+`$group`, `replace` замінено
на інкремент, `$rank` замінено на `$denseRank`. Щоразу падав рівно відповідний тест.

Окремо в `mongosh` перевірено: `$lookup` без індексу в колекцію на 5000 документів дає
`strategy: "HashJoin"`; пороги `internalQueryCollectionMaxNoOfDocumentsToChooseHashJoin = 10000`,
`internalQueryCollectionMaxDataSizeBytesToChooseHashJoin = 104857600`.

## Що стабільне, а що ні

Час залежить від машини й від прогону. Ось числа першого повного прогону того самого дня:
A (>90) 2,7 с проти 3,0 с; B 40,4 с / 131,8 с / 15 мс / 125 мс; `$graphLookup` 46,6 с проти 0,84 с.
Окремий прогін `AD` дав A (>90) 3,3 / 4,2 с і A (>40) 3,9 / 8,1 с.
Стабільні висновки такі. Різниця пам'яті в A від прогону не залежить, і spill з'являється лише при порозі 40.
Індекс на `foreignField` і `connectToField` дає виграш на два-три порядки. Результати C, D, E
детерміновані.
