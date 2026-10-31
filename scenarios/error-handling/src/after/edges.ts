// Edge mappings: the same AppError becomes an HTTP problem (RFC 9457) or a queue decision.
// Both are pure functions, so the mapping itself is unit-testable without Nest.
import { HttpException } from '@nestjs/common';
import { AppError, isAppError } from './errors.js';

export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  code: string;
  retryable: boolean;
  errors?: Array<{ pointer: string; detail: string }>;
}

const TYPE_BASE = 'https://api.example.com/problems/';

/** code -> HTTP status + title. A new AppError subclass without an entry here falls to 500 and the unit test fails. */
export const HTTP_MAP: Record<string, { status: number; title: string }> = {
  VALIDATION_FAILED:        { status: 422, title: 'Request failed validation' },
  EMAIL_TAKEN:              { status: 409, title: 'Email already registered' },
  CUSTOMER_NOT_FOUND:       { status: 404, title: 'Customer not found' },
  ORDER_LIMIT_REACHED:      { status: 409, title: 'Order limit reached' },
  CONCURRENCY_CONFLICT:     { status: 503, title: 'Concurrent update, retry' },
  DATABASE_UNAVAILABLE:     { status: 503, title: 'Service temporarily unavailable' },
  UNEXPECTED_DATABASE_ERROR:{ status: 500, title: 'Internal error' },
};

const kebab = (code: string) => code.toLowerCase().replaceAll('_', '-');

export function toProblem(e: unknown): Problem {
  if (isAppError(e)) {
    const m = HTTP_MAP[e.code] ?? { status: 500, title: 'Internal error' };
    const p: Problem = {
      type: TYPE_BASE + kebab(e.code),
      title: m.title,
      status: m.status,
      code: e.code,
      retryable: e.kind === 'transient',
    };
    // detail only for expected errors: their message is written for the client.
    // transient/unexpected messages may describe internals, so they are never sent.
    if (e.kind === 'expected') p.detail = e.message;
    if ('issues' in e) p.errors = (e as AppError & { issues: Problem['errors'] }).issues;
    return p;
  }
  if (e instanceof HttpException) {
    // Framework-raised errors (unknown route, malformed JSON, ParseIntPipe) get the same envelope.
    const status = e.getStatus();
    return { type: 'about:blank', title: httpTitle(status), status, code: `HTTP_${status}`, retryable: false };
  }
  return { type: TYPE_BASE + 'internal', title: 'Internal error', status: 500, code: 'INTERNAL', retryable: false };
}

function httpTitle(status: number): string {
  return ({ 400: 'Bad Request', 404: 'Not Found', 405: 'Method Not Allowed', 413: 'Content Too Large', 415: 'Unsupported Media Type' } as Record<number, string>)[status] ?? 'Error';
}

// ---- Queue / scheduled job edge ----------------------------------------------------------
export type Decision = 'ack' | 'retry' | 'dead-letter' | 'drop';

/**
 * transient            -> retry (bounded, with backoff), then dead-letter
 * VALIDATION_FAILED    -> dead-letter: the payload is poison, a human must look at it
 * other expected       -> drop (ack + record the business outcome): repeating changes nothing
 * unexpected / unknown -> dead-letter + alert: a bug; repeating will not fix code
 */
export function toDecision(e: unknown): Exclude<Decision, 'ack'> {
  if (!isAppError(e)) return 'dead-letter';
  if (e.kind === 'transient') return 'retry';
  if (e.kind === 'unexpected') return 'dead-letter';
  return e.code === 'VALIDATION_FAILED' ? 'dead-letter' : 'drop';
}
