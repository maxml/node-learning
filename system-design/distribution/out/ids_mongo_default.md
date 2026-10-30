# MongoDB 9.0.4, WiredTiger cache 15465 MB, 1,000,000 docs, insertMany batches of 10000, median of 3

| _id | insert s (median) | runs s | _id index MB | data MB (uncompressed) |
| --- | --- | --- | --- | --- |
| ObjectId (driver) | 7.85 | 8.18 / 7.85 / 7.68 | 10.3 | 72.5 |
| UUIDv4 (Binary 4) | 12.03 | 12.03 / 13.17 / 9.80 | 35.3 | 81.1 |
| UUIDv7 (Binary 4) | 13.60 | 13.60 / 13.51 / 15.11 | 19.3 | 81.1 |
| Int64 counter | 7.17 | 6.91 / 7.17 / 7.47 | 12.5 | 68.7 |
