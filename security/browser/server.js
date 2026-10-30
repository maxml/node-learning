// Один HTTPS-сервер, що грає чотири «сайти» за заголовком Host:
//   a.test     жертва (cookies, /echo, CSP-сторінки, WebSocket)
//   sub.a.test піддомен жертви (той самий site, інший origin)
//   b.test     зловмисник (сторінки атак)
//   cdn.test   «довірений CDN» з JSONP-ендпоінтом (для обходу allowlist CSP)
// Усі імена мапляться на 127.0.0.1 через `docker run --add-host`.
// Сертифікат самопідписаний (run.sh генерує його), браузер запускається з ignoreHTTPSErrors.
'use strict';
const https = require('https');
const fs = require('fs');
const crypto = require('crypto');

const PORT = 8443;
const A = `https://a.test:${PORT}`;
const SUB = `https://sub.a.test:${PORT}`;
const CDN = `https://cdn.test:${PORT}`;
const NONCE = 'r4nd0mN0nce';

let log = [];

function cookieNames(req) {
  return (req.headers.cookie || '').split(';').map(s => s.trim().split('=')[0]).filter(Boolean).sort();
}

function record(req, body, extra = {}) {
  const e = {
    t: new URL(req.url, A).searchParams.get('t'),
    host: req.headers.host.split(':')[0],
    method: req.method,
    path: req.url.split('?')[0],
    cookies: cookieNames(req),
    sfs: req.headers['sec-fetch-site'] || null,
    sfm: req.headers['sec-fetch-mode'] || null,
    sfd: req.headers['sec-fetch-dest'] || null,
    origin: req.headers.origin || null,
    ctype: req.headers['content-type'] || null,
    body: body || null,
    ...extra,
  };
  log.push(e);
  return e;
}

function send(res, status, type, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}

const html = (b) => `<!doctype html><meta charset="utf-8"><body>${b}</body>`;

// Сторінка з відбитим (reflected) параметром x БЕЗ екранування: модель XSS.
function reflectPage(x) {
  return html(`
<script nonce="${NONCE}">
  window.ok_nonce = 1;
  // 'strict-dynamic': довіра передається скриптам, які створив довірений скрипт
  const s = document.createElement('script');
  s.src = '/js/dyn.js';
  document.head.appendChild(s);
</script>
<div id="out">${x}</div>`);
}

const CSP = {
  strict: `script-src 'nonce-${NONCE}' 'strict-dynamic'; object-src 'none'; base-uri 'none'`,
  // рекомендований web.dev варіант із fallback для старих браузерів
  compat: `script-src 'nonce-${NONCE}' 'strict-dynamic' https: 'unsafe-inline'; object-src 'none'; base-uri 'none'`,
  allowlist: `script-src 'self' ${CDN}; object-src 'none'`,
  nonceUnsafeInline: `script-src 'nonce-${NONCE}' 'unsafe-inline'`,
  unsafeInline: `script-src 'self' 'unsafe-inline'`,
};

function handleA(req, res, u, body) {
  const p = u.pathname;
  if (p === '/set') {
    return send(res, 200, 'text/html', html('set'), {
      'Set-Cookie': [
        'lax=1; Path=/; Secure; SameSite=Lax',
        'strict=1; Path=/; Secure; SameSite=Strict',
        'none=1; Path=/; Secure; SameSite=None',
        'def=1; Path=/; Secure', // без SameSite
        'sid=1; Path=/; Secure; HttpOnly; SameSite=Lax',
      ],
    });
  }
  if (p === '/setfresh') {
    return send(res, 200, 'text/html', html('fresh'), {
      'Set-Cookie': [
        `fresh_def=${Date.now()}; Path=/; Secure`, // без SameSite, щойно встановлена
        `fresh_lax=${Date.now()}; Path=/; Secure; SameSite=Lax`,
      ],
    });
  }
  if (p === '/echo') {
    record(req, body);
    return send(res, 200, 'text/html', html(`echo ${req.method}`));
  }
  if (p === '/self-post') {
    return send(res, 200, 'text/html', html(`<form id=f method=POST action="/echo?t=so-post"><input name=a value=1></form><script>f.submit()</script>`));
  }
  if (p === '/js/dyn.js') return send(res, 200, 'application/javascript', 'window.ok_dynamic = 1;');
  if (p === '/js/self.js') return send(res, 200, 'application/javascript', 'window.ok_self = 1;');
  if (p.startsWith('/csp-')) {
    const kind = p.slice(5);
    const x = u.searchParams.get('x') || '';
    const headers = {};
    if (kind === 'none') { /* без CSP */ }
    else if (kind === 'ro') headers['Content-Security-Policy-Report-Only'] = CSP.strict + '; report-uri /csp-report';
    else if (kind === 'report') return (record(req, body, { report: true }), send(res, 204, 'text/plain', ''));
    else if (CSP[kind]) headers['Content-Security-Policy'] = CSP[kind];
    else return send(res, 404, 'text/plain', 'no such csp');
    return send(res, 200, 'text/html', reflectPage(x), headers);
  }
  if (p === '/js/purify.js') return send(res, 200, 'application/javascript', fs.readFileSync(process.env.PURIFY || '/tmp/pw/node_modules/dompurify/dist/purify.min.js'));
  // DOM-based XSS: payload у location.hash, сервер його не бачить. mode = raw | tt | tt-policy | purify
  if (p === '/dom') {
    const mode = u.searchParams.get('mode');
    // tt-policy2 додає до allowlist політику, яку DOMPurify створює всередині себе
    const names = mode === 'tt-policy2' ? 'app dompurify' : 'app';
    const headers = mode.startsWith('tt') ? { 'Content-Security-Policy': `require-trusted-types-for 'script'; trusted-types ${names}` } : {};
    return send(res, 200, 'text/html', html(`
<div id="out"></div>
<script src="/js/purify.js"></script>
<script>
  const p = decodeURIComponent(location.hash.slice(1));
  const out = document.getElementById('out');
  try {
    if ('${mode}'.startsWith('tt-policy')) {
      const pol = trustedTypes.createPolicy('app', { createHTML: s => DOMPurify.sanitize(s) });
      out.innerHTML = pol.createHTML(p);
    } else if ('${mode}' === 'purify') {
      out.innerHTML = DOMPurify.sanitize(p);
    } else {
      out.innerHTML = p;           // класичний sink
    }
    window.r = 'assigned';
  } catch (e) { window.r = e.constructor.name; }
  window.purifyVersion = window.DOMPurify && DOMPurify.version;
</script>`), headers);
  }
  if (p === '/frame-fa')return send(res, 200, 'text/html', html('<p id=c>framed-fa</p>'), { 'Content-Security-Policy': "frame-ancestors 'none'" });
  if (p === '/frame-xfo') return send(res, 200, 'text/html', html('<p id=c>framed-xfo</p>'), { 'X-Frame-Options': 'DENY' });
  if (p === '/frame-meta') return send(res, 200, 'text/html', `<!doctype html><meta http-equiv="Content-Security-Policy" content="frame-ancestors 'none'"><p id=c>framed-meta</p>`);
  if (p === '/frame-sameorigin') return send(res, 200, 'text/html', html('<p id=c>framed-fa-self</p>'), { 'Content-Security-Policy': "frame-ancestors 'self'" });
  return send(res, 404, 'text/plain', 'not found');
}

// Сторінки «зловмисника». Той самий набір віддає і sub.a.test (той самий site).
function handleAttacker(req, res, u, origin) {
  const p = u.pathname;
  const t = u.searchParams.get('t') || 'x';
  if (p === '/attack-post') {
    // enctype=text/plain + ім'я поля, що «складає» JSON: класичний трюк для JSON API
    return send(res, 200, 'text/html', html(`
<form id=f method=POST enctype="text/plain" action="${A}/echo?t=${t}">
  <input name='{"amount":100,"x":"' value='"}'>
</form><script>f.submit()</script>`));
  }
  if (p === '/attack-link') return send(res, 200, 'text/html', html(`<a id=l href="${A}/echo?t=${t}">go</a>`));
  if (p === '/attack-img') return send(res, 200, 'text/html', html(`<img src="${A}/echo?t=${t}">`));
  if (p === '/attack-iframe') return send(res, 200, 'text/html', html(`<iframe src="${A}/echo?t=${t}"></iframe>`));
  if (p === '/attack-fetch') {
    return send(res, 200, 'text/html', html(`<script>
  (async () => {
    // «простий» запит: без preflight, тіло доходить до сервера
    await fetch('${A}/echo?t=${t}-simple', {method:'POST', credentials:'include', mode:'no-cors',
      headers:{'Content-Type':'text/plain'}, body:'{"amount":100}'}).catch(()=>{});
    // application/json: браузер спершу шле OPTIONS; сервер не дозволяє, POST не піде
    await fetch('${A}/echo?t=${t}-json', {method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'}, body:'{"amount":100}'}).catch(e => { window.jsonErr = String(e); });
    window.done = 1;
  })();
</script>`));
  }
  if (p === '/attack-ws') {
    return send(res, 200, 'text/html', html(`<script>
  const ws = new WebSocket('wss://a.test:${PORT}/ws?t=${t}');
  ws.onopen = () => { window.wsOpen = 1; ws.close(); };
  ws.onerror = () => { window.wsErr = 1; };
</script>`));
  }
  if (p === '/frames') {
    return send(res, 200, 'text/html', html(['fa', 'xfo', 'meta', 'sameorigin']
      .map(k => `<iframe name="${k}" src="${A}/frame-${k}"></iframe>`).join('')));
  }
  return send(res, 404, 'text/plain', 'not found');
}

function handleCdn(req, res, u) {
  if (u.pathname === '/jsonp') {
    // типовий JSONP: callback відбивається як є
    const cb = u.searchParams.get('callback') || 'cb';
    return send(res, 200, 'application/javascript', `${cb}({"data":1})`);
  }
  return send(res, 404, 'text/plain', 'not found');
}

const server = https.createServer({
  key: fs.readFileSync(process.env.KEY || '/tmp/certs/key.pem'),
  cert: fs.readFileSync(process.env.CERT || '/tmp/certs/cert.pem'),
}, (req, res) => {
  let body = '';
  req.on('data', c => (body += c));
  req.on('end', () => {
    const host = (req.headers.host || '').split(':')[0];
    const u = new URL(req.url, `https://${host}`);
    if (u.pathname === '/log') return send(res, 200, 'application/json', JSON.stringify(log));
    if (u.pathname === '/reset') { log = []; return send(res, 200, 'text/plain', 'ok'); }
    if (req.method === 'OPTIONS') {
      record(req, body, { preflight: true, acrm: req.headers['access-control-request-method'] || null });
      return send(res, 204, 'text/plain', ''); // жодних Access-Control-Allow-*: preflight провалюється
    }
    if (host === 'a.test') return handleA(req, res, u, body);
    if (host === 'b.test') return handleAttacker(req, res, u, 'b');
    if (host === 'sub.a.test') return handleAttacker(req, res, u, 'sub');
    if (host === 'cdn.test') return handleCdn(req, res, u);
    send(res, 404, 'text/plain', 'unknown host');
  });
});

// WebSocket: лише рукостискання (RFC 6455 §4.2.2), без фреймів. Сервер не перевіряє Origin.
server.on('upgrade', (req, socket) => {
  record(req, '', { ws: true });
  const accept = crypto.createHash('sha1')
    .update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`);
  socket.on('error', () => {});
  socket.on('data', () => socket.end());
});

server.listen(PORT, () => console.error(`listening ${PORT}`));
module.exports = { A, SUB, CDN, NONCE };
