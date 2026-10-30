# Діагностика replica set: експеримент

Код, на який спирається нотатка `Obsidian Vault/Engineering/General/Mongo/Діагностика кластера MongoDB.md`.
Три `mongod` в окремих контейнерах (`cdiag-m1..m3`, мережа `cdiag-net`, без портів на хості),
тож можна заморозити чи заблокувати один вузол, не чіпаючи решту.

| Файл      | Що робить |
| --------- | --------- |
| `run.sh`  | піднімає replica set, проганяє сценарії A–G, прибирає контейнери й мережу (`trap … EXIT`) |
| `diag.js` | функції для `mongosh`: компактний `rs.status()`, генератор записів, очікування наздоганяння, звіт про вибори, вибірка `initialSyncStatus` |

## Запуск

```bash
cd examples/mongo/cluster-diagnostics
bash run.sh            # ~3 хв; потрібен образ mongo:9 (IMG=... щоб змінити)
```

Сценарії:

- **A.** `db.fsyncLock()` на secondary `m3`: вузол живий, але не застосовує oplog. Записи `w:1`, 2000 док/с.
- **B.** `docker pause` на `m3`: вузол не відповідає взагалі.
- **C.** `fsyncLock` на обох secondary: відстає більшість. Записи по одному документу без обмеження швидкості.
- **D.** `rs.printReplicationInfo()` і `replSetResizeOplog` (500 МБ, потім 990 МБ).
- **E1.** `docker stop` primary (чиста зупинка), потім `docker start` (у `m1` `priority: 2`).
- **E2.** `docker pause` primary (зависання).
- **F.** Повідомлення `ELECTION`/`REPL` з лога `m2`.
- **G.** `m3` перестворено з порожнім `dbPath`: initial sync.

## Результат, 2026-10-30

MongoDB 9.0.4 (`mongo:9`), Docker на одному хості (Linux 6.8). Три повні прогони; нижче числа
другого й третього (перший мав помилки в скрипті, його дані про вибори збігаються з наведеними).

| Сценарій | Що показали інструменти |
| -------- | ----------------------- |
| A: `m3` під `fsyncLock`, 15 с запису | `rs.status()`: `m3` `SECONDARY`, `health=1`, `pingMs=0`, `optimeDate` застиг, лаг 22 с; `rs.printSecondaryReplicationInfo()`: «23 secs behind the primary». `flowControl.isLagged=false`. `w:"majority"` проходить. Після `fsyncUnlock` наздогнав за 0,01–1,4 с |
| B: `m3` на паузі | `stateStr` «(not reachable/healthy)», `health=0`, `optimeDate` = 1970-01-01, `lastHeartbeatMessage` «Request … timed out»; `rs.printSecondaryReplicationInfo()` для `m3`: «no replication info, yet». `isLagged=false`. Після `unpause` наздогнав за 0,8–0,9 с |
| C: обидва secondary під `fsyncLock` | до блокування 450–650 вставок/с; через ~2 с після блокування рівно 97–100/с до кінця (40 с). `isLagged=true`, `targetRateLimit=100`, `timeAcquiringMicros` ≈ 31–33 с. У першому прогоні той самий сценарій пачками по 50 документів (40 операцій/с) **не** гальмувався, хоча `isLagged=true`: flow control рахує операції, не документи |
| D: oplog | типовий розмір 1321–1355 МБ (≈5% вільного місця на диску з ~27 ГБ); «log length start to end» 115–118 с, тобто вік історії, а не місткість. `size: 500` → `BadValue: … must be >= 990`; `size: 990, minRetentionHours: 1` → `ok`, `maxSize` 990 МБ |
| E1: `docker stop` primary | `lastElectionReason=stepUpRequestSkipDryRun`, `electionMetrics.stepUpCmd=1/1`; новий primary приймає `w:"majority"` через **65–106 мс** після команди |
| E1: повернення `m1` (`priority: 2`) | `m1` знову primary через **12,2–12,7 с** після `docker start`, `lastElectionReason=priorityTakeover`: другий failover |
| E2: `docker pause` primary | `lastElectionReason=electionTimeout`; вибори почались через 9,5–10,2 с, запис `w:"majority"` можливий через **10,6–11,4 с**. Старий primary після `unpause`: `numStepDownsCausedByHigherTerm=1` |
| F: лог `m2` | «Member is now in state DOWN», «Election succeeded, assuming primary role», «Entering primary catch-up mode», «Transition to primary complete; database writes are now permitted», «Stepping down from primary, because a new term has begun» (компоненти `ELECTION`/`REPL`) |
| G: initial sync 88 тис. документів, 92 МБ | фази `initialSyncStatus.phase`: `selectingSyncSource` → `preparingStorage` → `cloningData` → `complete` → `SECONDARY` за ~3 с; `bytesPerSecond` до 25,7 МБ/с, `totalAttempts=1`. Лог (`INITSYNC`): «Starting initial sync attempt», «Finished cloning data. Beginning oplog replay», «Initial sync done». В іншому прогоні `rs.status()` на `m2` ще показував `m3` як `STARTUP`, коли сам `m3` уже був у `STARTUP2` |

Обмеження: усі вузли на одному хості, тож мережевих затримок немає (`pingMs=0`), а час
наздоганяння вимірюється опитуванням `rs.status()` кожні 100 мс і залежить від того, коли
дійшов звіт про позицію secondary. Час виборів залежить від фази heartbeat у момент збою
й `electionTimeoutMillis` (типово 10 с) з випадковим зсувом, тож це порядок величин, а не
константа.
