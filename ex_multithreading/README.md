# ex_multithreading

Лекція 17 «Багатопотоковість». Як не блокувати event loop: дроблення роботи, процеси,
кластер, worker threads, примітиви синхронізації. Кожна підтека має свій `package.json`.

| Файл | Що показує |
| --- | --- |
| `timers.js` | важка робота шматками через `setImmediate`, щоб таймери встигали спрацьовувати |
| `emitterLoad.js` | слухачі `EventEmitter`; навантаження 100 000 подій із заміром часу |
| `c1M.js` | сервер на мільйон long-polling з'єднань (порт з `node-millenium`): master 8080, воркери 8081 |
| `child_process/` | `fork()` дочірнього процесу на кожен запит Express, обмін через IPC |
| `cluster/communication.js`, `cluster/express.js` | `cluster.fork()` за кількістю CPU; обмін повідомленнями; спільний порт 3000 |
| `worker_threads/exWorkerThreads.js` | пошук простих чисел до 1e7 у N потоках (`node exWorkerThreads.js 4`) |
| `worker_threads/index.js` | сортування мільйона чисел у воркері паралельно з HTTP-запитом |
| `pool/` | CPU-важкий Фібоначчі на сервері: блокування, окремий процес, батчинг, пул процесів (`readme.md` там же) |
| `barrier/` | бар'єр: дочекатися N колбеків і отримати всі результати |
| `mutex/` | міжпроцесний м'ютекс на `flock` (пакет `fs-ext`) |
| `semaphore/` | семафор на промісах (producer/consumer) і «бінарний семафор» на `SharedArrayBuffer` |

## Запуск

`cd ex_multithreading/barrier && npm ci && node index.js` (теки без `package.json`, як
`cluster/`, залежностей не мають).

## Залежності

Оновлено 2026-10-31 (точні версії, lockfile v3; `npm audit` у кожній підтеці: 0):

- `child_process/`: `express` 4.22.3 замість `4.17.1` (DoS у `body-parser` і `qs`, ReDoS у
  `path-to-regexp`, IP spoofing у `proxy-addr`, open redirect і XSS у `res.redirect`).
  Лишились на 4.x, бо в Express 5 маршрут `app.all('*')` (`index.js:20`) уже невалідний.
  Код не змінювався; `GET /endpoint` і `GET /abc` відповідають так само, як до оновлення.
- `worker_threads/`, `barrier/`: пакет `request` (deprecated з 2020; SSRF, а через залежності
  `form-data`, `tough-cookie`, `qs`, `json-schema`, `ajv`, `uuid` ще 10 вразливостей) замінено
  глобальним `fetch`. Залежностей у цих теках більше немає. У `worker_threads/index.js:32`
  ланцюжок `fetch().then(r => r.text())`; у `barrier/index.js:6-10` маленька обгортка
  `request(url, callback)` над `fetch` з колбеком `(err, body)`, якого чекає
  `barrier.waitOn()`.
- `mutex/`: прибрано `async` і `live-mutex`, яких код не імпортує (`live-mutex` 0.2.x
  не підтримується і тягне `uuid@3`), `fs-ext` оновлено з 2.0.0 до 2.1.1: новий `nan`
  збирається під Node 24.

## Стан на Node 24.14.1

Запускаються: `emitterLoad.js`, `barrier`, `semaphore/simple-index.js` (код 0, але виклики
закоментовані), сервери `child_process`, `cluster/*`, `pool/server_method1.js`, а також
`timers.js`, `c1M.js`, `semaphore/binary.js`, `worker_threads/*` (працюють довше за таймаут
аудиту, 4–8 с). `mutex/` працює з 2026-10-31 (`fs-ext@2.1.1`): `node index.js` друкує
`sdfsdf`, код 0; два процеси перевірено — поки один тримає замок, `lock()` у другому кидає
`EAGAIN`, після `unlock()` замок вільний. На `fs-ext@2.0.0` модуль не збирався
(`'AccessorSignature' is not a member of 'v8'` у старому `nan`).

## Відомі проблеми

- `semaphore/binary.js:16-17`: перевірка й запис замка двома звичайними операціями, без
  `Atomics.compareExchange`/`Atomics.wait`; два воркери можуть увійти одночасно. Це не
  семафор, а гонка, яку файл нібито показує лише при інтервалі 10 мс (`:52`).
- `child_process/index.js:8`: `fork('./sendMail.js')` відносно поточного каталогу, а не
  файлу; дочірній процес ніколи не завершується (перевірено: після двох запитів живуть два
  процеси `sendMail.js`). `:8` змінна `process` затіняє глобальний `process`; `:15`
  одруківка `conter`.
- `c1M.js:38`: `fs.writeFile` без колбека через 2 хв кидає `ERR_INVALID_ARG_TYPE`;
  `:403` подія `death` (тепер `exit`) і слухач додається в циклі: на машині з 12+ ядрами
  `MaxListenersExceededWarning`; `:95` `delete pDelete` нічого не робить.
- `emitterLoad.js:41`: `indexes[i] + 1 || 0` рахує з нуля, тож лічильники на 1 менші;
  `:44`, `:53` беруть лише наносекундну частину `hrtime`, секунди відкидаються.
- `worker_threads/heavySorter.js:4`: `sort()` без компаратора порівнює числа як рядки;
  `worker_threads/index.js:36`: `postMessage` у воркер, який не слухає (`worker.js:12-14`
  закоментовано); `:32` запит до зовнішнього сайту; `log.txt` (10 МБ виводу) закомічено.
- `barrier/index.js:33-34`: `exNetwork()` (не викликається) ходить на вигадані
  `http://example.com/foo.json` і `baz.json`; сервер повертає 404 з HTML, і
  `JSON.parse` у `extractUsefulPart` кидає `SyntaxError`. З `request` було гірше:
  у колбек приходив об'єкт відповіді, а не тіло, тож `JSON.parse('[object Object]')`.
- `pool/fibo_in_server.js:17`, `pool/server_method3.js:28`: без заголовка `fibo`
  `parseInt` дає `NaN`, `fibo(NaN)` рекурсує до переповнення стеку.
  `pool/server_method1.js:16`, `server_method2.js:21`: число захардкоджено (3 і 10).

## Теорія

- «Конкурентність у Node.js»
- «Event loop у Node.js»
- «Блокуючі та неблокуючі операції в Node.js»
- «Асинхронність у JavaScript» (Atomics, SharedArrayBuffer)
- «Сортування і пошук» (компаратор `sort`)
