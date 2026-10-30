// "Internal" service the fetcher must never reach from user input.
// Serves a fake secret, and an open-redirect endpoint used for one bypass.
const http = require('node:http');
http.createServer((req, res) => {
  if (req.url.startsWith('/redirect')) {
    const to = new URL(req.url, 'http://x').searchParams.get('to');
    res.writeHead(302, { Location: to });
    res.end('redirecting');
    return;
  }
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('INTERNAL-ADMIN-SECRET: fake-token-do-not-use-0000');
}).listen(80, () => console.log('internal target on 80'));
