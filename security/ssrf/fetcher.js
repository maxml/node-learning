// SSRF demo fetcher. Node 24. Two endpoints:
//   /naive?url=...  — "blocklist" defence: reject by hostname string, then fetch
//                     (follows redirects, resolves hostname again at connect time)
//   /safe?url=...   — resolve ONCE, reject the resolved IP if private/loopback/
//                     link-local/IPv6-mapped-private, then connect to that PINNED IP,
//                     and do not follow redirects (re-validate instead).
//
// The point: the naive check inspects the *string the user sent*; the connection is
// made to whatever that string (or a later redirect, or a second DNS answer) resolves
// to. The safe check inspects the *IP it will actually connect to*, and connects to
// exactly that IP.

const http = require('node:http');
const dns = require('node:dns').promises;
const net = require('node:net');

const PORT = 8080;

// --- naive "blocklist": the kind of thing people write first ---
function naiveReject(urlStr) {
  const u = new URL(urlStr);
  const host = u.hostname.toLowerCase();
  const bad = ['localhost', '127.0.0.1', '169.254.169.254', '0.0.0.0', 'internal-admin', '::1'];
  if (bad.includes(host)) return `blocked host ${host}`;
  if (/^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) return `blocked private ${host}`;
  return null; // looks fine -> allowed
}

// --- safe: validate the resolved IP, not the string ---
function isPrivateIp(ip) {
  // strip IPv6-mapped IPv4 prefix: ::ffff:127.0.0.1
  const m = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (m) ip = m[1];
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    if (p[0] === 10) return true;
    if (p[0] === 127) return true;
    if (p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true; // link-local incl. cloud metadata
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
    return false;
  }
  if (net.isIPv6(ip)) {
    const low = ip.toLowerCase();
    if (low === '::1') return true;
    if (low.startsWith('fe80') || low.startsWith('fc') || low.startsWith('fd')) return true;
    if (low === '::') return true;
    return false;
  }
  return true; // unknown form -> refuse
}

async function fetchNaive(urlStr) {
  const why = naiveReject(urlStr);
  if (why) return { blocked: true, stage: 'check', why };
  // fetch() follows redirects by default and resolves the hostname itself (TOCTOU)
  const r = await fetch(urlStr, { redirect: 'follow', signal: AbortSignal.timeout(4000) });
  const body = (await r.text()).slice(0, 200);
  return { blocked: false, status: r.status, finalUrl: r.url, body };
}

// "Smarter but still wrong": resolve, validate the IP is public, THEN fetch().
// fetch() resolves the name a SECOND time at connect, so a DNS answer that flips
// between the two lookups (DNS rebinding / TOCTOU) defeats it.
async function fetchResolveCheck(urlStr) {
  const u = new URL(urlStr);
  let addrs;
  try { addrs = await dns.lookup(u.hostname, { all: true }); }
  catch (e) { return { blocked: true, why: `dns ${e.code}` }; }
  for (const a of addrs) {
    if (isPrivateIp(a.address)) return { blocked: true, stage: 'check', why: `resolved to private ${a.address}` };
  }
  const checkedIp = addrs[0].address;
  // gap: fetch() does its OWN name resolution here
  const r = await fetch(urlStr, { redirect: 'follow', signal: AbortSignal.timeout(4000) });
  const body = (await r.text()).slice(0, 200);
  return { blocked: false, checkedIp, status: r.status, body };
}

async function fetchSafe(urlStr) {
  const u = new URL(urlStr);
  if (!['http:', 'https:'].includes(u.protocol)) return { blocked: true, why: `scheme ${u.protocol}` };
  // resolve ONCE
  let addrs;
  try { addrs = await dns.lookup(u.hostname, { all: true }); }
  catch (e) { return { blocked: true, why: `dns ${e.code}` }; }
  for (const a of addrs) {
    if (isPrivateIp(a.address)) return { blocked: true, stage: 'check', why: `resolved to private ${a.address}` };
  }
  const pinned = addrs[0].address;
  // connect to the PINNED ip directly; Host header keeps virtual hosting working;
  // redirects are refused rather than followed.
  return await connectPinned(u, pinned);
}

function connectPinned(u, ip) {
  return new Promise((resolve) => {
    const req = http.request({
      host: ip,
      port: u.port || 80,
      path: u.pathname + u.search,
      headers: { Host: u.host },
      timeout: 4000,
    }, (res) => {
      // if the server tries to redirect us elsewhere, do NOT follow blindly
      if (res.statusCode >= 300 && res.statusCode < 400) {
        resolve({ blocked: true, stage: 'redirect', why: `refused redirect to ${res.headers.location}` });
        res.resume();
        return;
      }
      let data = '';
      res.on('data', (c) => { data += c; if (data.length > 200) req.destroy(); });
      res.on('end', () => resolve({ blocked: false, status: res.statusCode, connectedTo: ip, body: data.slice(0, 200) }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ blocked: true, why: 'timeout' }); });
    req.on('error', (e) => resolve({ blocked: true, why: e.message }));
    req.end();
  });
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const target = u.searchParams.get('url');
  res.setHeader('content-type', 'application/json');
  try {
    let out;
    if (u.pathname === '/safe') out = await fetchSafe(target);
    else if (u.pathname === '/resolvecheck') out = await fetchResolveCheck(target);
    else out = await fetchNaive(target);
    res.end(JSON.stringify(out));
  } catch (e) {
    res.end(JSON.stringify({ error: e.message }));
  }
}).listen(PORT, () => console.log(`fetcher on ${PORT}`));
