# ex_grpc

Лекція 19 «Сокети. gRPC. NoSQL». Офіційні приклади gRPC для Node.js (Apache 2.0, автори
gRPC) з динамічною генерацією коду: `.proto` читається під час запуску через
`@grpc/proto-loader`, без `protoc`.

| Файл | Що показує |
| --- | --- |
| `helloworld.proto` | сервіс `Greeter` з двома unary-методами `SayHello`, `SayHelloAgain` |
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
```

Детальний розбір: «gRPC Basics: Node.js» на grpc.io. Початковий текст цього README
(«gRPC in 3 minutes») згадував ще `static_codegen/`, але в репозиторій ця тека не потрапила.

## Стан на Node 24.14.1

Не запускається. Пакет `grpc@1.24.2` це нативний аддон, а готової збірки під Node 24
(ABI `node-v137`) немає; збірка з вихідників (`npm rebuild grpc`) падає на компіляції.
Обидва сервери завершуються помилкою `Failed to load … grpc_node.node`.
Пакет `grpc` deprecated; заміна, чистий JS без збірки: `@grpc/grpc-js` (той самий API
`Server`, `credentials`, `loadPackageDefinition`).

## Відомі проблеми

- `package.json`: залежність `grpc` (нативна, deprecated) замість `@grpc/grpc-js`;
  `@grpc/proto-loader@0.1.0` дуже стара.
- `dynamic_codegen/route_guide/route_guide_server.js:19` і `route_guide_client.js:19`:
  `PROTO_PATH` вказує на `../../../protos/route_guide.proto`, такого файлу в репозиторії
  немає.
- `dynamic_codegen/greeter_client.js:39`, `:43`: `err` не перевіряється; якщо сервер
  недоступний, `response.message` кидає `TypeError`.
- `dynamic_codegen/greeter_server.js:53`: `bind` без перевірки результату й без TLS
  (`createInsecure`); для навчального прикладу нормально, для продакшну ні.

## Теорія

- «REST проти GraphQL і gRPC»
- «Версії HTTP» (gRPC працює поверх HTTP/2)
- «Дизайн REST API» (порівняння контрактів)
