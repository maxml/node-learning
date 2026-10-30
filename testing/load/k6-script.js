// k6 2.3.0 script. MODEL=open  -> constant-arrival-rate (open model: arrivals do not wait for responses)
//                  MODEL=closed -> constant-vus (closed model: each VU waits for its response)
import http from 'k6/http';

const RATE = Number(__ENV.RATE || 1000);
const DURATION = __ENV.DURATION || '15s';
const TARGET = __ENV.TARGET || 'http://127.0.0.1:3999/';

const scenarios = {
  open: {
    executor: 'constant-arrival-rate',
    rate: RATE, timeUnit: '1s', duration: DURATION,
    // A 1 s stall at 1000/s needs ~1000 VUs in flight at once. VUs allocated on demand
    // during the run arrive too late (first run with preAllocatedVUs: 200 dropped 557
    // iterations), so pre-allocate them.
    preAllocatedVUs: 1500, maxVUs: 3000,
  },
  closed: { executor: 'constant-vus', vus: Number(__ENV.VUS || 10), duration: DURATION },
};

export const options = {
  scenarios: { main: scenarios[__ENV.MODEL || 'open'] },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max', 'count'],
};

export default function () {
  http.get(TARGET);
}

export function handleSummary(data) {
  const d = data.metrics.http_req_duration.values;
  const out = {
    model: __ENV.MODEL || 'open',
    requests: data.metrics.http_reqs.values.count,
    dropped_iterations: data.metrics.dropped_iterations ? data.metrics.dropped_iterations.values.count : 0,
    avg: d.avg, p50: d.med, p90: d['p(90)'], p95: d['p(95)'], p99: d['p(99)'], max: d.max,
  };
  return { stdout: JSON.stringify(out) + '\n' };
}
