# Consistent hashing: 1,000,000 keys, N=10 -> 11; ideal moved fraction 1/(N+1) = 9.09%

| scheme | moved N->N+1 | of them between old nodes | max/mean (N) | min/mean (N) | moved after removing node-3 | ms |
| --- | --- | --- | --- | --- | --- | --- |
| mod N | 90.94% | 81.83% | 1.00 | 0.99 | 89.95% | 261 |
| ring, 1 point/node | 9.75% | 0.00% | 3.28 | 0.09 | 10.74% | 249 |
| ring, 10 vnodes | 8.28% | 0.00% | 1.56 | 0.53 | 7.37% | 438 |
| ring, 100 vnodes | 9.23% | 0.00% | 1.16 | 0.81 | 10.60% | 528 |
| ring, 1000 vnodes | 8.71% | 0.00% | 1.07 | 0.93 | 9.94% | 838 |
| rendezvous (HRW) | 9.07% | 0.00% | 1.00 | 1.00 | 9.97% | 479 |
| jump hash | 9.08% | 0.00% | 1.00 | 0.99 | n/a (renumbering: 68.98%) | 2282 |
| Maglev, M=65537 | 9.35% | 0.25% | 1.01 | 1.00 | 10.19% | 259 |

## Ring: max/mean over 20 random node sets (N=10)

| vnodes per node | median max/mean | worst max/mean |
| --- | --- | --- |
| 1 | 3.03 | 5.93 |
| 10 | 1.53 | 1.84 |
| 100 | 1.15 | 1.25 |
| 1000 | 1.05 | 1.09 |

## Key balance vs load balance (ring, 1000 vnodes, N=10), Zipf popularity

| Zipf s | share of top key | max/mean keys | max/mean requests |
| --- | --- | --- | --- |
| 0 | 0.00% | 1.07 | 1.07 |
| 0.8 | 1.34% | 1.07 | 1.12 |
| 1 | 6.95% | 1.07 | 1.48 |
| 1.2 | 18.95% | 1.07 | 2.45 |
