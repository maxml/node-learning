// Factor III: config comes from the environment and is validated once, at startup.
// Fail fast with every problem listed, never on the first request that needs the value.
// No library: the point is the shape (parse -> typed, frozen object), not the validator.

type Config = Readonly<{
  port: number;
  databaseUrl: URL;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  shutdownTimeoutMs: number;
}>;

const LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"] as const;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const errors: string[] = [];

  const port = Number(env.PORT ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push(`PORT must be 1..65535, got "${env.PORT}"`);

  let databaseUrl: URL | undefined;
  if (!env.DATABASE_URL) errors.push("DATABASE_URL is required");
  else {
    try { databaseUrl = new URL(env.DATABASE_URL); }
    catch { errors.push("DATABASE_URL is not a valid URL"); } // never echo the value: it may hold a password
  }

  const logLevel = (env.LOG_LEVEL ?? "info") as Config["logLevel"];
  if (!LEVELS.includes(logLevel)) errors.push(`LOG_LEVEL must be one of ${LEVELS.join("|")}`);

  const shutdownTimeoutMs = Number(env.SHUTDOWN_TIMEOUT_MS ?? "10000");
  if (!(shutdownTimeoutMs > 0)) errors.push("SHUTDOWN_TIMEOUT_MS must be > 0");

  if (errors.length) {
    throw new Error(`Invalid configuration:\n  - ${errors.join("\n  - ")}`);
  }
  return Object.freeze({ port, databaseUrl: databaseUrl!, logLevel, shutdownTimeoutMs });
}

// Entry point: `node twelve-factor/config.ts`
if (import.meta.main) {
  try {
    const cfg = loadConfig();
    console.log(JSON.stringify({ port: cfg.port, db: cfg.databaseUrl.host, logLevel: cfg.logLevel }));
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
}
