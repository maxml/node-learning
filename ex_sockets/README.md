# ex_sockets

Лекція 19 «Сокети. gRPC. NoSQL». WebSocket на пакеті `ws` і чат на `socket.io`. Кожна
підтека має свій `package.json`.

| Файл / тека | Що показує |
| --- | --- |
| `index.js` + `index.html` | один HTTP-сервер віддає сторінку й обслуговує WebSocket-ехо; сторінка порівнює затримку запитів WebSocket і звичайним HTTP (решта HTTP-запитів віддзеркалюється `req.pipe(res)`) |
| `stat/` | Express + `ws`: сервер кожні 100 мс шле клієнту `process.memoryUsage()`, сторінка оновлює значення |
| `chat/` | чат на `socket.io` 2: вхід під ніком, системні повідомлення, розсилка тексту й картинок (`broadcast`) |

## Запуск

```bash
cd ex_sockets && npm ci && node index.js          # http://localhost:3000
cd ex_sockets/stat && npm ci && node index.js
cd ex_sockets/chat && npm ci && node index.js
```

## Стан на Node 24.14.1

Усі три сервери стартують і слухають порт 3000. Браузерну частину аудит не відкривав;
клієнтський скрипт чату не проходить навіть розбір (див. нижче).

## Відомі проблеми

- `chat/www/scripts/hichat.js:173`: `msg` повторно оголошено через `const` поруч із
  параметром `msg`, `SyntaxError: Identifier 'msg' has already been declared`
  (`node --check`); `:194` `const match` без ініціалізатора теж синтаксична помилка. Через
  це весь клієнт чату не виконується.
- `chat/www/scripts/hichat.js:176`, `:188`: нік, текст і `imgData` інших користувачів
  вставляються через `innerHTML` без екранування (XSS).
- `chat/www/scripts/hichat.js:161`, `:205`: картинки емодзі з `../content/emoji/`, такої
  теки в репозиторії немає.
- `chat/index.js:4`: `require('socket.io').listen(server)` працює лише в socket.io 2;
  з v3 це `new Server(server)`. Повідомлення й картинки без обмеження розміру.
- `package.json` верхнього рівня: `main` і скрипт `start` вказують на `server.js`, якого
  немає; `npm start` падає, запускати `node index.js`.
- `stat/index.js:18-22`: помилки `ws.send` свідомо ігноруються.
- Жоден сервер не перевіряє заголовок `Origin` на рукостисканні WebSocket.

## Теорія

- «Реальний час поверх HTTP» (WebSocket, SSE, long polling)
- «HTTP-сервер у Node.js»
- «XSS і CSP»
- «CSRF» (Cross-Site WebSocket Hijacking, перевірка `Origin`)
