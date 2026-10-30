# ex_server

Лекції 15 «REST. HTTP. Express», 11 «Проміси. Файли. Помилки» (`files/`) і 20 «Чистий код,
ESLint. Сервери» (`analogs/`). Від голого `http` до Express і його альтернатив.

| Файл / тека | Що показує |
| --- | --- |
| `simpleHttp.js`, `simpleExpress.js` | один обробник на `http.createServer` і те саме на Express (`app.all('*')`) |
| `exMiddleware.js` | ланцюжок middleware: лог заголовків, запис у `request` |
| `errorServer.js` | спроба централізованого обробника помилок Express |
| `routing.js` | ручний роутер на `http`: статика за розширенням, динамічні модулі, 404 |
| `polling.js` | клас `Poller` на `setInterval` |
| `btcPrice.js` | CLI-опції `commander` + Express-ендпоінт, що тягне курс BTC зовнішнім API |
| `params/` | `body-parser`, `cors`, параметри маршруту, логуючий middleware |
| `routing/` | розділення маршрутів по модулях, EJS-в'юхи, `method-override` (порт прикладу Express) |
| `ejs/` | EJS-шаблони, скомпільовані на сервері й передані в браузер |
| `handlebars/` | шаблон Handlebars з власним хелпером, рендер у консоль |
| `files/` | завантаження файлу `multer` у `./uploads` |
| `analogs/ex_fastify`, `ex_hapi`, `ex_koa` | «hello world» на Fastify 2, hapi 18, Koa 2 (кожен зі своїм `package.json`) |

## Запуск

```bash
cd ex_server && npm ci
node simpleExpress.js && curl localhost:3000/      # усі сервери слухають порт 3000
cd handlebars && node index.js "текст тіла"        # читає шаблон з поточного каталогу
```

## Стан на Node 24.14.1

Стартують і слухають порт: усі файли верхнього рівня, `params/`, `ejs/`, `files/`,
`analogs/*`; `handlebars/` друкує HTML і завершується. Не стартує `routing/index.js`:
`Cannot find module 'morgan'`.

## Відомі проблеми

- `routing/index.js:6`, `:8`, `:9`: `morgan`, `cookie-parser`, `method-override` не
  оголошені в `package.json`.
- `errorServer.js:4`: обробник помилок зареєстровано до маршрутів, тож він ніколи не
  викликається; відповідає вбудований обробник Express (HTML зі стеком), а не
  `Something broke!` (перевірено).
- `btcPrice.js:51`: у `http.get` немає обробника `error`; API `api.coindesk.com` уже не
  існує, і перший запит до `/` валить процес (`getaddrinfo ENOTFOUND`, перевірено). `:78`
  `console.err` не існує, тож `.catch(undefined)` нічого не ловить.
- `routing.js:36`: `path.join(__dirname, pathname)` з необробленим шляхом дає path traversal
  (`curl --path-as-is '/../../…'` виходить за межі теки, перевірено); `:48` помилка
  `createReadStream` не обробляється, відсутній файл валить сервер. `:52` `url.parse`
  deprecated (DEP0169).
- `polling.js`: періодичний таймер на сервері, а не long polling (немає запиту, що чекає
  даних). `ejs/index.js:23`, `:33`: перший `app.use('/')` перехоплює все, другий недосяжний.
- `files/index.js:7`: шлях `./uploads` відносно поточного каталогу; немає обмежень на
  розмір і тип файлу; `multer@1.4.2` має CVE-2022-24434. `files/uploads/` містить
  закомічений завантажений файл.
- Дрібне: `handlebars/index.js:11` шаблон шукається в поточному каталозі, помилка читання
  ігнорується; `params/index.js:26` у `app.use`-middleware `request.params` завжди порожній;
  `analogs/ex_koa/index.js:9` без аргументу порт випадковий; пакет `hapi` deprecated.

## Теорія

«HTTP-сервер у Node.js», «Методи HTTP», «Коди стану HTTP», «Дизайн REST API», «Ресурси та
URI», «Реальний час поверх HTTP» (polling), «XSS і CSP» (шаблонізатори), «Безпека Node.js»
(path traversal), «Практики Node.js» (Fastify, обробка помилок).
