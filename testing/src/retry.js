'use strict';
// Retry with exponential backoff: the kind of code that makes a test suite slow
// (real waits) or flaky (real clock) unless time is faked.
const timers = require('node:timers');
const { setTimeout: capturedSetTimeout } = require('node:timers'); // captured at load time

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));          // global, looked up per call
const sleepCaptured = (ms) => new Promise((resolve) => capturedSetTimeout(resolve, ms)); // reference taken before any mock
const sleepViaModule = (ms) => new Promise((resolve) => timers.setTimeout(resolve, ms)); // module property, looked up per call

async function retry(fn, { attempts = 3, baseMs = 1000, wait = sleep } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn(i);
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) await wait(baseMs * 2 ** i); // 1000, 2000, ...
    }
  }
  throw lastError;
}

module.exports = { retry, sleep, sleepCaptured, sleepViaModule };
