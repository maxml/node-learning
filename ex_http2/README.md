# ex_http2

Лекція 19 «Сокети. gRPC. NoSQL» (HTTP/2). Два сервери HTTP/2 поверх TLS із самопідписаним
сертифікатом.

| Файл | Що показує |
| --- | --- |
| `http2.js` | вбудований модуль `http2`: `createSecureServer`, подія `stream`, `stream.respond()` з псевдозаголовком `:status` |
| `spdy.js` | Express поверх пакета `spdy` (HTTP/2 для Express 4) |
| `server.key`, `server.csr`, `server.crt` | ключ, запит і самопідписаний сертифікат для обох серверів |

Як згенерувати сертифікат (зі старого файлу `README` поруч):

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
node http2.js 8443                         # порт першим аргументом
curl -k --http2 https://localhost:8443/    # -k: сертифікат самопідписаний і прострочений
```

## Стан на Node 24.14.1

- `http2.js`: працює; `curl -k --http2` отримує `<h1>Hello World</h1>`. Без `-k` клієнт
  відмовляє (самопідписаний сертифікат).
- `spdy.js`: падає одразу: `Error: No such module: http_parser` з залежності
  `http-deceiver`, яка викликає `process.binding('http_parser')`; цього внутрішнього
  модуля в сучасному Node немає. Пакет `spdy` не підтримується; HTTP/2 з Express роблять
  через проксі (nginx, балансувальник) або беруть Fastify з `http2: true`.

## Відомі проблеми

- `server.key`: приватний ключ закомічено в репозиторій. Для демо прийнятно, але ключ
  скомпрометований за визначенням; сертифікат `server.crt` прострочений з квітня 2021.
- `http2.js:20`: без аргументу `port` дорівнює `undefined`, і сервер слухає випадковий
  порт; `:19` друкує весь `process.argv`.
- `http2.js:22-25`: колбек `listen` не отримує помилки; помилки прослуховування приходять
  подією `error` (`:9`).

## Теорія

- «Версії HTTP»
- «HTTPS і TLS»
- «Повідомлення HTTP» (псевдозаголовки HTTP/2)
