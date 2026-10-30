# PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2), shared_buffers=128MB, 1,000,000 rows, batches of 10000, median of 3

| key | insert s (median) | runs s | WAL MB | PK index MB | leaf density % | table MB |
| --- | --- | --- | --- | --- | --- | --- |
| bigint | 4.13 | 6.06 / 4.13 / 3.42 | 165.7 | 21.4 | 90.0 | 80.5 |
| uuidv4 | 6.87 | 6.87 / 6.87 / 6.42 | 192.9 | 37.8 | 71.8 | 88.8 |
| uuidv7 | 8.23 | 7.93 / 8.23 / 9.16 | 179.8 | 30.1 | 90.0 | 88.8 |
| uuidv4() server | 7.44 | 7.86 / 7.23 / 7.44 | 192.6 | 37.2 | 72.8 | 88.8 |
| uuidv7() server | 5.68 | 6.32 / 5.13 / 5.68 | 179.2 | 30.1 | 90.0 | 88.8 |

uuidv7() x100000 in one statement: strictly increasing = true, distinct ms timestamps = 267
uuid_extract_version: uuidv7()=7, gen_random_uuid()=4, uuidv4()=4
