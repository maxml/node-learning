// Application error hierarchy. No HTTP, no queue vocabulary here: only WHAT went wrong
// (stable `code`) and WHAT KIND of failure it is (`kind`), which every edge maps on its own.

/**
 * expected   : a business outcome the caller must handle (not found, conflict, rule violated)
 * transient  : the operation may succeed if repeated (serialization failure, deadlock, DB down)
 * unexpected : a bug or an unmapped infrastructure failure; repeating will not help
 */
export type ErrorKind = 'expected' | 'transient' | 'unexpected';

export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly kind: ErrorKind;
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

export interface Issue { pointer: string; detail: string }

export class ValidationFailed extends AppError {
  readonly code = 'VALIDATION_FAILED';
  readonly kind = 'expected';
  constructor(readonly issues: Issue[]) { super(`${issues.length} field(s) invalid`); }
}

export class EmailTaken extends AppError {
  readonly code = 'EMAIL_TAKEN';
  readonly kind = 'expected';
  constructor(readonly email: string, options?: { cause?: unknown }) { super('Email is already registered', options); }
}

export class CustomerNotFound extends AppError {
  readonly code = 'CUSTOMER_NOT_FOUND';
  readonly kind = 'expected';
  constructor(readonly customerId: number, options?: { cause?: unknown }) { super(`Customer ${customerId} does not exist`, options); }
}

export class OrderLimitReached extends AppError {
  readonly code = 'ORDER_LIMIT_REACHED';
  readonly kind = 'expected';
  constructor(readonly limit: number) { super(`A customer may have at most ${limit} orders`); }
}

/** 40001 serialization_failure, 40P01 deadlock_detected: repeat the whole transaction. */
export class ConcurrencyConflict extends AppError {
  readonly code = 'CONCURRENCY_CONFLICT';
  readonly kind = 'transient';
  constructor(options: { cause: unknown }) { super('Concurrent update, retry the operation', options); }
}

/** Connection refused/reset/timeout, admin shutdown, too many connections. */
export class DatabaseUnavailable extends AppError {
  readonly code = 'DATABASE_UNAVAILABLE';
  readonly kind = 'transient';
  constructor(options: { cause: unknown }) { super('Database is unavailable', options); }
}

/** Every unclassified DB failure (syntax error, unmapped constraint, ...): a bug until proven otherwise. */
export class UnexpectedDatabaseError extends AppError {
  readonly code = 'UNEXPECTED_DATABASE_ERROR';
  readonly kind = 'unexpected';
  constructor(options: { cause: unknown }) { super('Unexpected database error', options); }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

/** Cause chain for logs: name/code/message of every link, never query parameters. */
export function causeChain(e: unknown, depth = 0): Array<Record<string, unknown>> {
  if (depth > 5 || e == null) return [];
  if (!(e instanceof Error)) return [{ thrown: String(e) }];
  const link: Record<string, unknown> = { name: e.name, message: e.message };
  const anyE = e as Error & { code?: unknown; constraint?: unknown };
  if (anyE.code !== undefined) link.code = anyE.code;
  if (anyE.constraint !== undefined) link.constraint = anyE.constraint;
  return [link, ...causeChain(e.cause, depth + 1)];
}
