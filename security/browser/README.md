# Браузерні механізми безпеки: SameSite, Fetch Metadata, CSP, Trusted Types

Код експериментів для розділів «Перевірено експериментом» у
`Obsidian Vault/Engineering/General/Security/CSRF.md` і `Security/XSS і CSP.md`
(і для уточнення про дефолт `SameSite` у `HTTP/Cookies і CORS.md`).

Один HTTPS-сервер на Node (`server.js`, без залежностей) грає чотири «сайти» за заголовком
`Host`: `a.test` (жертва), `sub.a.test` (піддомен жертви, той самий site), `b.test`
(зловмисник) і `cdn.test` («довірений CDN» з JSONP-ендпоінтом). `run.js` керує Chromium,
Firefox і WebKit через Playwright і друкує, що побачив сервер і що виконалось у сторінці.

## Запуск

```bash
bash run.sh                          # усе, разом із 125-секундним очікуванням для Lax+POST (~4 хв)
LAX_POST_WAIT_MS=-1 bash run.sh      # без сценарію Lax+POST (~1 хв)
BROWSERS=chromium bash run.sh        # один рушій
```

Усе живе в одному контейнері `mcr.microsoft.com/playwright:v1.61.0-noble` (`--rm`), порти на
хост не прокидаються, імена мапляться на 127.0.0.1 через `--add-host`. Сертифікат
самопідписаний (генерується в контейнері, браузер з `ignoreHTTPSErrors`); `playwright@1.61.0`
і `dompurify@3.2.6` ставляться в `/tmp` контейнера, тека прикладу монтується read-only.

Сценарії:

- **cookies**: `a.test/set` ставить `lax`, `strict`, `none`, `def` (без `SameSite`) і
  `sid` (`HttpOnly; SameSite=Lax`), усі `Secure`. Далі запити на `a.test/echo` з адресного
  рядка, same-origin форми, з `b.test` (форма `POST` `text/plain`, посилання, `<img>`,
  `<iframe>`, `fetch` `no-cors` і `application/json`, WebSocket) і з `sub.a.test`. Сервер
  логує cookies, `Sec-Fetch-*`, `Origin`, `Content-Type`, тіло, preflight.
- **XSS + HttpOnly**: reflected XSS читає `document.cookie` і робить `fetch` same-origin.
- **CSP**: сторінка з власним nonce-скриптом (що створює ще один через `createElement`) і
  відбитим payload: inline `<script>`, `<img onerror>`, `<script src>` на JSONP `cdn.test`,
  `<script src="/js/self.js">`, `javascript:` посилання. Сім варіантів політики.
- **DOM XSS / Trusted Types / DOMPurify**: `innerHTML = location.hash` у п'яти режимах.
- **framing**: `b.test` вбудовує сторінки з `frame-ancestors` (заголовок і `<meta>`) та
  `X-Frame-Options`.
- **Lax+POST**: свіжі `fresh_def` (без атрибута) і `fresh_lax`, крос-сайтовий `POST`
  одразу і через 125 с.

## Результати 2026-10-29

Версії: Playwright 1.61.0, Chromium 149.0.7827.55 (`channel: 'chromium'`, повна збірка),
Firefox 151.0, WebKit 26.5 (Linux-збірка Playwright, не Safari). Playwright запускає
Chromium з `--disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,BoundaryEventDispatchTracksNodeRemoval,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate,AutoDeElevate,RenderDocument,OptimizationHints,msForceBrowserSignIn,msEdgeUpdateLaunchServicesPreferredVersion`
(прапорців SameSite серед них немає).

Cookies (Chromium, вивід скорочено до значущих полів; Firefox і WebKit відрізняються лише
в позначених нижче місцях):

```
direct-get      GET     [def,lax,none,sid,strict] sfs=none        origin=null
so-post         POST    [def,lax,none,sid,strict] sfs=same-origin origin=https://a.test:8443
xs-post         POST    [def,none]                sfs=cross-site  origin=https://b.test:8443 ctype=text/plain body="{\"amount\":100,\"x\":\"=\"}\r\n"
xs-get          GET     [def,lax,none,sid]        sfs=cross-site  origin=null
xs-img          GET     [none]                    sfs=cross-site  dest=image
xs-iframe       GET     [none]                    sfs=cross-site  dest=iframe
xs-fetch-simple POST    [none]                    sfs=cross-site  mode=no-cors body="{\"amount\":100}"
xs-fetch-json   OPTIONS []                        sfs=cross-site  preflight acrm=POST   (POST не надіслано)
xs-ws           GET ws  [none]                    sfs=null mode=null dest=null origin=https://b.test:8443
ss-post         POST    [def,lax,none,sid,strict] sfs=same-site   origin=https://sub.a.test:8443
ss-fetch-simple POST    [def,lax,none,sid,strict] sfs=same-site
ss-ws           GET ws  [def,lax,none,sid,strict] sfs=null
xss-httponly    POST    [def,lax,none,sid,strict] sfs=same-origin      document.cookie = "lax=1; strict=1; none=1; def=1"
```

- Firefox 151: `def` присутня також у `xs-img`, `xs-iframe`, `xs-fetch-simple`, `xs-ws`
  (cookie без атрибута як `None`); на WebSocket `sfs=cross-site mode=websocket dest=empty`.
- WebKit 26.5: у `xs-post` лише `[none]` (немає двохвилинного винятку); на WebSocket
  `sfs=cross-site mode=websocket dest=websocket`.
- `def` у Chromium `xs-post` прийшла, бо була молодша за 2 хв (див. Lax+POST).

Lax+POST:

```
chromium-age~0s   POST [fresh_def]
firefox-age~0s    POST [fresh_def]
webkit-age~0s     POST []
chromium-age~125s POST []
firefox-age~125s  POST [fresh_def]
webkit-age~125s   POST []
```

`fresh_lax` (явний `Lax`) не прийшла жодного разу.

CSP, однаково в усіх трьох рушіях (1 = виконалось):

```
page               ok_nonce ok_dynamic pwn_inline pwn_handler pwn_jsonp ok_self pwn_jsurl
none               1        1          1          1           1         1       1
unsafeInline       1        1          1          1           0         1       1
allowlist          0        0          0          0           1         1       0
nonceUnsafeInline  1        0          0          0           0         0       0
strict             1        1          0          0           0         0       0
compat             1        1          0          0           0         0       0
ro                 1        1          1          1           1         1       1
report-only: reports received by /csp-report = 5 (Chromium) / 6 (Firefox) / 7 (WebKit)
```

DOM XSS, однаково в усіх трьох:

```
raw:        assigned        <script>=0 onerror=1 <b>kept=1
tt:         TypeError       <script>=0 onerror=0 <b>kept=0
tt-policy:  assigned(empty) <script>=0 onerror=0 <b>kept=0   (trusted-types app: DOMPurify не створив свою політику)
tt-policy2: assigned        <script>=0 onerror=0 <b>kept=1   (trusted-types app dompurify)
purify:     assigned        <script>=0 onerror=0 <b>kept=1   DOMPurify 3.2.6
```

Framing з `b.test`, однаково в усіх трьох: `frame-ancestors 'none'` (заголовок) BLOCKED,
`X-Frame-Options: DENY` BLOCKED, `frame-ancestors 'self'` BLOCKED, `frame-ancestors 'none'`
у `<meta>` **loaded**.

## Обмеження

- WebKit тут це Linux-збірка Playwright; поведінку Safari на macOS/iOS вона не гарантує.
- Хости `.test` не в Public Suffix List, тож `a.test` і `b.test` різні сайти за правилом `*`,
  а `sub.a.test` той самий site, що й `a.test`, як у реальних доменах.
- Schemeful same-site (`http` проти `https`) не перевірявся: усе по HTTPS.
- Обхід allowlist показано на власному JSONP-ендпоінті, а не на реальному CDN.
