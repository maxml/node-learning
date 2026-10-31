// Usage: node dist/main.js <variant>   -> prints "LISTENING <port>" (port 0 = random free port)
import 'reflect-metadata';
import { NestFactory, ContextIdFactory } from '@nestjs/core';
import type { Type } from '@nestjs/common';

const variant = process.argv[2] ?? 'singleton';

async function moduleFor(name: string): Promise<Type> {
  switch (name) {
    case 'singleton': return (await import('./variants/singleton.js')).SingletonModule;
    case 'explicit': return (await import('./variants/explicit.js')).ExplicitModule;
    case 'request': return (await import('./variants/request.js')).RequestScopedModule;
    case 'als': return (await import('./variants/als.js')).AlsModule;
    case 'cls': return (await import('./variants/cls.js')).ClsVariantModule;
    case 'durable': {
      const m = await import('./variants/durable.js');
      ContextIdFactory.apply(new m.TenantContextIdStrategy());   // global, so only in this process
      return m.DurableModule;
    }
    case 'rls': return (await import('./variants/rls.js')).RlsModule;
    case 'rls-singleton': return (await import('./variants/rls.js')).RlsSingletonModule;
    default: throw new Error(`unknown variant ${name}`);
  }
}

const app = await NestFactory.create(await moduleFor(variant), { logger: ['error'] });
await app.listen(Number(process.env.PORT ?? 0), '127.0.0.1');
const address = app.getHttpServer().address();
console.log(`LISTENING ${typeof address === 'object' && address ? address.port : address}`);
