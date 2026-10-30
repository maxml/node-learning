// Default HTTP server timeouts and limits (slowloris / big headers).
import http from 'node:http';
const s = http.createServer();
console.log(JSON.stringify({
  node: process.version,
  requestTimeout: s.requestTimeout,
  headersTimeout: s.headersTimeout,
  keepAliveTimeout: s.keepAliveTimeout,
  timeout: s.timeout,
  maxHeadersCount: s.maxHeadersCount,
  maxRequestsPerSocket: s.maxRequestsPerSocket,
  maxHeaderSize: http.maxHeaderSize,
}));
