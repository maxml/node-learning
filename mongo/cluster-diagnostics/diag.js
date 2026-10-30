// Helpers loaded by run.sh inside mongosh, in one of the cdiag-* containers.
// Each function prints a short, human-readable report; run.sh calls them with
// mongosh --eval "load('/exp/diag.js'); <fn>(...)".

const env = (k, d) => (process.env[k] !== undefined ? process.env[k] : d);
const hhmmss = (d) => (d ? d.toISOString().slice(11, 19) : '-');

// rs.status() as one line per member: state, health, last applied optime, lag
// relative to the primary's optime, heartbeat round-trip, sync source.
function status(label) {
  const s = rs.status();
  const self = s.members.find((m) => m.self);
  const p = s.members.find((m) => m.stateStr === 'PRIMARY');
  print(`--- ${label} (rs.status() on ${self.name}, ${hhmmss(s.date)})`);
  for (const m of s.members) {
    // An unreachable member reports optimeDate = 1970-01-01: naive subtraction gives ~56 years of "lag".
    const unknown = !m.optimeDate || m.optimeDate.getTime() === 0;
    const lag = p && !unknown ? Math.round((p.optimeDate - m.optimeDate) / 1000) + 's' : 'n/a';
    print(
      [
        m.name.padEnd(15),
        m.stateStr.padEnd(26),
        'health=' + m.health,
        'optime=' + (unknown ? m.optimeDate.toISOString().slice(0, 10) : hhmmss(m.optimeDate)),
        'lag=' + lag,
        'pingMs=' + (m.pingMs !== undefined ? m.pingMs : '-'),
        'sync=' + (m.syncSourceHost || '-'),
        m.lastHeartbeatMessage ? `hbMsg="${m.lastHeartbeatMessage}"` : '',
      ].join(' ')
    );
  }
}

function flow() {
  const f = db.serverStatus().flowControl;
  print(
    `flowControl: enabled=${f.enabled} isLagged=${f.isLagged} isLaggedCount=${f.isLaggedCount} ` +
      `targetRateLimit=${f.targetRateLimit} timeAcquiringMicros=${f.timeAcquiringMicros}`
  );
}

// Insert ~RATE docs/s (batches of BATCH docs, ~1 KB each) for DUR seconds with write concern W.
// Prints the achieved docs per second, so throttling by flow control is visible.
// Flow control meters operations, not documents: use BATCH=1 to make it bite.
function writer() {
  const dur = Number(env('DUR', 20));
  const rate = Number(env('RATE', 2000));
  const batch = Number(env('BATCH', 50));
  const wRaw = env('W', '1');
  const w = wRaw === 'majority' ? 'majority' : Number(wRaw);
  const c = db.getSiblingDB('diag').events;
  const pad = 'x'.repeat(1000);
  const out = [];
  const end = Date.now() + dur * 1000;
  let secEnd = Date.now() + 1000;
  let n = 0;
  while (Date.now() < end) {
    if (n < rate) {
      const docs = Array.from({ length: batch }, () => ({ ts: new Date(), pad }));
      c.insertMany(docs, { writeConcern: { w } });
      n += batch;
    } else {
      sleep(5);
    }
    if (Date.now() >= secEnd) {
      out.push(n);
      n = 0;
      secEnd += 1000;
    }
  }
  print(`writer (w:${w}, batch ${batch}, target ${rate} docs/s) docs per second: ${out.join(' ')}`);
}

const ts2n = (t) => t.t * 4294967296 + t.i;

// Poll rs.status() on the primary until `name` has applied the primary's latest optime.
function catchUp(name, timeoutSec) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutSec * 1000) {
    const s = rs.status();
    const p = s.members.find((m) => m.stateStr === 'PRIMARY');
    const m = s.members.find((x) => x.name === name);
    if (p && m && m.optime && ts2n(m.optime.ts) >= ts2n(p.optime.ts)) {
      print(`${name} caught up ${Date.now() - t0} ms after the block was lifted`);
      return;
    }
    sleep(100);
  }
  print(`${name} did NOT catch up within ${timeoutSec}s`);
}

// Wait until this node knows a primary other than `exclude`, then report the
// election as recorded by the new primary itself, relative to fault time T0 (epoch ms).
function election() {
  const t0 = Number(env('T0'));
  const exclude = env('EXCLUDE', '');
  let p = null;
  while (Date.now() - t0 < 120000) {
    try {
      const h = db.hello();
      if (h.primary && h.primary !== exclude) {
        p = h.primary;
        break;
      }
    } catch (e) {}
    sleep(100);
  }
  if (!p) return print('no new primary within 120 s');
  const admin = new Mongo(p).getDB('admin');
  let e;
  for (let i = 0; i < 100; i++) {
    e = admin.runCommand({ replSetGetStatus: 1 }).electionCandidateMetrics;
    if (e && e.wMajorityWriteAvailabilityDate) break;
    sleep(100);
  }
  const d = (x) => (x ? '+' + (x - t0) + ' ms' : '-');
  print(`new primary ${p}: lastElectionReason=${e.lastElectionReason} term=${e.electionTerm}`);
  print(
    `  after the fault: lastElectionDate ${d(e.lastElectionDate)}, newTermStartDate ${d(e.newTermStartDate)}, ` +
      `wMajorityWriteAvailabilityDate ${d(e.wMajorityWriteAvailabilityDate)}`
  );
  electionMetrics(p);
}

function electionMetrics(host) {
  const em = new Mongo(host || db.getMongo().host).getDB('admin').runCommand({ serverStatus: 1 }).electionMetrics;
  const f = (k) => `${k}=${em[k].called}/${em[k].successful}`;
  print(
    `  electionMetrics on ${host} (called/successful): ${f('stepUpCmd')} ${f('electionTimeout')} ` +
      `${f('priorityTakeover')} ${f('catchUpTakeover')} numStepDownsCausedByHigherTerm=${em.numStepDownsCausedByHigherTerm}`
  );
}

// Wait until `name` is primary again; report time since T0.
function waitPrimaryIs() {
  const t0 = Number(env('T0'));
  const name = env('NAME');
  while (Date.now() - t0 < 180000) {
    try {
      if (db.hello().primary === name) return print(`${name} is primary again +${Date.now() - t0} ms after restart`);
    } catch (e) {}
    sleep(200);
  }
  print(`${name} did not become primary within 180 s`);
}

// replSetResizeOplog: the lower bound, then a valid resize. Run on each member separately.
function oplog() {
  try {
    db.adminCommand({ replSetResizeOplog: 1, size: Double(500) });
    print('replSetResizeOplog size 500 MB -> accepted');
  } catch (e) {
    print(`replSetResizeOplog size 500 MB -> ${e.codeName}: ${e.message}`);
  }
  const r2 = db.adminCommand({ replSetResizeOplog: 1, size: Double(990), minRetentionHours: 1 });
  const st = db.getSiblingDB('local').oplog.rs.stats();
  print(
    `replSetResizeOplog size 990 MB, minRetentionHours 1 -> ok=${r2.ok}; ` +
      `maxSize now ${Math.round(st.maxSize / 1048576)} MB; ` +
      `oplogTruncation.oplogMinRetentionHours=${db.serverStatus().oplogTruncation.oplogMinRetentionHours}`
  );
}

// Run on a member doing initial sync: sample initialSyncStatus until it is SECONDARY.
function initialSync() {
  const t0 = Date.now();
  const seen = [];
  let last = null;
  let maxBps = 0;
  while (Date.now() - t0 < 600000) {
    let s;
    try {
      s = db.adminCommand({ replSetGetStatus: 1 });
    } catch (e) {
      sleep(200);
      continue;
    }
    if (s.ok !== 1) {
      sleep(200);
      continue;
    }
    const me = s.members.find((m) => m.self);
    const st = me.stateStr + (s.initialSyncStatus && s.initialSyncStatus.phase ? '/' + s.initialSyncStatus.phase : '');
    if (st !== (seen[seen.length - 1] || {}).st) seen.push({ st, ms: Date.now() - t0 });
    if (s.initialSyncStatus) {
      last = Object.assign({ syncSource: me.syncSourceHost }, s.initialSyncStatus);
      maxBps = Math.max(maxBps, s.initialSyncStatus.bytesPerSecond || 0);
    }
    if (me.stateStr === 'SECONDARY') break;
    sleep(200);
  }
  print('states seen (ms since sampling start): ' + seen.map((x) => `${x.st}@${x.ms}`).join(' -> '));
  if (last) {
    print(
      `last initialSyncStatus sample: totalAttempts=${last.totalAttempts} max bytesPerSecond=${Math.round(maxBps)} ` +
        `syncSource=${last.syncSource} approxTotalDataSize=${last.approxTotalDataSize} ` +
        `approxTotalBytesCopied=${last.approxTotalBytesCopied} remainingInitialSyncEstimatedMillis=${last.remainingInitialSyncEstimatedMillis}`
    );
  }
}
