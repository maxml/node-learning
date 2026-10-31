/** In-memory structured log sink, so tests can count how many times one failure was logged. */
export interface LogRecord {
  level: 'info' | 'warn' | 'error';
  msg: string;
  [field: string]: unknown;
}

export class LogSink {
  readonly records: LogRecord[] = [];
  write(rec: LogRecord): void {
    this.records.push(rec);
    if (process.env.LOG_STDOUT) console.log(JSON.stringify(rec));
  }
  clear(): void { this.records.length = 0; }
}
