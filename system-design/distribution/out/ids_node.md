# IDs in Node v24.14.1

| check | result |
| --- | --- |
| crypto.randomUUID() sample | `d97f6536-6bb4-4b0b-82db-ad33fd615a64` |
| crypto.randomUUID() version (uuid.version) | 4 |
| typeof crypto.randomUUIDv7 | undefined |
| uuid v4() version | 4 |
| uuid v7(): 200,000 ids in a tight loop | 932 distinct ms prefixes, strictly increasing as strings: true |
| v7 first 48 bits as Unix ms | 1793369629693 = 2026-10-30T14:13:49.693Z (creation time is readable from the id) |
| validate(v7) | true |
| ObjectId a / b | `6ae4a61ef5a8c3985211511d` / `6ae4a61ef5a8c3985211511e` |
| same 5-byte process part | true |
| counter b - a | 1 |
| getTimestamp() | 2026-10-30T14:13:50.000Z |
| generate 1M: crypto.randomUUID() | 0.12 s |
| generate 1M: uuid v4() | 0.39 s |
| generate 1M: uuid v7() | 4.89 s |
| generate 1M: new ObjectId() | 0.11 s |
| bytes: uuid binary / uuid text / ObjectId / bigint | 16 / 36 / 12 / 8 |
| Snowflake 41-bit ms range | 69.7 years from the chosen epoch |
| Snowflake 12-bit sequence | 4096 ids per ms per worker = 4,096,000/s |
| Snowflake 10-bit worker id | 1024 workers |
| ObjectId 4-byte seconds overflow | 2106-02-07T06:28:16.000Z |
