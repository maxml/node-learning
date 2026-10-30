// Top-level await makes this module (and every module that imports it) asynchronous.
export const config = await Promise.resolve({ ready: true });
