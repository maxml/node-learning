import type { INestApplication } from '@nestjs/common';
import { makePool, resetSchema } from '../src/shared/db.js';

export async function freshDb(): Promise<void> {
  const pool = makePool();
  try { await resetSchema(pool); } finally { await pool.end(); }
}

export function baseUrl(app: INestApplication): string {
  const addr = app.getHttpServer().address() as { port: number };
  return `http://127.0.0.1:${addr.port}`;
}

export interface Res { status: number; contentType: string | null; headers: Headers; text: string; json: any }

export async function call(base: string, method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Res> {
  const r = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await r.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = undefined; }
  return { status: r.status, contentType: r.headers.get('content-type'), headers: r.headers, text, json };
}

/** Anything that reveals the schema or the driver: constraint/table names, SQL, pg wording. */
export const LEAK = /duplicate key|violates|constraint|customers_|orders_|SELECT|INSERT|ECONNREFUSED|pg_|relation/i;
