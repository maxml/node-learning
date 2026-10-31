# WebSocket у Node.js: lifecycle і межі гарантій

Детерміновані досліди для лекції 19. Це лабораторія на loopback з асертами, не сервер для публічного розгортання. Вихід після успішного прогону — 0; помилка асерта чи дедлайн 20 секунд дає ненульовий вихід.

## Запуск однією командою

З кореня цього репозиторію:

```bash
cd websocket-node/lifecycle && npm ci --ignore-scripts && npm start
```

У середовищі з read-only npm cache передати `--cache /tmp/ws-research-npm-cache` команді npm ci. Залежності закріплені: ws 8.22.0, socket.io 4.8.4, socket.io-client 4.8.4; дерево в package-lock.json. Прогін автора: Node.js v24.14.1, npm 11.12.1, Linux, 2026-10-31.

## Що перевіряємо

| Випадок у виводі | Спостереження |
| --- | --- |
| native-and-binary | глобальний WebSocket клієнт Node спілкується з ws, не надсилає Origin; binary echo зберігає байти; upgrade не викликає звичайний request-handler |
| upgrade-policy | явна політика лабораторії дає 403 для чужого Origin, 401 для відсутнього demo auth та 503 при draining |
| message-limit | два фрагменти стають одним hello; сумарні 1200 байтів при maxPayload 1024 закриваються кодом 1009 |
| fragment-limit | три однобайтові фрагменти при maxFragments 2 дають 1008 і WS_ERR_TOO_MANY_BUFFERED_PARTS попри малий розмір |
| heartbeat | ws автоматично відповідає pong; autoPong:false не відповідає; terminate дає клієнту 1006 |
| slow-consumer | callback send завершується до читання повідомлення застосунком; pause клієнта створює backpressure; наступну посилку відсікає бюджет 1 MiB |
| shutdown | після server.close і closeAllConnections WebSocket продовжує echo; явний close(1001) завершує сесію |
| shutdown-deadline | клієнт, який не читає Close, потребує terminate за дедлайном |
| socketio | plain WebSocket на Engine.IO endpoint отримує протокольний пакет 0{...}; socket.io-client виконує прикладний echo з ack |

Відсутній Origin дозволено **лише для loopback-лабораторії**. `Bearer research-demo` — публічний рядок для перевірки гілки, без сесій чи реальної ідентифікації. Браузер не задає такий Authorization через конструктор WebSocket; тут його надсилає клієнт бібліотеки ws. Для браузерного сервера потрібна визначена auth-політика, перевірка Origin і авторизація кожного повідомлення.

## Реальний вивід

Прогін 2026-10-31T10:29:13.719Z, ключові рядки:

```text
message-limit {"fragmentsReassembled":"hello","aggregateBytes":1200,"maxPayload":1024,"closeCode":1009,"serverError":"WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"}
fragment-limit {"totalBytes":3,"maxPayload":1024,"maxFragments":2,"closeCode":1008,"serverError":"WS_ERR_TOO_MANY_BUFFERED_PARTS"}
slow-consumer {"callbackApplicationMessages":0,"writes":56,"bufferedAmount":983190,"budget":1048576,"nextSendRejected":true}
shutdown {"afterHttpCloseAll":"still-open","explicitWebSocketClose":1001}
result {"passed":true,"cases":9}
```

Повний фактичний вивід у output.txt, машинні результати в results.json; обидва файли генерує experiment.mjs після успіху й перезаписує при наступному запуску. package-lock.json створено npm. Кількість writes і bufferedAmount залежать від ОС, TCP-буферів і планування; це спостереження, не benchmark чи гарантія ємності. Надійний висновок: локальний callback не доводить обробку клієнтом, а ліміт зупиняє producer.

## Дослід фактчеку: closeTimeout у ws

Додано під час незалежного фактчеку (Claude Code subagent, claude-opus-5-5). Кейс `shutdown-deadline` вище показує, що через 50 мс Close ще не завершено; він не показує, що `ws` чекає вічно. У `ws` 8.22.0 є опція `closeTimeout` (типово 30000 мс): після `close()` бібліотека сама знищує сокет, якщо peer не відповів Close.

```bash
cd websocket-node/lifecycle && npm ci --ignore-scripts && npm run close-timeout
```

Прогін 2026-10-31T10:39:27Z, Node.js v24.14.1, ws 8.22.0, близько 31 с:

```text
cooperative {"pause":false,"closeTimeout":"default","serverCloseCode":1001,"ms":4}
closeTimeout-300 {"pause":true,"closeTimeout":300,"serverCloseCode":1006,"ms":301}
closeTimeout-default {"pause":true,"closeTimeout":"default","serverCloseCode":1006,"ms":30001}
```

Висновок: клієнт, що не читає Close, `ws` закриває сам через `closeTimeout` з кодом 1006 на сервері. Типові 30 с збігаються з типовим `stopTimeout` Fargate (30 с), тому власний дедлайн `terminate()` чи менший `closeTimeout` потрібні, щоб устигнути до SIGKILL, а не тому, що інакше закриття не настане ніколи.

## Межі й прибирання

Скрипт слухає лише 127.0.0.1 на динамічних портах; фікстури в finally закривають HTTP/WebSocket, сокети й Socket.IO. Немає Docker, фонових процесів, зовнішніх сервісів чи облікових даних. Native клієнт використано замість браузера: browser cookies, WSS/TLS, ALB/ECS, повторна доставка після reconnect і мультиінстансний adapter цим прогоном не перевірені. Рядок plainApplicationEcho:false означає, що перший пакет є Engine.IO handshake; це не спроба вичерпно довести несумісність усіх протокольних комбінацій. Несумісність plain WebSocket API з прикладним Socket.IO описана в офіційних документах.

## Першоджерела

- [ws API 8.22.0](https://github.com/websockets/ws/blob/8.22.0/doc/ws.md)
- [ws heartbeat](https://github.com/websockets/ws/blob/8.22.0/README.md#how-to-detect-and-close-broken-connections)
- [Node HTTP v24.14.1](https://github.com/nodejs/node/blob/v24.14.1/doc/api/http.md#servercloseallconnections)
- [Socket.IO introduction](https://socket.io/docs/v4/)
- [ws fragment DoS advisory](https://github.com/websockets/ws/security/advisories/GHSA-96hv-2xvq-fx4p)
