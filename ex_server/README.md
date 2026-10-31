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
| `analogs/ex_fastify`, `ex_hapi`, `ex_koa` | «hello world» на Fastify 5, hapi 21 (`@hapi/hapi`), Koa 2 (кожен зі своїм `package.json`) |

## Запуск

```bash
cd ex_server && npm ci
node simpleExpress.js && curl localhost:3000/      # усі сервери слухають порт 3000
cd handlebars && node index.js "текст тіла"        # читає шаблон з поточного каталогу
cd files && node index.js                          # ./uploads відносно поточного каталогу
```

## Залежності

Точні версії (оновлено 2026-10-31): `express@4.22.3`, `body-parser@1.20.9`,
`cookie-parser@1.4.7`, `method-override@3.0.0`, `morgan@1.12.1`, `cors@2.8.6`,
`ejs@3.1.10`, `handlebars@4.7.10`, `multer@2.5.0`, `chalk@3.0.0`, `commander@5.1.0`.
`npm audit`: 0 вразливостей (до оновлення 14: 4 critical, 7 high, 3 low).

- `overrides.minimatch = 11.0.3`: `ejs@3` тягне `jake` → `filelist` → `minimatch@5`, а
  GHSA-g3hv-75wg-m249 (ReDoS) виправлено лише в `minimatch@11.0.1`, бекпорту на 5.x немає.
  `jake` потрібен тільки CLI `ejs`, не рендерингу; `filelist` з `minimatch@11` працює
  (перевірено `FileList.include`). Чому не `ejs@5+`, де залежностей немає: там прибрали
  режим `client: true`, на якому побудовано приклад `ejs/`.
- `body-parser` тепер оголошено явно: `params/index.js` імпортує його напряму, а раніше він
  приходив лише транзитивно з Express.
- `morgan`, `cookie-parser`, `method-override` додано, бо їх імпортує `routing/index.js`.
- `multer` 1.x → 2.x (CVE-2022-24434 та інші в `busboy`/`dicer`); API `diskStorage` і
  `.single()` той самий, завантаження перевірено.

Аналоги: `ex_fastify` `fastify@5.12.7` (було 2.x; `listen(3000)` → `listen({ port: 3000 })`),
`ex_hapi` `@hapi/hapi@21.4.12` (пакет `hapi@18` deprecated і мав 26 high), `ex_koa`
`koa@2.16.4`. У кожному `npm audit`: 0.

## Стан на Node 24.14.1

Перевірено 2026-10-31 після оновлення: стартують і відповідають усі файли верхнього рівня,
`params/`, `ejs/` (клієнтський шаблон рендерить «Hello John now you know …»), `files/`
(POST `/api/photo` зберігає файл), `routing/` (`/`, `/users`, `/user/0`, `/user/0/edit`,
`/posts` дають 200, PUT через `?_method=put` змінює користувача), `analogs/*`;
`handlebars/` друкує HTML і завершується.

У `routing/views/*.ejs` застарілу директиву `<% include header %>` (прибрана ще в EJS 3)
замінено на `<%- include('header') %>`; без цього всі сторінки `routing/` давали 500.

## Відомі проблеми

- `ejs/views/users.ejs`, `ejs/views/pages/index.ejs`: та сама застаріла директива
  `<% include … %>`; ці шаблони ніхто не рендерить, тож прикладу це не ламає.
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
  розмір і тип файлу. `files/uploads/` містить закомічений завантажений файл.
- Дрібне: `handlebars/index.js:11` шаблон шукається в поточному каталозі, помилка читання
  ігнорується; `params/index.js:26` у `app.use`-middleware `request.params` завжди порожній;
  `routing/user.js` `res.redirect('back')` прибрано в Express 5 (на 4.x працює);
  `analogs/ex_koa/index.js:9` без аргументу порт випадковий.

## Теорія

«HTTP-сервер у Node.js», «Методи HTTP», «Коди стану HTTP», «Дизайн REST API», «Ресурси та
URI», «Реальний час поверх HTTP» (polling), «XSS і CSP» (шаблонізатори), «Безпека Node.js»
(path traversal), «Практики Node.js» (Fastify, обробка помилок).
