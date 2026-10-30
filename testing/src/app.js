'use strict';
// Minimal HTTP app on node:http (no framework) for supertest and fetch-based tests.
const http = require('node:http');

function createApp({ users }) {
  return http.createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    const m = /^\/users\/([\w-]+)$/.exec(req.url);
    if (req.method === 'GET' && m) {
      const user = await users.findById(m[1]);
      return user ? send(200, user) : send(404, { error: 'not found' });
    }
    if (req.method === 'POST' && req.url === '/users') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      let body;
      try { body = JSON.parse(raw); } catch { return send(400, { error: 'invalid json' }); }
      if (typeof body.email !== 'string' || !body.email.includes('@')) return send(422, { error: 'email required' });
      return send(201, await users.create(body));
    }
    send(404, { error: 'no route' });
  });
}

module.exports = { createApp };
