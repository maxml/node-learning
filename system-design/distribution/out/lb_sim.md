# LB simulation: 10 servers x 4 workers, 300,000 requests, cost 95% 5 ms / 5% 200 ms, seed 42

## A. Equal servers, load 70%

| balancer | p50 ms | p99 ms | p99.9 ms | errors % | share to bad server % |
| --- | --- | --- | --- | --- | --- |
| round robin | 5.0 | 249 | 374 | 0.00 | - |
| random | 5.0 | 260 | 369 | 0.00 | - |
| least connections | 5.0 | 200 | 200 | 0.00 | - |
| P2C (least of 2) | 5.0 | 200 | 208 | 0.00 | - |
| P2C + peak-EWMA | 5.0 | 200 | 209 | 0.00 | - |

## B. One server 4x slower, load 70%

| balancer | p50 ms | p99 ms | p99.9 ms | errors % | share to bad server % |
| --- | --- | --- | --- | --- | --- |
| round robin | 5.0 | 260582 | 289762 | 0.00 | - |
| random | 5.8 | 262952 | 288370 | 0.00 | - |
| least connections | 5.0 | 200 | 800 | 0.00 | - |
| P2C (least of 2) | 5.0 | 202 | 800 | 0.00 | - |
| P2C + peak-EWMA | 5.0 | 202 | 341 | 0.00 | - |

## C. One server fails fast (1 ms error), load 70%

| balancer | p50 ms | p99 ms | p99.9 ms | errors % | share to bad server % |
| --- | --- | --- | --- | --- | --- |
| round robin | 5.0 | 248 | 375 | 10.00 | 10.0 |
| random | 5.0 | 260 | 370 | 10.05 | 10.0 |
| least connections | 5.0 | 200 | 200 | 45.15 | 45.2 |
| P2C (least of 2) | 5.0 | 200 | 203 | 19.07 | 19.1 |
| P2C + peak-EWMA | 5.0 | 200 | 204 | 20.12 | 20.1 |

## C+. Same, with passive outlier detection (5 consecutive errors -> eject 30 s)

| balancer | p50 ms | p99 ms | p99.9 ms | errors % | share to bad server % |
| --- | --- | --- | --- | --- | --- |
| round robin | 5.0 | 311 | 466 | 0.01 | 0.0 |
| random | 8.6 | 341 | 522 | 0.01 | 0.0 |
| least connections | 5.0 | 200 | 206 | 0.01 | 0.0 |
| P2C (least of 2) | 5.0 | 201 | 233 | 0.01 | 0.0 |
| P2C + peak-EWMA | 5.0 | 202 | 236 | 0.01 | 0.0 |

## D. 20 long-lived connections, request rate per connection Zipf(1) (top connection 27.8% of requests), load 50%

| balancing unit | p50 ms | p99 ms | offered load on busiest server |
| --- | --- | --- | --- |
| per connection (L4, round robin of connections) | 5.0 | 116557 | 154% of capacity |
| per request (L7, P2C) | 5.0 | 200 | 50% |
