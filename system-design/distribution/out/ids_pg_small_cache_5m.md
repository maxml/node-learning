# PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2), shared_buffers=16MB, 5,000,000 rows, batches of 10000, median of 1

| key | insert s (median) | runs s | WAL MB | PK index MB | leaf density % | table MB |
| --- | --- | --- | --- | --- | --- | --- |
| bigint | 30.04 | 30.04 | 835.6 | 107.1 | 90.0 | 402.7 |
| uuidv4() server | 131.21 | 131.21 | 1446.7 | 190.1 | 71.2 | 443.9 |
| uuidv7() server | 42.65 | 42.65 | 895.7 | 150.4 | 90.0 | 443.9 |

uuidv7() x100000 in one statement: strictly increasing = true, distinct ms timestamps = 310
uuid_extract_version: uuidv7()=7, gen_random_uuid()=4, uuidv4()=4
