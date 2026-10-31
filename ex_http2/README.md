# ex_http2

Лекція 19 «Сокети. gRPC. NoSQL» (HTTP/2). Сервери HTTP/2 поверх TLS із самопідписаним
сертифікатом.

| Файл | Що показує |
| --- | --- |
| `http2.js` | вбудований модуль `http2`: `createSecureServer`, подія `stream`, `stream.respond()` з псевдозаголовком `:status` |
| `fastify.js` | той самий JSON-ендпоінт, що й у `spdy.js`, на Fastify з `http2: true` (`allowHTTP1` для старих клієнтів); додано 2026-10-31 як робоча заміна |
| `spdy.js` | історичний: Express поверх пакета `spdy`; на Node 24 не запускається (див. нижче) |
| `.gitignore` | `server.key`, `server.crt`, `server.csr` генеруються локально й не комітяться |

## Сертифікат

Ключ і сертифікат генеруються локально перед запуском, у репозиторії їх немає:

```bash
npm run cert     # openssl req -x509 … -subj /CN=localhost -keyout server.key -out server.crt
```

Довший шлях зі старого файлу `README` поруч (ключ, CSR, підпис) дає те саме:

```bash
openssl genrsa -des3 -passout pass:x -out server.pass.key 2048
openssl rsa -passin pass:x -in server.pass.key -out server.key
rm server.pass.key
openssl req -new -key server.key -out server.csr
openssl x509 -req -sha256 -days 365 -in server.csr -signkey server.key -out server.crt
```

## Запуск

```bash
cd ex_http2
npm ci
npm run cert
node http2.js 8443                         # порт першим аргументом
curl -k --http2 https://localhost:8443/    # -k: сертифікат самопідписаний
node fastify.js                            # порт 3000
curl -k --http2 https://localhost:3000/    # {"message":"You are working with Http/2.0"}
```

## Залежності

`fastify@5.12.7` (точна версія). `npm audit`: 0 вразливостей; до 2026-10-31 було 9
(1 critical, 4 high, 4 low) у `express@4` і `spdy`. `http2.js` залежностей не має.

## Стан на Node 24.14.1

Перевірено 2026-10-31 зі свіжим `npm run cert`:

- `http2.js`: працює; `curl -k --http2` отримує `<h1>Hello World</h1>` по HTTP/2. Без `-k`
  клієнт відмовляє (самопідписаний сертифікат).
- `fastify.js`: працює; `curl -k --http2` дає `{"message":"You are working with Http/2.0"}`,
  `curl -k --http1.1` той самий ендпоінт по HTTP/1.1.
- `spdy.js`: не запускається. Ще до оновлення падав з `Error: No such module: http_parser`
  із залежності `http-deceiver` (`process.binding('http_parser')`, якого в сучасному Node
  немає); пакет `spdy` не підтримується з 2020 року, а його дерево разом з `express@4`
  давало всі 9 вразливостей цієї теки. `spdy` і `express` прибрано з `package.json`, файл
  лишився як історія. Express не працює поверх `http2.createSecureServer` навіть з
  `allowHTTP1` (перевірено з Express 5.3.0: `TypeError … reading 'readable'`), бо його
  `req`/`res` наслідують класи HTTP/1; HTTP/2 з Express роблять через проксі (nginx,
  балансувальник), а нативно це вміє Fastify, звідси `fastify.js`.

Прострочений (квітень 2021) і закомічений ключ `server.key` разом із `server.crt` та
`server.csr` прибрано з репозиторію 2026-10-31: приватний ключ у публічному репо
скомпрометований за визначенням.

## Відомі проблеми

- `http2.js:20`: без аргументу `port` дорівнює `undefined`, і сервер слухає випадковий
  порт; `:19` друкує весь `process.argv`.
- `http2.js:22-25`: колбек `listen` не отримує помилки; помилки прослуховування приходять
  подією `error` (`:9`).

## Теорія

- «Версії HTTP»
- «HTTPS і TLS»
- «Повідомлення HTTP» (псевдозаголовки HTTP/2)
