// Споживач розширених типів. Сам НЕ імпортує augment-types.ts: розширення потрапляє в
// програму лише тому, що файл перелічено в tsconfig (files/include). Прибрати його звідти
// (run-backend.mjs) = класичне «типи не підхопились»: TS2339 на req.user.
import express from "express";
import Fastify from "fastify";

const app = express();
app.get("/me", (req, res) => {
  res.json({ id: req.user?.id ?? null, admin: req.user?.roles.includes("admin") ?? false });
});

// Fastify: тип каже `tenantId: string` для КОЖНОГО запиту, але значення ставить лише хук.
// Маршрут у дочірньому контексті без хука компілюється так само.
export async function fastifyDemo() {
  const f = Fastify();
  await f.register(async (scoped) => {
    scoped.decorateRequest("tenantId", "");
    scoped.addHook("onRequest", async (req) => {
      req.tenantId = String(req.headers["x-tenant"] ?? "none");
    });
    scoped.get("/with-hook", async (req) => ({ tenant: req.tenantId, type: typeof req.tenantId }));
  });
  f.get("/without-hook", async (req) => ({ tenant: req.tenantId ?? "<undefined>", type: typeof req.tenantId }));

  for (const url of ["/with-hook", "/without-hook"]) {
    const r = await f.inject({ url, headers: { "x-tenant": "t1" } });
    console.log(url.padEnd(14), r.body);
  }
  await f.close();
}

if (import.meta.main) await fastifyDemo();
