# MongoDB Search і Vector Search на `atlas-local`

Експеримент для нотатки `Obsidian Vault/Engineering/General/Mongo/Atlas Search і Vector Search.md`.

Образ `mongodb/mongodb-atlas-local` це один контейнер з replica set з одного вузла, у якому
поряд працюють `mongod` і `mongot` (Lucene-процес пошуку). Документація прямо називає його
середовищем лише для розробки й тестів, не для продакшену. Тому числа нижче описують
поведінку механізму, а не латентність Atlas.

## Запуск

```bash
docker pull mongodb/mongodb-atlas-local:latest   # ~1.3 ГБ
./run.sh                                          # контейнер kbsearch-atlaslocal, без портів на хості
KEEP_IMAGE=0 ./run.sh                             # те саме і видалити образ після прогону
```

`run.sh` чекає на `healthy`, запускає `search.js` у `mongosh` всередині контейнера й видаляє
контейнер. `search.js` створює колекцію з 8 документів, search-індекс (`title` з
`lucene.english`, `category` як `token`, `year` як `number`) і vector-індекс (4 виміри, cosine,
`category` як `filter`), чекає, доки обидва стануть `queryable`, і друкує по рядку на перевірку.

## Результат (2026-10-30)

Образ `mongodb/mongodb-atlas-local:latest` від 2026-10-29: MongoDB 8.3.13, `mongot` 1.70.6.
Два прогони дали однакові результати, числа часу відрізнялись у межах ±40 мс.

| Перевірка | Результат |
| --- | --- |
| індекси стали `queryable` | через 1674 і 1682 мс після `createSearchIndex` |
| `text "databases"`, аналізатор `lucene.english` | `[1,8,7,4]`: стемінг звів `databases` і `database` до одного терму |
| `text "databse"` без `fuzzy` | `[]` |
| те саме з `fuzzy: { maxEdits: 1 }` | `[1,8,7,4]` |
| `compound`: `must` text "search" + `should` range `year >= 2024` | `3:1.443 7:1.443 2:0.352`: `should` додав до оцінки, а не відфільтрував |
| `compound`: `must` text "search" + `filter` equals `category: db` | `7:0.443`: оцінка та сама, що без фільтра (1.443 мінус внесок `should`), `filter` на неї не вплинув |
| `sort: { year: -1 }` всередині `$search` | `[7,4,1,8]` |
| `$searchMeta` facet за `category` (`token`) | `db:3, food:2, search:2, travel:1`, `count.lowerBound: 8` |
| `$search` з неіснуючим `index` | `[]`, без помилки |
| `$search` по неіндексованому полю | `[]`, без помилки |
| `$vectorSearch` ANN (`numCandidates: 100`) і ENN (`exact: true`) | однакові: `1:0.9964 4:0.9796 7:0.9511` |
| ANN з `filter: { category: "food" }` | `8:0.6491 5:0.5000` |
| `filter` по полю, не оголошеному як `filter` в індексі | помилка `Path 'year' needs to be indexed as filter` |
| `limit` більший за `numCandidates` | помилка `limit should be less than or equal to numCandidates` |
| `$rankFusion` (`$search` + `$vectorSearch`, ваги 1:1) | `7:0.0328 2:0.0320 3:0.0320 1:0.0313 8:0.0156 4:0.0154` |
| `$scoreFusion` (`sigmoid`, `avg`) | `7:0.7065 3:0.6663 2:0.6569 1:0.6429 4:0.3462 8:0.2903` |
| запис з `w: majority`, одразу `find` і `$search` | `find=1`, `$search=0` |
| той самий тест 20 разів | `$search` одразу не бачив новий документ у 20 з 20; документ з'являвся через min 975, медіана ~1000, max 1041 мс |
| `updateOne` вектора, одразу ENN `$vectorSearch` | перший запит повернув старого лідера (`_id 4`), новий (`_id 5`) з'явився через ~910 мс |

Стабільна затримка близько 1 с схожа на інтервал фіксації змін у `mongot` цього образу. Це
спостереження, а не задокументований параметр, і на Atlas зі Search Nodes вона може бути іншою.
Документація гарантує лише eventual consistency.

## Чого тут немає

- Atlas, Search Nodes, шардований кластер, справжні ембедінги, вимір recall на великих даних:
  не запускалось.
- `$rerank` і автоматичні ембедінги Voyage AI не перевірялись (потрібен Atlas або ключі API).
