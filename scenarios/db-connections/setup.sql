-- API table: 300 000 orders of 50 000 customers. On purpose there is NO index on
-- customer_id, so the API query is a sequential scan: the "slow query" of the scenario.
-- Report table for the scheduled workers: 2 000 000 ledger rows.
DROP TABLE IF EXISTS orders, ledger;
SELECT setseed(0.42);
CREATE TABLE orders (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id int           NOT NULL,
    amount      numeric(10,2) NOT NULL,
    created_at  timestamptz   NOT NULL
);
INSERT INTO orders (customer_id, amount, created_at)
SELECT 1 + floor(random() * 50000)::int, round((random() * 500)::numeric, 2),
       timestamptz '2026-01-01' + g * interval '1 minute'
FROM generate_series(1, 300000) g;

CREATE TABLE ledger (
    id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account int           NOT NULL,
    delta   numeric(12,2) NOT NULL,
    at      timestamptz   NOT NULL
);
INSERT INTO ledger (account, delta, at)
SELECT 1 + floor(random() * 10000)::int, round((random() * 200 - 100)::numeric, 2),
       timestamptz '2025-01-01' + g * interval '10 seconds'
FROM generate_series(1, 2000000) g;
VACUUM ANALYZE orders, ledger;

-- the application connects as a normal role: superuser_reserved_connections stay free for us
DROP ROLE IF EXISTS app;
CREATE ROLE app LOGIN PASSWORD 'app';
GRANT SELECT ON orders, ledger TO app;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SHOW max_connections;
