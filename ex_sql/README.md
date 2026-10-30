# ex_sql

Лекції 14 «SQL. ECMAScript» і 16 «БД 2. ФП 2». Навчальна схема «університет» (з підручника
Silberschatz, Korth, Sudarshan «Database System Concepts») і добірка фрагментів SQL.

| Файл | Що показує |
| --- | --- |
| `start_point.sql` | створення БД `university` і завантаження двох файлів нижче (MySQL-клієнт) |
| `dll.sql` | DDL: 11 таблиць (`classroom`, `department`, `course`, `instructor`, `section`, `teaches`, `student`, `takes`, `advisor`, `time_slot`, `prereq`), PK, FK з `on delete`, `check` |
| `dml.sql` | очищення й заповнення таблиць тестовими даними |
| `select.sql` | `DISTINCT`, `WHERE`, `GROUP BY`/`HAVING`, `ORDER BY`, `BETWEEN`, `LIKE` з `%` і `_` |
| `join.sql` | `JOIN`, `LEFT`/`RIGHT OUTER JOIN`, підзапит з `IN` |
| `advanced/advanced.sql` | аліаси, підзапити, `CREATE VIEW`, inline view, корельований підзапит |
| `advanced/alteration.sql` | `ALTER TABLE`: колонки, індекси, обмеження (діалект MySQL) |
| `advanced/json.sql` | тип `json` і оператори `->`, `->>` (PostgreSQL) |
| `advanced/null.sql` | `ISNULL`/`NVL`/`IFNULL`/`COALESCE` у різних СУБД, `IS NULL` |
| `advanced/transactions.sql` | `BEGIN`/`COMMIT`, `SAVEPOINT` і `ROLLBACK TO SAVEPOINT` |
| `advanced/union_intersect.sql` | `UNION`, `UNION ALL`, `INTERSECT` |
| `advanced/variables.sql` | змінні сесії |

## Запуск

```bash
docker run -d --rm --name sql -e POSTGRES_PASSWORD=x -v "$PWD/ex_sql":/sql:ro postgres:18.6-alpine
docker exec sql psql -U postgres -f /sql/dll.sql -f /sql/dml.sql -f /sql/select.sql -f /sql/join.sql
```

## Стан (перевірено на PostgreSQL 18.6)

`dll.sql`, `dml.sql`, `select.sql`, `join.sql`, `advanced/json.sql` виконуються без помилок
(13 курсів, 22 записи в `takes`). Файли `advanced/` (крім `json.sql`) це окремі фрагменти
під таблиці, яких у схемі немає (`Store_Information`, `Geography`, `Customer`, `accounts`,
`foo` …), тому на цій БД вони падають з `relation … does not exist`. MySQL-частину
(`start_point.sql`, `alteration.sql`) не перевіряли.

## Відомі проблеми

- `start_point.sql:2-4`: `USE` і `SOURCE` це команди клієнта `mysql`, а не SQL; у
  PostgreSQL потрібні `\c` і `\i`.
- `advanced/variables.sql:1-3`: коментар каже «postgresql», але `DECLARE @myvar INT` це
  синтаксис T-SQL (SQL Server); PostgreSQL дає `syntax error at or near "@"`. `:7` без `;`.
- `advanced/null.sql:9-10`: `ISNULL(3/0) = 1` це не оператори, а нотатки; у скрипті дають
  синтаксичну помилку.
- `advanced/transactions.sql:19`: ділення на нуль як спосіб «зламати» вставку працює в
  PostgreSQL, але в MySQL залежить від `sql_mode`.

## Теорія

«Мова SQL», «Реляційна модель», «Запити SELECT», «З'єднання таблиць», «NULL і тризначна
логіка», «Транзакції та ACID», «JSON у PostgreSQL», «Індекси», «Плани запитів» (лекція 16:
`EXPLAIN`, view), «Нормалізація».
