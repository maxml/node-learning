# PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2), shared_buffers=16MB, 1,000,000 rows, batches of 10000, median of 3

| key | insert s (median) | runs s | WAL MB | PK index MB | leaf density % | table MB |
| --- | --- | --- | --- | --- | --- | --- |
| bigint | 4.73 | 5.84 / 4.46 / 4.73 | 165.7 | 21.4 | 90.0 | 80.5 |
| uuidv4 | 12.42 | 12.60 / 11.02 / 12.42 | 192.8 | 37.6 | 72.0 | 88.8 |
| uuidv7 | 9.86 | 9.86 / 9.68 / 9.96 | 179.2 | 30.1 | 90.0 | 88.8 |
| uuidv4() server | 13.41 | 13.41 / 13.35 / 13.80 | 193.5 | 37.7 | 71.8 | 88.8 |
| uuidv7() server | 7.08 | 7.24 / 7.08 / 7.07 | 179.2 | 30.1 | 90.0 | 88.8 |

uuidv7() x100000 in one statement: strictly increasing = true, distinct ms timestamps = 247
uuid_extract_version: uuidv7()=7, gen_random_uuid()=4, uuidv4()=4
