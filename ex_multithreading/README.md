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

## Стан на Node 24.14.1

Запускаються: `emitterLoad.js`, `barrier`, `semaphore/simple-index.js` (код 0, але виклики
закоментовані), сервери `child_process`, `cluster/*`, `pool/server_method1.js`, а також
`timers.js`, `c1M.js`, `semaphore/binary.js`, `worker_threads/*` (працюють довше за таймаут
аудиту, 4–8 с). Не запускається `mutex/`: `fs-ext@2.0.0` не збирається під Node 24
(`'AccessorSignature' is not a member of 'v8'` у старому `nan`), далі
`Cannot find module './build/Release/fs-ext'`.

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
  `worker_threads/index.js:37`: `postMessage` у воркер, який не слухає (`worker.js:12-14`
  закоментовано); `:32` запит до зовнішнього сайту; `log.txt` (10 МБ виводу) закомічено.
- `pool/fibo_in_server.js:17`, `pool/server_method3.js:28`: без заголовка `fibo`
  `parseInt` дає `NaN`, `fibo(NaN)` рекурсує до переповнення стеку.
  `pool/server_method1.js:16`, `server_method2.js:21`: число захардкоджено (3 і 10).

## Теорія

- «Конкурентність у Node.js»
- «Event loop у Node.js»
- «Блокуючі та неблокуючі операції в Node.js»
- «Асинхронність у JavaScript» (Atomics, SharedArrayBuffer)
- «Сортування і пошук» (компаратор `sort`)
