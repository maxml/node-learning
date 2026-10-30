-- CDC on PostgreSQL 18 via logical decoding (test_decoding + pgoutput).
-- Run: psql -U postgres -v ON_ERROR_STOP=1 -f pg_cdc.sql   (server started with wal_level=logical)
\pset pager off
\echo '== 0. versions and settings'
SELECT version();
SHOW wal_level;
SHOW max_slot_wal_keep_size;
SHOW idle_replication_slot_timeout;

DROP TABLE IF EXISTS items, other, filler;
CREATE TABLE items (id int PRIMARY KEY, name text, qty int, note text);
INSERT INTO items VALUES (1, 'apple', 10, 'x'), (2, 'pear', 5, 'y');

SELECT pg_create_logical_replication_slot('cdc_slot', 'test_decoding');

\echo '== 1. INSERT / UPDATE / DELETE with default REPLICA IDENTITY (primary key)'
INSERT INTO items VALUES (3, 'plum', 7, 'z');
UPDATE items SET qty = 11 WHERE id = 1;          -- key not changed
UPDATE items SET id = 10 WHERE id = 2;            -- key changed
DELETE FROM items WHERE id = 3;
SELECT lsn, xid, data FROM pg_logical_slot_get_changes('cdc_slot', NULL, NULL);

\echo '== 2. Same with REPLICA IDENTITY FULL'
ALTER TABLE items REPLICA IDENTITY FULL;
UPDATE items SET qty = 12 WHERE id = 1;
DELETE FROM items WHERE id = 10;
SELECT data FROM pg_logical_slot_get_changes('cdc_slot', NULL, NULL);
ALTER TABLE items REPLICA IDENTITY DEFAULT;

\echo '== 3. Rolled-back transaction is absent; committed multi-row transaction is one BEGIN..COMMIT block'
BEGIN; INSERT INTO items VALUES (100, 'ghost', 0, 'rb'); ROLLBACK;
BEGIN;
INSERT INTO items VALUES (20, 'a', 1, 'n'), (21, 'b', 2, 'n');
UPDATE items SET qty = qty + 100 WHERE id IN (20, 21);
COMMIT;
SELECT data FROM pg_logical_slot_get_changes('cdc_slot', NULL, NULL);

\echo '== 4. Unchanged TOASTed column is not sent on UPDATE'
ALTER TABLE items ALTER COLUMN note SET STORAGE EXTERNAL;   -- no compression -> out-of-line
INSERT INTO items VALUES (30, 'big', 1, repeat('Z', 10000));
SELECT count(*) AS drained_rows FROM pg_logical_slot_get_changes('cdc_slot', NULL, NULL);
UPDATE items SET qty = 2 WHERE id = 30;
SELECT data FROM pg_logical_slot_get_changes('cdc_slot', NULL, NULL);

\echo '== 5. DDL is not emitted by logical decoding'
ALTER TABLE items ADD COLUMN color text;
INSERT INTO items (id, name, qty, color) VALUES (40, 'kiwi', 3, 'green');
SELECT data FROM pg_logical_slot_get_changes('cdc_slot', NULL, NULL);

\echo '== 6. Slot retains WAL while the consumer does not read'
SELECT slot_name, active, restart_lsn, confirmed_flush_lsn, wal_status,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained
FROM pg_replication_slots;
CREATE TABLE filler (id serial, pad text);
INSERT INTO filler (pad) SELECT repeat('w', 500) FROM generate_series(1, 200000);
SELECT pg_switch_wal() IS NOT NULL AS switched;
CHECKPOINT;
SELECT slot_name, restart_lsn, wal_status,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained,
       pg_size_pretty(safe_wal_size) AS safe_wal_size
FROM pg_replication_slots;
SELECT count(*) AS wal_segments, pg_size_pretty(sum(size)) AS pg_wal_size FROM pg_ls_waldir();
\echo '-- consumer catches up (advance slot), then checkpoint lets the server recycle WAL'
SELECT end_lsn IS NOT NULL AS advanced FROM pg_replication_slot_advance('cdc_slot', pg_current_wal_lsn());
CHECKPOINT;
SELECT slot_name, restart_lsn,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained
FROM pg_replication_slots;
SELECT count(*) AS wal_segments, pg_size_pretty(sum(size)) AS pg_wal_size FROM pg_ls_waldir();

\echo '== 6b. max_slot_wal_keep_size caps retention: a lagging slot is invalidated (wal_status = lost)'
ALTER SYSTEM SET max_slot_wal_keep_size = '64MB';
SELECT pg_reload_conf();
SELECT pg_sleep(1);
SELECT slot_name, wal_status, pg_size_pretty(safe_wal_size) AS safe_wal_size FROM pg_replication_slots;
INSERT INTO filler (pad) SELECT repeat('w', 500) FROM generate_series(1, 400000);
SELECT pg_switch_wal() IS NOT NULL AS switched;
CHECKPOINT;
SELECT slot_name, restart_lsn, wal_status, invalidation_reason FROM pg_replication_slots;
\set ON_ERROR_STOP 0
SELECT count(*) FROM pg_logical_slot_get_changes('cdc_slot', NULL, NULL);
\set ON_ERROR_STOP 1
SELECT pg_drop_replication_slot('cdc_slot');
ALTER SYSTEM RESET max_slot_wal_keep_size;
SELECT pg_reload_conf();
SELECT pg_create_logical_replication_slot('cdc_slot', 'test_decoding') IS NOT NULL AS recreated;

\echo '== 7. pgoutput needs a publication; it streams only tables in it'
CREATE PUBLICATION cdc_pub FOR TABLE items;
SELECT pg_create_logical_replication_slot('cdc_pgoutput', 'pgoutput');
INSERT INTO items (id, name, qty) VALUES (50, 'fig', 1);
CREATE TABLE other (id int PRIMARY KEY);
INSERT INTO other VALUES (1);
-- binary protocol: show message type letters (B=Begin, R=Relation, I=Insert, C=Commit)
SELECT string_agg(chr(get_byte(data, 0)), ' ' ORDER BY lsn) AS message_types
FROM pg_logical_slot_get_binary_changes('cdc_pgoutput', NULL, NULL,
       'proto_version', '4', 'publication_names', 'cdc_pub');

\echo '== 8. Failover-slot flag (PG 17+)'
SELECT pg_create_logical_replication_slot('cdc_failover', 'pgoutput', false, false, true);
SELECT slot_name, plugin, failover, synced FROM pg_replication_slots ORDER BY slot_name;

\echo '== 9. REPLICA IDENTITY NOTHING in a publication that publishes updates: UPDATE fails on the source'
ALTER TABLE items REPLICA IDENTITY NOTHING;
\set ON_ERROR_STOP 0
UPDATE items SET qty = 0 WHERE id = 50;
\set ON_ERROR_STOP 1
ALTER TABLE items REPLICA IDENTITY DEFAULT;

SELECT count(pg_drop_replication_slot(slot_name)) AS dropped_slots FROM pg_replication_slots;
DROP PUBLICATION cdc_pub;
DROP TABLE other, filler;
