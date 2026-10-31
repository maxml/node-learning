import { spawn, ChildProcess } from 'node:child_process';
import { once } from 'node:events';

export interface Running { port: number; child: ChildProcess; stop(): Promise<void> }

export async function startVariant(variant: string, env: Record<string, string> = {}): Promise<Running> {
  const child = spawn(process.execPath, [new URL('./main.js', import.meta.url).pathname, variant], {
    env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'inherit'],
  });
  const port = await new Promise<number>((resolve, reject) => {
    let buf = '';
    child.stdout!.on('data', (d: Buffer) => {
      buf += d;
      const m = /LISTENING (\d+)/.exec(buf);
      if (m) resolve(Number(m[1]));
    });
    child.once('exit', (code) => reject(new Error(`${variant} exited ${code}`)));
  });
  return {
    port, child,
    async stop() { child.kill('SIGTERM'); if (child.exitCode === null) await once(child, 'exit'); },
  };
}

export interface BurstResult { total: number; leaks: number; errors: number; foreignRows: number; wrongCount: number }

/** Fire `rounds` waves of `concurrency` simultaneous requests, tenants 1..3 interleaved. */
export async function burst(port: number, rounds = 20, concurrency = 60): Promise<BurstResult> {
  const r: BurstResult = { total: 0, leaks: 0, errors: 0, foreignRows: 0, wrongCount: 0 };
  for (let round = 0; round < rounds; round++) {
    await Promise.all(Array.from({ length: concurrency }, async (_, i) => {
      const tenant = (i % 3) + 1;
      r.total++;
      const res = await fetch(`http://127.0.0.1:${port}/orders`, { headers: { authorization: `Bearer tenant:${tenant}` } });
      if (res.status !== 200) { r.errors++; await res.arrayBuffer(); return; }
      const rows = (await res.json()) as { tenant_id: number }[];
      const foreign = rows.filter((row) => row.tenant_id !== tenant).length;
      if (foreign > 0) { r.leaks++; r.foreignRows += foreign; }
      if (rows.length !== 5) r.wrongCount++;          // every tenant owns exactly 5 rows
    }));
  }
  return r;
}

export async function serverStats(port: number) {
  return (await fetch(`http://127.0.0.1:${port}/stats`)).json() as Promise<{ constructed: Record<string, number>; alarms: number }>;
}
