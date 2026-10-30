# MongoDB 9.0.4, WiredTiger cache 256 MB, 1,000,000 docs, insertMany batches of 10000, median of 3

| _id | insert s (median) | runs s | _id index MB | data MB (uncompressed) |
| --- | --- | --- | --- | --- |
| ObjectId (driver) | 7.61 | 7.61 / 7.54 / 8.41 | 10.3 | 72.5 |
| UUIDv4 (Binary 4) | 16.62 | 14.37 / 16.62 / 18.48 | 30.6 | 81.1 |
| UUIDv7 (Binary 4) | 13.65 | 15.31 / 13.65 / 12.88 | 19.6 | 81.1 |
| Int64 counter | 6.01 | 6.86 / 5.65 / 6.01 | 12.5 | 68.7 |
