import { Controller, Get, Post } from '@nestjs/common';
import { CpuPoolService } from './cpu-pool.service';
const N = Number(process.env.N ?? 7_500_000);

function countPrimes(from: number, to: number): number {
  let count = 0;
  for (let n = Math.max(2, from); n < to; n++) {
    let prime = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break; }
    if (prime) count++;
  }
  return count;
}

@Controller()
export class HeavyController {
  constructor(private readonly cpu: CpuPoolService) {}

  @Get('ping')
  ping(): string {
    return 'pong';
  }

  // The scenario as written: `async` on the handler, the calculation on the event loop.
  @Post('heavy-block')
  async heavyBlock(): Promise<{ primes: number }> {
    return { primes: countPrimes(0, N) };
  }

  // Same calculation through the pool provider.
  @Post('heavy')
  async heavy(): Promise<{ primes: number }> {
    return { primes: await this.cpu.run(0, N) };
  }
}
