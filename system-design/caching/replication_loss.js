'use strict';
// Асинхронна реплікація: запис, підтверджений primary, губиться після failover.
// Два контейнери в мережі sdc-net: primary і replica. Відставання репліки імітуємо
// мережевим розривом (`docker network disconnect`), падіння primary — `docker kill`,
// failover — `REPLICAOF NO ONE` на репліці (те саме робить Sentinel чи Cluster).
// Чому не `docker pause`: заморожений процес не читає сокет, але ядро далі приймає байти
// реплікаційного потоку в буфер, і після unpause репліка їх дочитує (перевірено: запис
// «виживав»). Справжній розрив мережі ці байти губить.
const { execFileSync } = require('node:child_process');
const { connect, cmd, sleep, serverInfo } = require('./lib');

const IMAGE = process.env.IMAGE || 'valkey/valkey:9.1.3';
const SERVER = IMAGE.startsWith('valkey') ? 'valkey-server' : 'redis-server';
const P_PORT = 56392;
const R_PORT = 56393;

const docker = (...args) => execFileSync('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
// до репліки ходимо через docker exec: після відключення від мережі порт з хоста недоступний
const CLI = IMAGE.startsWith('valkey') ? 'valkey-cli' : 'redis-cli';
const onReplica = (...args) => docker('exec', 'sdc-replica', CLI, ...args.map(String));

async function startPair() {
  for (const n of ['sdc-primary', 'sdc-replica']) {
    try {
      docker('rm', '-f', n);
    } catch {}
  }
  docker('run', '-d', '--rm', '--name', 'sdc-primary', '--network', 'sdc-net', '-p', `127.0.0.1:${P_PORT}:6379`, IMAGE, SERVER, '--save', '');
  docker('run', '-d', '--rm', '--name', 'sdc-replica', '--network', 'sdc-net', '-p', `127.0.0.1:${R_PORT}:6379`, IMAGE, SERVER, '--save', '', '--replicaof', 'sdc-primary', '6379');
  await sleep(1500);
  const p = await connect(`redis://127.0.0.1:${P_PORT}`);
  const r = await connect(`redis://127.0.0.1:${R_PORT}`);
  for (let i = 0; i < 50; i++) {
    const info = await cmd(r, 'INFO', 'replication');
    if (/master_link_status:up/.test(info)) break;
    await sleep(100);
  }
  return { p, r };
}

async function lossScenario() {
  console.log('A. підтверджений запис губиться при failover');
  const { p, r } = await startPair();
  console.log(`   engine: ${await serverInfo(p)}`);
  console.log(`   SET order:1 → ${await cmd(p, 'SET', 'order:1', 'paid')};  WAIT 1 1000 → ${await cmd(p, 'WAIT', 1, 1000)} (репліка підтвердила)`);

  await r.quit();
  docker('network', 'disconnect', 'sdc-net', 'sdc-replica'); // розрив між primary і реплікою
  const ack = await cmd(p, 'SET', 'order:2', 'paid');
  console.log(`   [розрив мережі до репліки] SET order:2 → ${ack}  (клієнт отримав підтвердження)`);
  const waited = await cmd(p, 'WAIT', 1, 500);
  console.log(`   WAIT 1 500 → ${waited} (жодна репліка не підтвердила за 500 мс)`);
  console.log(`   на primary GET order:2 → ${await cmd(p, 'GET', 'order:2')}  (WAIT не відкочує запис)`);

  docker('kill', 'sdc-primary'); // primary падає
  try {
    await p.disconnect();
  } catch {}
  console.log(`   failover: REPLICAOF NO ONE → ${onReplica('REPLICAOF', 'NO', 'ONE')}`);
  const g1 = onReplica('GET', 'order:1') || '(nil)';
  const g2 = onReplica('GET', 'order:2') || '(nil)';
  console.log(`   новий primary: GET order:1 → ${g1},  GET order:2 → ${g2}${g2 === '(nil)' ? '  ← підтверджений запис втрачено' : ''}`);
}

async function minReplicasScenario() {
  console.log('B. min-replicas-to-write: primary відмовляє в записі, коли репліка відстала');
  const { p, r } = await startPair();
  await cmd(p, 'CONFIG', 'SET', 'min-replicas-to-write', 1);
  await cmd(p, 'CONFIG', 'SET', 'min-replicas-max-lag', 2);
  console.log(`   SET a → ${await cmd(p, 'SET', 'a', 1)} (репліка в нормі)`);
  docker('pause', 'sdc-replica');
  await sleep(4000); // відставання > min-replicas-max-lag
  try {
    console.log(`   [репліка відстає 4 с] SET b → ${await cmd(p, 'SET', 'b', 1)}`);
  } catch (e) {
    console.log(`   [репліка відстає 4 с] SET b → помилка: ${e.message}`);
  }
  console.log(`   GET a → ${await cmd(p, 'GET', 'a')} (читання працює)`);
  docker('unpause', 'sdc-replica');
  // Репліка повертається за ~1 с (наступний REPLCONF ACK), але не завжди: чекаємо до 10 с.
  const t0 = Date.now();
  let res;
  for (;;) {
    try {
      res = await cmd(p, 'SET', 'b', 1);
      break;
    } catch (e) {
      if (!/NOREPLICAS/.test(e.message) || Date.now() - t0 > 10000) throw e;
      await sleep(250);
    }
  }
  console.log(`   [репліка повернулась] SET b → ${res} (через ${Date.now() - t0} мс після unpause)`);
  await p.quit();
  await r.quit();
}

(async () => {
  console.log(`# replication: image ${IMAGE}, node ${process.version}`);
  await lossScenario();
  await minReplicasScenario();
  docker('rm', '-f', 'sdc-primary', 'sdc-replica');
})().catch((e) => {
  console.error(e);
  try {
    docker('rm', '-f', 'sdc-primary', 'sdc-replica');
  } catch {}
  process.exit(1);
});
