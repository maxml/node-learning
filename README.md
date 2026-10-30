# NodeLearning

Приклади до курсу Node.js (26 лекцій: від типів даних JavaScript до TypeScript, патернів,
Docker і NestJS) і новіші перевірені експерименти, на які спираються нотатки з теорії.

Теорія лежить в окремій базі нотаток, яка не публікується; нижче нотатки названо за
заголовками (наприклад, «Типи даних у JavaScript»), щоб було зрозуміло, що саме читати.

## Версія Node.js

Усе перевірено на **Node.js v24.14.1** (Linux x64), 2026-10-30. Старі приклади `ex_*` писались
під Node 12–14 у 2020 році; що з них працює сьогодні, а що ні, написано в README кожної
теки, розділ «Стан на Node 24.14.1».

## Як запустити приклад

```bash
cd ex_lodash          # будь-яка тека з package.json
npm ci                # ставить точні версії з package-lock.json; без lock-файлу: npm install
node index.js
```

Залежності кожна тека ставить у свій `node_modules/` (він у `.gitignore`). Сервери слухають
порт 3000, якщо README не каже іншого. Частина прикладів потребує бази (MongoDB, PostgreSQL,
MySQL) або мережі; це вказано в README теки.

## Лекції курсу → приклади → теорія

| № | Лекція | Приклади | Теорія |
| --- | --- | --- | --- |
| 1 | JS/Node.js. Типи даних. Синтаксис | `practice/practice1.js` | «Типи даних у JavaScript», «Перетворення типів у JavaScript» |
| 2 | Інструкції. Масиви. Функції | `practice/practice2.js` | «Масиви та колекції в JavaScript», «Функції та замикання в JavaScript» |
| 3 | Об'єкти. Рядки. Дати. Таймери | `practice/practice3.js` | «Об'єкти та прототипи в JavaScript», «Числа, рядки й дати в JavaScript» |
| 4 | Колбеки. Функції 2. Області видимості | `practice/practice4.js` | «Функції та замикання в JavaScript», «Асинхронність у JavaScript» |
| 5 | require. lodash. moment | `ex_require`, `ex_lodash`, `ex_moment`, `practice/practice5.js`, `practice/project` | «Модулі в JavaScript», «Пакети та npm», «Числа, рядки й дати в JavaScript» |
| 6 | V8. Node.js. npm. Конфігурація. Локалізація. Логування | `ex_npm`, `ex_configuration`, `ex_translations`, `ex_logger` | «Архітектура Node.js», «Пам'ять і продуктивність у V8», «Пакети та npm», «Twelve-Factor App», «Керування секретами» |
| 7 | RegExp. Валідація. Git | `practice/practice7.js` | «Регулярні вирази в JavaScript», «Модель даних Git», «Практики Git» |
| 8–9 | Практика і самостійна робота | (окремих тек немає) | |
| 10 | ФП. VS Code | `ex_fp`, `ex_lodash/fp.js`, `practice/practice10.js` | «Незмінність і функціональний стиль у JavaScript» |
| 11 | Проміси. Файли. Помилки | `ex_fs`, `ex_server/files`, `practice/practice11.js` | «Асинхронність у JavaScript», «Файлова система в Node.js» |
| 12 | Алгоритми. Таймери | `ex_algorithms`, `ex_data_structures`, `practice/practice12.js` | «Складність алгоритмів», «Структури даних», «Сортування і пошук», «Рекурсія і динамічне програмування», «Event loop у Node.js» |
| 13 | Прототипи. FS 2. Git 2 | `ex_oop`, `ex_fs` (стріми), `practice/practice13.js` | «Об'єкти та прототипи в JavaScript», «Стріми в Node.js», «Гілкування та злиття» |
| 14 | SQL. ECMAScript | `ex_sql`, `practice/practice14.js` | «Мова SQL», «Запити SELECT», «З'єднання таблиць», «Реляційна модель», «Модулі в JavaScript» |
| 15 | REST. HTTP. Express | `ex_server`, `ex_axios` | «HTTP-сервер у Node.js», «Дизайн REST API», «Методи HTTP», «Коди стану HTTP», «Реальний час поверх HTTP» |
| 16 | БД 2. ФП 2 | `ex_sql/advanced`, `ex_fp` (ramda) | «Плани запитів», «Транзакції та ACID», «NULL і тризначна логіка», «JSON у PostgreSQL» |
| 17 | Багатопотоковість | `ex_multithreading` | «Конкурентність у Node.js», «Event loop у Node.js», «Блокуючі та неблокуючі операції в Node.js» |
| 18 | ORM. Sequelize | `ex_orm` | «Реалізації ORM», «Міграції схеми в ORM», «Проблема N+1», «ORM проти чистого SQL» |
| 19 | Сокети. gRPC. NoSQL | `ex_sockets`, `ex_http2`, `ex_grpc`, `ex_mongoose` | «Реальний час поверх HTTP», «Версії HTTP», «REST проти GraphQL і gRPC», «Документна модель», «Моделювання даних у MongoDB» |
| 20 | Чистий код, ESLint. Сервери | `ex_eslint`, `ex_server/analogs`, `ex_npm` (husky), `practice/practice20.js` | «Чистий код», «Практики JavaScript» |
| 21 | Практика | (окремих тек немає) | |
| 22 | ООА та ООD. TypeScript | `ex_typescript`, `ex_oop` | «Система типів TypeScript», «Strict mode і tsconfig у TypeScript», «Принципи ООП» |
| 23 | Патерни. SOLID. GRASP. 12 факторів | `ex_patterns` | «Патерни проєктування», «SOLID», «GRASP», «Twelve-Factor App» |
| 24 | TypeORM; Docker | `docker/` (новий) | «TypeORM», «Образи та контейнери Docker», «Dockerfile для Node.js» |
| 26 | NestJS | (окремих тек немає) | «Модулі та DI в NestJS», «Життєвий цикл запиту в NestJS» |
| дод. | GraphQL | `ex_typescript/middle` | «REST проти GraphQL і gRPC» |
| дод. | Testing, Security, Redis, мікросервіси | новіші теки нижче | див. таблицю нижче |

## Перевірені експерименти

Новіші теки: кожен скрипт запускався 2026-10-30 (або 2026-10-29), а README теки містить
вивід прогону, версії й команди запуску.

| Тека | Що там |
| --- | --- |
| `js/` | типи й перетворення, об'єкти й функції, асинхронність і колекції, модулі й пам'ять V8, npm (semver, lockfile, phantom-залежності, install-скрипти) |
| `design/` | патерни GoF, чистий код і Twelve-Factor (`patterns/`); ООП, SOLID, GRASP на TypeScript (`principles/`) |
| `algorithms/` | структури даних, складність, сортування, графи, глибина рекурсії, DP; `old-examples-bugs.js` відтворює дефекти `ex_algorithms` і `ex_data_structures` |
| `testing/` | види тестів, тест-дублі, `node:test`, інтеграційні тести з PostgreSQL, навантаження (autocannon, k6), мутаційне тестування (Stryker) |
| `docker/` | анатомія контейнера, збірка образу Node/TS п'ятьма способами, сигнали й ліміти в рантаймі, Docker Compose для розробки |
| `aws/` | крайні випадки шаблонів подій EventBridge (event-ruler) і коди виходу ECS-тасків, без хмарного акаунта |
| `cap/` | розрив мережі між вузлами PostgreSQL і MongoDB у Docker: що бачить кожна сторона |
| `cdc/` | логічне декодування PostgreSQL і change streams MongoDB, втрата історії за resume token |
| `indexes/` | індекси, кардинальність, правило ESR на мільйоні рядків у PostgreSQL і MongoDB |
| `mongo/` | пул з'єднань, діагностика кластера, агрегація, патерни схем, Atlas Search, Lambda, тестування, тюнінг |
| `security/` | SameSite, CSP і Trusted Types у браузері; SQL/NoSQL/command injection; безпека Node.js; витік секретів у шарах образу; SSRF |
| `system-design/` | кешування й Redis/Valkey, консистентне хешування й балансування, межі модульного моноліту, патерни стійкості й rate limiting, сага на MongoDB |
| `typescript/` | прапорці strict, діри в типах, межа рантайму зі схемою, type stripping у Node, typescript-eslint, `tsc` 7 проти 6, OpenAPI → типи, типи для бекенду |
| `git-notes-factcheck/` | перевірка тверджень про Git у тимчасовому репозиторії: diff3, `restore --merge`, `pull` без налаштувань, `--force-with-lease` |

## Ліцензія

Apache License 2.0, див. [LICENSE](LICENSE). Приклади в `ex_grpc` і частина інших узяті з
відкритих джерел під їхніми ліцензіями; автори вказані в коментарях файлів.
