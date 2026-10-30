// Factor XI: the app writes one JSON event per line to stdout and knows nothing about
// files, rotation or shipping. Run: `LOG_LEVEL=info node twelve-factor/logging.mjs`
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "orders" },                     // instead of pid/hostname: the platform adds those
  redact: ["req.headers.authorization", "user.password"],
  timestamp: pino.stdTimeFunctions.isoTime,
});

const reqLog = logger.child({ requestId: "r-42" }); // correlation id carried by every line
reqLog.debug("not emitted at level info");
reqLog.info({ req: { method: "POST", url: "/orders", headers: { authorization: "Bearer secret" } } }, "request");
reqLog.error({ err: new Error("payment declined"), user: { id: 7, password: "hunter2" } }, "order failed");
