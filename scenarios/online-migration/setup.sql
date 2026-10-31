-- 5 000 000 orders over 50 000 accounts in 1 000 tenants. Deterministic (setseed).
-- The tenant of an order is NOT stored on the order: it is derived through accounts.
-- That is exactly the situation of the scenario: tenant_id must be added and backfilled.
DROP TABLE IF EXISTS orders, orders_new_rows, accounts, backfill_progress CASCADE;
SELECT setseed(0.42);

CREATE TABLE accounts (
    id        bigint PRIMARY KEY,
    tenant_id bigint NOT NULL
);
INSERT INTO accounts SELECT g, 1 + (g % 1000) FROM generate_series(1, 50000) g;

CREATE TABLE orders (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id  bigint      NOT NULL,
    status      text        NOT NULL,
    amount      numeric(10,2) NOT NULL,
    created_at  timestamptz NOT NULL,
    note        text
);
INSERT INTO orders (account_id, status, amount, created_at, note)
SELECT 1 + floor(random() * 50000)::int,
       (ARRAY['new','paid','shipped','cancelled'])[1 + floor(random() * 4)::int],
       round((random() * 500)::numeric, 2),
       timestamptz '2024-01-01' + (g * interval '6 seconds'),
       md5(g::text)
FROM generate_series(1, 5000000) g;

CREATE INDEX orders_account_id_idx ON orders (account_id);
VACUUM (ANALYZE) accounts, orders;
CHECKPOINT;
SELECT pg_size_pretty(pg_total_relation_size('orders')) AS orders_total,
       pg_size_pretty(pg_relation_size('orders'))       AS orders_heap,
       (SELECT count(*) FROM orders)                    AS rows;
