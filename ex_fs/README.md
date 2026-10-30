# ex_fs

Лекції 11 «Проміси. Файли. Помилки» і 13 «Прототипи. FS 2. Git 2». Модулі `fs`, `path`,
`stream`, `readline`, `zlib`, `crypto`. Кожен приклад у своїй функції; майже всі виклики
закоментовані.

| Файл | Що показує |
| --- | --- |
| `ioFiles.js` | `readFile`, `writeFile`, `appendFile`, `unlink`, `rename`, `access`, `stat` на колбеках |
| `ioFolders.js` | `existsSync` + `mkdirSync`, `readdir` |
| `path.js` | `basename`, `dirname`, `extname`, `format`, `join`, `normalize`, `parse`, `relative`, `resolve` |
| `advanced.js` | `fs.stat`, відбір файлів через `lstatSync`, построкове читання великого файлу `readline` |
| `streams.js` | генерація великого файлу, `createReadStream`, власні `Readable`/`Duplex`/`Transform`, object mode, gzip, шифрування в конвеєрі |

## Запуск

```bash
cd ex_fs
npm ci              # colors, fs-extra
mkdir -p ex         # файли прикладів читають і пишуть у ./ex/ відносно поточного каталогу
node path.js
```

## Стан на Node 24.14.1

- `path.js`: працює, друкує результати.
- `ioFiles.js`, `advanced.js`, `streams.js`: код виходу 0, але нічого не роблять (виклики
  закоментовані).
- `ioFolders.js`: друкує `ENOENT`, див. нижче.

## Відомі проблеми

- `ioFolders.js:2`: абсолютний шлях з машини автора; `readDir()` (`:24`) завжди дає `ENOENT`.
- `streams.js:174`: `crypto.createCipher` прибрано в Node 22; `simpleCrypto()` впаде з
  `TypeError`. Потрібен `createCipheriv` з ключем і IV.
- `streams.js:39`: `readable.pipe(process.stdin)` пише в потік читання; `:46`
  `readable.end()` у `Readable` немає, це `TypeError` на події `end`.
- `streams.js:13-19`: 10 млн `write()` без перевірки повернутого значення й `drain`;
  буфер росте в пам'яті (файл близько 4,4 ГБ: 444 байти × 10 млн рядків).
- `ioFiles.js:89-94`: `renameFile` викликає асинхронний `writeFile` і одразу `rename`,
  без очікування: гонка.
- `ioFiles.js:16-18`: будь-яка помилка `access` друкується як «doesn't exist», зокрема
  відсутність права на виконання.

## Теорія

- «Файлова система в Node.js»
- «Стріми в Node.js»
- «Блокуючі та неблокуючі операції в Node.js»
- «Асинхронні ітератори в Node.js» (сучасна заміна `readline`-колбеків)
