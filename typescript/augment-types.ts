// Розширення чужих типів. Файл має бути МОДУЛЕМ (є top-level export/import):
// тоді `declare module "fastify"` доповнює наявний модуль, а не оголошує новий замість нього.
// Мутація в run-backend.mjs прибирає `export {}` і показує, що стається інакше.
export {};

declare global {
  // Express 5 (@types/express-serve-static-core) читає Request з глобального namespace Express.
  namespace Express {
    interface Request {
      user?: { id: string; roles: readonly string[] };
    }
  }
}

declare module "fastify" {
  interface FastifyRequest {
    tenantId: string; // обіцянка: «кожен запит має tenantId». Перевіряє її лише рантайм.
  }
}
