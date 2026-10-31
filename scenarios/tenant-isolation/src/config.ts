// Local Docker database from `npm run db:up`; demo credentials only.
const host = process.env.PGHOST ?? '127.0.0.1';
const port = process.env.PGPORT ?? '55435';
export const ADMIN_URL = `postgres://postgres:postgres@${host}:${port}/postgres`;
export const APP_URL = `postgres://app_user:app@${host}:${port}/postgres`;
export const POOL_MAX = Number(process.env.POOL_MAX ?? 10);
// Upper bound of the random "slow lookup" before the tenant-filtered query (ms).
export const SLOW_MS = Number(process.env.SLOW_MS ?? 5);
