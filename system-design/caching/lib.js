'use strict';
// Спільні помічники для експериментів: підключення до Valkey/Redis і імітація БД.
const { createClient } = require('redis');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect(url = process.env.CACHE_URL || 'redis://127.0.0.1:56391') {
  const c = createClient({ url });
  c.on('error', () => {}); // помилки команд ловимо на місці виклику
  await c.connect();
  return c;
}

// cmd(c, 'SET', 'k', 'v') — усі команди сирими масивами, щоб було видно, що саме йде на сервер
const cmd = (c, ...args) => c.sendCommand(args.map(String));

// Імітація «бази»: рахує виклики, тримає максимальну кількість одночасних, має затримку.
class FakeDb {
  constructor(latencyMs = 100) {
    this.latencyMs = latencyMs;
    this.calls = 0;
    this.inFlight = 0;
    this.maxInFlight = 0;
    this.starts = [];
    this.rows = new Map();
  }
  async read(key) {
    this.calls++;
    this.starts.push(Date.now());
    this.inFlight++;
    this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
    await sleep(this.latencyMs);
    this.inFlight--;
    return this.rows.get(key) ?? `value-of-${key}`;
  }
  reset() {
    this.calls = 0;
    this.starts = [];
    this.inFlight = 0;
    this.maxInFlight = 0;
  }
}

async function serverInfo(c) {
  const info = await cmd(c, 'INFO', 'server');
  const get = (k) => (info.match(new RegExp(`^${k}:(.*)$`, 'm')) || [])[1]?.trim();
  return get('valkey_version') ? `valkey ${get('valkey_version')}` : `redis ${get('redis_version')}`;
}

module.exports = { sleep, connect, cmd, FakeDb, serverInfo };
