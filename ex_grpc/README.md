# ex_grpc

Лекція 19 «Сокети. gRPC. NoSQL». Офіційні приклади gRPC для Node.js (Apache 2.0, автори
gRPC) з динамічною генерацією коду: `.proto` читається під час запуску через
`@grpc/proto-loader`, без `protoc`.

| Файл | Що показує |
| --- | --- |
| `helloworld.proto` | сервіс `Greeter` з двома unary-методами `SayHello`, `SayHelloAgain` |
| `route_guide.proto` | сервіс `RouteGuide` з офіційних прикладів gRPC (додано 2026-10-31, у репозиторій він не потрапив) |
| `dynamic_codegen/greeter_server.js` | сервер `Greeter` на `0.0.0.0:50051` без TLS |
| `dynamic_codegen/greeter_client.js` | клієнт, що викликає обидва методи |
| `dynamic_codegen/route_guide/route_guide_server.js` | усі чотири види RPC: unary `getFeature`, server streaming `listFeatures`, client streaming `recordRoute`, bidi `routeChat` |
| `dynamic_codegen/route_guide/route_guide_client.js` | клієнт до цих чотирьох методів |
| `dynamic_codegen/route_guide/route_guide_db.json` | точки для `route_guide` |

## Запуск (як задумано)

```bash
cd ex_grpc
npm ci
node ./dynamic_codegen/greeter_server.js &
node ./dynamic_codegen/greeter_client.js

cd dynamic_codegen/route_guide
node route_guide_server.js --db_path=route_guide_db.json &
node route_guide_client.js --db_path=route_guide_db.json
```

Детальний розбір: «gRPC Basics: Node.js» на grpc.io. Початковий текст цього README
(«gRPC in 3 minutes») згадував ще `static_codegen/`, але в репозиторій ця тека не потрапила.

## Залежності

`@grpc/grpc-js@1.14.7`, `@grpc/proto-loader@0.8.1`, `async@3.2.6`, `lodash@4.18.1`,
`minimist@1.2.8` (точні версії). `npm audit`: 0 вразливостей.

## Стан на Node 24.14.1

Запускається (перевірено 2026-10-31): `greeter_client.js` друкує `Greeting: Hello you` і
`Greeting: Hello again, you`; `route_guide_client.js` проходить усі чотири демо
(`getFeature`, `listFeatures`, `recordRoute`, `routeChat`).

Що змінилося 2026-10-31 і чому:

- Нативний deprecated `grpc@1.24.2` (не збирався під Node 24, ABI `node-v137`, і мав
  15 вразливостей у дереві) замінено на чистий JS `@grpc/grpc-js`. API той самий, крім
  запуску сервера: `server.bind(...)` + `server.start()` стали
  `server.bindAsync(addr, creds, cb)`; сервер приймає запити, щойно порт зайнятий.
- `route_guide_server.js`: `addProtoService` (видалений ще в `grpc` 1.x) замінено на
  `addService`.
- `google-protobuf` прибрано: його ніщо не імпортує (він потрібен лише для
  `static_codegen`).
- Додано `route_guide.proto`, а `PROTO_PATH` у `route_guide_*.js` тепер
  `../../route_guide.proto`.
- `greeter_client.js`: перевіряється `err`, тож без сервера клієнт друкує помилку, а не
  падає на `response.message`.

## Відомі проблеми

- `dynamic_codegen/greeter_server.js:55` і `route_guide_server.js`: сервер без TLS
  (`createInsecure`); для навчального прикладу нормально, для продакшну ні.

## Теорія

- «REST проти GraphQL і gRPC»
- «Версії HTTP» (gRPC працює поверх HTTP/2)
- «Дизайн REST API» (порівняння контрактів)
