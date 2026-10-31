import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CpuPoolService } from './cpu-pool.service';
import { HeavyController } from './heavy.controller';

@Module({ controllers: [HeavyController], providers: [CpuPoolService] })
class AppModule {}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.enableShutdownHooks(); // SIGTERM -> app.close() -> onModuleDestroy -> pool.destroy()
  const port = Number(process.env.PORT ?? 4310);
  await app.listen(port, '127.0.0.1');
  console.log(JSON.stringify({ ready: true, port }));
}
void bootstrap();
