// Vitest 5.0.5: vi.mock is written BELOW the static import, yet it wins.
// Vitest rewrites the file: vi.mock calls are hoisted above imports, and imports go
// through its module runner, not through Node's native ESM loader. Compare with
// test/esm-mocking.test.mjs, where node:test needs a flag and a dynamic import.
import { test, expect, vi } from 'vitest';
import { greet } from '../src/esm/greeting.mjs';
import * as clock from '../src/esm/clock.mjs';

vi.mock('../src/esm/clock.mjs', () => ({ hour: vi.fn(() => 9) }));

test('static import sees the mocked dependency', () => {
  expect(greet('Ann')).toBe('Good morning, Ann');
  expect(clock.hour).toHaveBeenCalledTimes(1);
});

test('fake timers: Date and setTimeout under one clock', async () => {
  vi.useFakeTimers({ now: new Date('2026-10-30T23:59:59Z') });
  const fired = vi.fn();
  setTimeout(fired, 1000);
  await vi.advanceTimersByTimeAsync(1000); // the *Async variant also drains promise callbacks
  expect(fired).toHaveBeenCalledOnce();
  expect(new Date().toISOString()).toBe('2026-10-31T00:00:00.000Z');
  vi.useRealTimers();
});
