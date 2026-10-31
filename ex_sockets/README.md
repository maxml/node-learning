# ex_sockets

Лекція 19 «Сокети. gRPC. NoSQL». WebSocket на пакеті `ws` і чат на `socket.io`. Кожна
підтека має свій `package.json`.

| Файл / тека | Що показує |
| --- | --- |
| `index.js` + `index.html` | один HTTP-сервер віддає сторінку й обслуговує WebSocket-ехо; сторінка порівнює затримку запитів WebSocket і звичайним HTTP (решта HTTP-запитів віддзеркалюється `req.pipe(res)`) |
| `stat/` | Express + `ws`: сервер кожні 100 мс шле клієнту `process.memoryUsage()`, сторінка оновлює значення |
| `chat/` | чат на `socket.io` 4: вхід під ніком, системні повідомлення, розсилка тексту й картинок (`broadcast`) |

## Запуск

```bash
cd ex_sockets && npm ci && npm start              # http://localhost:3000 (node index.js)
cd ex_sockets/stat && npm ci && node index.js
cd ex_sockets/chat && npm ci && node index.js
```

## Залежності

Точні версії (оновлено 2026-10-31), `npm audit` у кожній теці: 0 вразливостей.

| Тека | Було | Стало |
| --- | --- | --- |
| `ex_sockets/` | `express@4.17.1`, `ws@7.2.5` (9 вразливостей) | `ws@7.5.13`; `express` прибрано, `index.js` його не імпортує |
| `stat/` | `express@4.17.1`, `ws@7.2.5` (9) | `express@4.22.3`, `ws@7.5.13` |
| `chat/` | `express@4.17.1`, `socket.io@2.3.0` (17) | `express@4.22.3`, `socket.io@4.8.4` |

`ws` лишився на гілці 7 (7.5.10+ закриває CVE-2024-37890): у `ws@8` подія `message` віддає
`Buffer`, і ехо в `index.js` почало б слати бінарні кадри замість тексту. `socket.io@2.5.1`
(остання 2.x) усе ще тягне вразливі `engine.io`/`cookie`/`parseuri`, тому чат переведено
на 4.x.

## Стан на Node 24.14.1

Перевірено 2026-10-31: усі три сервери стартують на порту 3000 і віддають сторінку (200);
`npm start` працює. WebSocket-ехо `index.js` повертає текст як текст; `stat/` шле
`process.memoryUsage()` (`rss`, `heapTotal`, …) і зупиняє інтервал при закритті. Чат
перевірено двома клієнтами в jsdom на реальній сторінці: вхід, розсилка тексту, системні
повідомлення, картинка `data:image/png;base64,…` доходять; помилок скриптів немає.

Що змінено в коді:

- `chat/index.js`: `require('socket.io').listen(server)` (лише v2) → `new Server(server,
  { maxHttpBufferSize: 5e6 })`. Ліміт одного повідомлення 5 МБ, бо картинки йдуть як
  base64 data URL (у v4 типово 1 МБ, у v2 було 100 МБ).
- `chat/www/scripts/hichat.js`: виправлено синтаксичні помилки (`msg` повторно оголошено
  через `const`; `const match` без ініціалізатора) і `TypeError` у циклі емодзі
  (`for (const i …; i--)`). XSS: нік і час вставляються через `textContent`, текст
  повідомлення екранується перед підстановкою `[emoji:N]`, картинка приймається лише як
  base64 `data:image/…` і будується через DOM, а не рядком в `innerHTML`. Перевірено:
  `<b>` і `<img onerror>` у ніку й тексті показуються як текст, `javascript:` і
  `x" onerror=…` замість картинки дають `[unsupported image]`; якщо прибрати
  екранування, той самий тест знаходить два `img[onerror]`.
- `package.json` верхнього рівня: `main` і `start` тепер `index.js` (було відсутній
  `server.js`).

## Відомі проблеми

- `chat/www/scripts/hichat.js` (`_initialEmoji`, `_showEmoji`): картинки емодзі з
  `../content/emoji/`, такої теки в репозиторії немає (биті зображення).
- `stat/index.js:18-22`: помилки `ws.send` свідомо ігноруються.
- Жоден сервер не перевіряє заголовок `Origin` на рукостисканні WebSocket.

## Теорія

- «Реальний час поверх HTTP» (WebSocket, SSE, long polling)
- «HTTP-сервер у Node.js»
- «XSS і CSP»
- «CSRF» (Cross-Site WebSocket Hijacking, перевірка `Origin`)
