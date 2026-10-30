// Factor IX (disposability): a tiny HTTP server that logs JSON to stdout (factor XI)
// and, when HANDLE_SIGTERM=1, shuts down gracefully on SIGTERM.
import http from "node:http";

const log = (msg, extra = {}) =>
  process.stdout.write(JSON.stringify({ t: new Date().toISOString(), pid: process.pid, msg, ...extra }) + "\n");

const server = http.createServer((req, res) => {
  setTimeout(() => res.end("ok\n"), Number(process.env.WORK_MS ?? 0)); // simulated in-flight work
});
server.listen(Number(process.env.PORT ?? 3000), () => log("listening", { handle: process.env.HANDLE_SIGTERM === "1" }));

if (process.env.HANDLE_SIGTERM === "1") {
  process.once("SIGTERM", () => {
    log("SIGTERM received, draining");
    const deadline = setTimeout(() => { log("deadline hit, forcing"); server.closeAllConnections(); }, 8_000).unref();
    server.close(() => { clearTimeout(deadline); log("closed, exiting 0"); process.exit(0); });
  });
}
