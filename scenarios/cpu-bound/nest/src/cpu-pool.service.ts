import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Piscina } from 'piscina';

// One pool per process, owned by the DI container: a singleton provider (the default scope).
// Size from availableParallelism(), which respects the container CPU quota on Node >= 22.13,
// minus one core for the event loop that serves HTTP.
@Injectable()
export class CpuPoolService implements OnModuleDestroy {
  private readonly size = Number(process.env.POOL_SIZE ?? Math.max(1, availableParallelism() - 1));
  private readonly maxQueue = this.size; // bounded: a queue longer than the pool only adds latency
  private readonly pool = new Piscina({
    filename: pathToFileURL(join(__dirname, '..', '..', 'work.mjs')).href,
    minThreads: this.size,
    maxThreads: this.size,
    maxQueue: this.maxQueue,
  });

  async run(from: number, to: number): Promise<number> {
    if (this.pool.queueSize >= this.maxQueue) {
      throw new ServiceUnavailableException('CPU pool busy, retry later'); // 503 via the built-in filter
    }
    return this.pool.run({ from, to });
  }

  // Called on app.close() and, with enableShutdownHooks(), on SIGTERM, before Nest closes the
  // HTTP server. close() lets running tasks finish (up to piscina's closeTimeout, 30 s) so the
  // requests waiting for them still get an answer; destroy() would reject them at once.
  // Piscina threads do not keep the process alive on their own, so the hook is about not
  // cutting work in half, not about the process hanging.
  async onModuleDestroy(): Promise<void> {
    await this.pool.close();
    console.log(JSON.stringify({ poolClosed: true }));
  }
}
