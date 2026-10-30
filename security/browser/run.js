// Драйвер: Chromium, Firefox, WebKit з Playwright проти server.js.
// Друкує, які cookies і які Sec-Fetch-* / Origin побачив сервер у кожному сценарії,
// які скрипти виконались під різними CSP і чи завантажились фрейми.
'use strict';
const { execSync } = require('child_process');
const pw = require(process.env.PW || 'playwright');

const P = 8443;
const A = `https://a.test:${P}`, B = `https://b.test:${P}`, SUB = `https://sub.a.test:${P}`;
const WAIT_MS = Number(process.env.LAX_POST_WAIT_MS || 125000);
const only = (process.env.BROWSERS || 'chromium,firefox,webkit').split(',');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function launch(name) {
  const opts = name === 'chromium' ? { channel: 'chromium' } : {}; // повний Chromium, не headless shell
  const browser = await pw[name].launch(opts);
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  return { name, browser, ctx };
}

async function getLog(ctx) { return (await ctx.request.get(`${A}/log`)).json(); }
async function reset(ctx) { await ctx.request.get(`${A}/reset`); }

function row(e) {
  return [e.t || (e.report ? 'csp-report' : e.path), e.method, e.ws ? 'ws' : '', `[${e.cookies.join(',')}]`,
    `sfs=${e.sfs}`, `mode=${e.sfm}`, `dest=${e.sfd}`, `origin=${e.origin}`,
    e.ctype ? `ctype=${e.ctype}` : '', e.body ? `body=${JSON.stringify(e.body.slice(0, 60))}` : '',
    e.preflight ? `preflight acrm=${e.acrm}` : ''].filter(Boolean).join(' ');
}

async function cookieSuite({ name, ctx }) {
  const page = await ctx.newPage();
  await page.goto(`${A}/set`);
  await reset(ctx);
  const nav = async (url, after) => { await page.goto(url); if (after) await after(); await sleep(700); };
  await nav(`${A}/echo?t=direct-get`);                       // набрано в адресному рядку
  await nav(`${A}/self-post`);                                // same-origin форма
  await nav(`${B}/attack-post?t=xs-post`);                    // крос-сайтова форма POST, верхній рівень
  await nav(`${B}/attack-link?t=xs-get`, () => page.click('#l'));
  await nav(`${B}/attack-img?t=xs-img`);
  await nav(`${B}/attack-iframe?t=xs-iframe`);
  await nav(`${B}/attack-fetch?t=xs-fetch`, () => page.waitForFunction('window.done', null, { timeout: 5000 }).catch(() => {}));
  await nav(`${B}/attack-ws?t=xs-ws`);
  await nav(`${SUB}/attack-post?t=ss-post`);                  // піддомен: той самий site
  await nav(`${SUB}/attack-fetch?t=ss-fetch`, () => page.waitForFunction('window.done', null, { timeout: 5000 }).catch(() => {}));
  await nav(`${SUB}/attack-ws?t=ss-ws`);
  // XSS на a.test без CSP: чи бачить скрипт HttpOnly cookie і чи йде вона з його запитом
  const x = `<script>window.dc=document.cookie;fetch('/echo?t=xss-httponly',{method:'POST',body:'as-victim'})</script>`;
  await nav(`${A}/csp-none?x=${encodeURIComponent(x)}`);
  const dc = await page.evaluate('window.dc');
  console.log(`\n### ${name}: cookies / Sec-Fetch / Origin (cookies set: lax strict none def sid[HttpOnly,Lax])`);
  for (const e of await getLog(ctx)) console.log('  ' + row(e));
  console.log(`  xss: document.cookie = ${JSON.stringify(dc)}`);
  await page.close();
}

const PAYLOAD = [
  `<script>window.pwn_inline=1</script>`,
  `<img src=x onerror="window.pwn_handler=1">`,
  `<script src="https://cdn.test:${P}/jsonp?callback=window.pwn_jsonp=1;void"></script>`,
  `<script src="/js/self.js"></script>`,
  `<a id=j href="javascript:window.pwn_jsurl=1">j</a>`,
].join('');
const FLAGS = ['ok_nonce', 'ok_dynamic', 'pwn_inline', 'pwn_handler', 'pwn_jsonp', 'ok_self', 'pwn_jsurl'];

async function cspSuite({ name, ctx }) {
  console.log(`\n### ${name}: CSP (1 = виконалось). Payload: inline <script>, onerror, JSONP з cdn.test, /js/self.js, javascript: URL`);
  console.log(`  ${'page'.padEnd(18)} ${FLAGS.join(' ')}  violations`);
  await reset(ctx);
  for (const kind of ['none', 'unsafeInline', 'allowlist', 'nonceUnsafeInline', 'strict', 'compat', 'ro']) {
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__v = [];
      document.addEventListener('securitypolicyviolation', e => window.__v.push(e.effectiveDirective));
    });
    await page.goto(`${A}/csp-${kind}?x=${encodeURIComponent(PAYLOAD)}`);
    await sleep(800);
    await page.click('#j').catch(() => {});
    await sleep(500);
    const r = await page.evaluate(`[${FLAGS.map(f => `window.${f}?1:0`).join(',')}, window.__v.join('|')]`);
    const v = r.pop();
    console.log(`  ${kind.padEnd(18)} ${r.map((x, i) => String(x).padEnd(FLAGS[i].length)).join(' ')}  ${v}`);
    await page.close();
  }
  await sleep(1500);
  const reports = (await getLog(ctx)).filter(e => e.report).length;
  console.log(`  report-only: reports received by /csp-report = ${reports}`);

  // DOM XSS через innerHTML, Trusted Types, DOMPurify
  const dom = `<script>window.pwn_dom_script=1</script><img src=x onerror="window.pwn_dom=1"><b id=keep>ok</b>`;
  const dr = [];
  for (const mode of ['raw', 'tt', 'tt-policy', 'tt-policy2', 'purify']) {
    const pg = await ctx.newPage();
    await pg.goto(`${A}/dom?mode=${mode}#${encodeURIComponent(dom)}`);
    await sleep(600);
    const r = await pg.evaluate(`({r: window.r + (document.getElementById('out').innerHTML === '' ? '(empty)' : ''), script: window.pwn_dom_script?1:0, onerror: window.pwn_dom?1:0, b: document.getElementById('keep')?1:0, v: window.purifyVersion})`);
    dr.push(`${mode}: ${r.r} <script>=${r.script} onerror=${r.onerror} <b>kept=${r.b}`);
    if (mode === 'purify') dr.push(`DOMPurify ${r.v}`);
    await pg.close();
  }
  console.log(`  DOM XSS (innerHTML from location.hash): ${dr.join(' | ')}`);

  const page = await ctx.newPage();
  await page.goto(`${B}/frames`);
  await sleep(1500);
  const res = [];
  for (const k of ['fa', 'xfo', 'meta', 'sameorigin']) {
    const f = page.frame({ name: k });
    let v = 'blocked';
    try { v = (await f.evaluate(() => document.getElementById('c')?.textContent)) || 'blocked'; } catch { }
    res.push(`${k}=${v === 'blocked' ? 'BLOCKED' : 'loaded'}`);
  }
  console.log(`  framing from b.test: ${res.join(' ')}  (fa: frame-ancestors 'none' header; xfo: X-Frame-Options DENY; meta: frame-ancestors in <meta>; sameorigin: frame-ancestors 'self')`);
  await page.close();
}

async function laxPostSuite(all) {
  console.log(`\n### Lax-by-default "Lax+POST": cookie без SameSite (fresh_def) проти явного Lax (fresh_lax), крос-сайтовий POST верхнього рівня`);
  for (const b of all) {
    b.ctx2 = await b.browser.newContext({ ignoreHTTPSErrors: true });
    b.p2 = await b.ctx2.newPage();
    await b.p2.goto(`${A}/setfresh`);
  }
  await reset(all[0].ctx);
  for (const b of all) { await b.p2.goto(`${B}/attack-post?t=${b.name}-age~0s`); await sleep(500); }
  console.log(`  waiting ${WAIT_MS / 1000}s ...`);
  await sleep(WAIT_MS);
  for (const b of all) { await b.p2.goto(`${B}/attack-post?t=${b.name}-age~${Math.round(WAIT_MS / 1000)}s`); await sleep(500); }
  for (const e of await getLog(all[0].ctx)) console.log('  ' + row(e));
}

(async () => {
  const all = [];
  for (const n of only) all.push(await launch(n));
  console.log(`date: ${new Date().toISOString()}  playwright: ${require((process.env.PW || 'playwright') + '/package.json').version}`);
  for (const b of all) console.log(`${b.name}: ${b.browser.version()}`);
  try {
    const ps = execSync('ps -eo args').toString().split('\n').find(l => /chrom.*--disable-features=/.test(l));
    if (ps) console.log('chromium --disable-features: ' + ps.match(/--disable-features=(\S+)/)[1]);
  } catch { }
  for (const b of all) await cookieSuite(b);
  for (const b of all) await cspSuite(b);
  if (WAIT_MS >= 0) await laxPostSuite(all);
  for (const b of all) await b.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
