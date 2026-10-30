# Секрети, які «прибрали», лишаються на місці

Код для розділу «Перевірено експериментом» нотатки
`Obsidian Vault/Engineering/General/Security/Керування секретами.md`.
Усі значення — фейкові.

## Запуск

```bash
bash run.sh      # збирає образ, показує п'ять витоків, усе прибирає
```

Потрібні Docker і git. Образ `busybox:1.36`.

## Результати 2026-10-29 (Docker 29.7.2)

| # | Прийом | Що показано |
| --- | --- | --- |
| 1 | `ARG API_KEY=…`, `ENV DB_PASSWORD=…` | `docker history --no-trunc` друкує і крок `RUN \|1 API_KEY=fake-ARG-key-1111 …`, і шар `ENV DB_PASSWORD=fake-ENV-password-2222`. BuildKit навіть попереджає: `SecretsUsedInArgOrEnv`. |
| 2 | `ENV` у запущеному контейнері | `docker inspect -f '{{.Config.Env}}'` віддає `DB_PASSWORD=fake-ENV-password-2222`. |
| 3 | `COPY .env` потім `RUN rm /app/.env` | Файл видалено у наступному шарі, але `docker save` + grep знаходить `fake-dotenv-secret-3333` у блобі шару `blobs/sha256/ba773fc9…`. Видалення — це новий шар, попередній зберігає файл. |
| 4 | `/proc/<pid>/environ` | `tr '\0' '\n' < /proc/<pid>/environ` того ж користувача віддає `SECRET_PROC=fake-proc-secret-4444`. Будь-який процес під тим самим UID (та root) бачить оточення. |
| 5 | Коміт, що «видаляє» секрет | HEAD чистий (`token=${TOKEN_FROM_ENV}`), але `git log -p` досі містить `-token=fake-git-secret-5555` з першого коміту. Видалення у новому коміті історію не чистить. |

Вивід `docker history` (крок 1):

```
RUN |1 API_KEY=fake-ARG-key-1111 /bin/sh -c echo "used $API_KEY" > /app/build.log && rm /app/.env
COPY .env /app/.env # buildkit
ENV DB_PASSWORD=fake-ENV-password-2222
ARG API_KEY=fake-ARG-key-1111
```

## Висновок

Усе п'ять відтворено. Спільне: секрет лишає слід у шарі / історії / оточенні, який
переживає «видалення» в наступному стані. Тому після витоку перший крок — **ротація**
(знецінити секрет), а чистка історії/шарів — вторинна. Для образів: `--secret`
(BuildKit secret mount), не `ARG`/`ENV`/`COPY .env`. Для git: push protection і
сканування (gitleaks, GitHub secret scanning) до того, як секрет потрапить у коміт.

Файли: `Dockerfile`, `run.sh`.
