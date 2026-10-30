# Ін'єкції: код експериментів

Код для розділу «Перевірено експериментом» у
`Obsidian Vault/Engineering/General/Security/Ін'єкції.md`. Усі приклади це пара
«вразливий патерн → його виправлення» у стилі OWASP-чит-шітів: демонструють, що дані,
вкладені в текст запиту чи команди, інтерпретуються іншим парсером, і що параметризація
/ allowlist / argv-масив це зупиняють.

## Запуск

Потрібні контейнери (вільні порти, перевір `docker ps`):

```bash
docker run -d --name inj-pg    -e POSTGRES_PASSWORD=pw -p 127.0.0.1:55450:5432 postgres:18
docker run -d --name inj-mongo -p 127.0.0.1:55451:27017 mongo:9

npm install            # pg, mongodb, mongoose (node_modules ігнорується через examples/.gitignore)
node sql_pg.js         # SQL-ін'єкція в PostgreSQL: конкатенація проти параметра
node nosql_mongo.js    # ін'єкція операторів у MongoDB: { $ne: null } і виправлення
node cmd_node.js       # ін'єкція команд: child_process.exec проти execFile

docker rm -f inj-pg inj-mongo   # прибрати після
```

`PG_URL` / `MONGO_URL` перевизначають адреси. `cmd_node.js` «атака» лише створює файл
`pwned-marker.txt` у цій теці (прибирає його сам); нічого в системі не чіпає.

## Результати (2026-10-29)

Версії: PostgreSQL 18.6, MongoDB 9.0.4, Node v24.14.1, драйвери `pg` 8.23.1,
`mongodb` 7.7.0, `mongoose` 9.11.4.

### SQL-ін'єкція (`sql_pg.js`)

```json
{
  "classic_rows_returned": 2,       // ' OR 1=1 -- злив усю таблицю (2 рядки)
  "param_rows_returned": 0,         // той самий ввід як параметр: 0 збігів
  "timebased_ms_concat": 2003,      // pg_sleep(2) спрацював через конкатенацію
  "timebased_ms_param": 1,          // як параметр — літерал, без затримки
  "orderby_first_when_injected": "alice@x",  // ?sort= дописав ORDER BY ... DESC
  "orderby_allowlisted": "admin@x",          // allowlist напряму → ASC
  "like_raw_percent_matches": 2,    // '%' у LIKE збіг з усіма (не ін'єкція, а wildcard)
  "like_escaped_percent_matches": 0 // екранований '%' з ESCAPE — літерал
}
```

Висновок: параметр зупиняє класичну й time-based ін'єкції. ORDER BY / ідентифікатори не
параметризуються — їх рятує лише allowlist. LIKE-wildcard параметризація не ловить: `%`/`_`
у вводі треба екранувати окремо.

### Ін'єкція операторів у MongoDB (`nosql_mongo.js`)

```json
{
  "honest_login": true,
  "wrong_password": false,
  "operator_bypass": true,              // { $ne: null } у фільтрі → вхід без пароля
  "typecheck_blocks_bypass": false,     // typeof === "string" на вході блокує
  "mongoose_typed_still_bypassed": true,// String-схема Mongoose НЕ рятує: $ne валідний оператор
  "mongoose_blocked_with_sanitize": "CastError"  // sanitizeFilter обгортає в $eq → CastError
}
```

Висновок: розбір JSON-тіла прямо у фільтр дає обхід логіну через `{ $ne: null }`. Перевірка
типів на вході блокує. Типізація схеми Mongoose сама НЕ рятує: `$ne` це легітимний оператор,
його операнд `null` касториться нормально, і запит виконується. `sanitizeFilter: true` обгортає
введений оператор у `$eq`, тож на String-полі він стає CastError (запит відхилено) — це й є
захист, і воно збігається з тим, що зафіксовано в `Mongo/Практики MongoDB.md`.

### Ін'єкція команд ОС (`cmd_node.js`)

```json
{
  "exec_injected_marker_written": true,   // exec("cat file; echo ...") — shell виконав 2-гу команду
  "execFile_result": "cat error, no injection",
  "execFile_injected_marker_written": false, // execFile(argv) — метасимволи це частина імені
  "execFile_safe_reads_file": true
}
```

Висновок: `exec` з рядком іде через `/bin/sh -c`, тож `;` запускає другу команду. `execFile`
(argv-масив, без shell) робить метасимволи частиною єдиного аргумента, і ін'єкції немає.

## Що НЕ перевірялось тут (лишилось на рівні документації)

- **psycopg3 server-side проти client-side binding.** Із документації: psycopg3 типово шле
  запит і параметри окремо; `ClientCursor` робить підстановку на клієнті. node-postgres теж
  шле параметри окремо (підтверджено з docs, не кодом тут).
- **Client-side екранування ламається на мультибайтних кодуваннях.** PostgreSQL-доки
  описують ризик: у деяких клієнтських кодуваннях останній байт мультибайтного символу
  дорівнює ASCII `\`, тож хибне клієнтське екранування відкриває ін'єкцію; `standard_conforming_strings`
  типово `on` саме тому. Реальний кейс не відтворювався — поданий як документація.
