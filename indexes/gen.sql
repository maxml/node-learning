-- Набір даних orders, спільний для PostgreSQL і MongoDB (MongoDB отримує ті самі рядки через export-mongo.sql).
-- 1 000 000 рядків; детерміновано через setseed.
--   status       5 значень, перекіс: paid 60%, new 20%, shipped 10%, cancelled 8%, refunded 2%
--   customer_id  ~100 000 різних значень (висока кардинальність)
--   region       = customer_id % 20 (функціонально залежить від customer_id: корельовані стовпці)
--   created_at   рівномірно за ~347 днів, у порядку вставки
--   amount       0..1000, рівномірно, 2 знаки
DROP TABLE IF EXISTS orders;
SELECT setseed(0.42);
CREATE TABLE orders AS
SELECT i AS id,
       CASE WHEN r < 0.60 THEN 'paid' WHEN r < 0.80 THEN 'new' WHEN r < 0.90 THEN 'shipped'
            WHEN r < 0.98 THEN 'cancelled' ELSE 'refunded' END AS status,
       c AS customer_id,
       c % 20 AS region,
       timestamptz '2025-01-01 00:00:00+00' + i * interval '30 seconds' AS created_at,
       round((random() * 1000)::numeric, 2) AS amount
FROM (SELECT i, random() AS r, 1 + floor(random() * 100000)::int AS c
      FROM generate_series(1, 1000000) i) s;
ALTER TABLE orders ADD PRIMARY KEY (id);
VACUUM ANALYZE orders;
SELECT status, count(*) FROM orders GROUP BY 1 ORDER BY 2 DESC;
SELECT count(DISTINCT customer_id) AS customers,
       count(*) FILTER (WHERE status = 'paid' AND amount > 900) AS paid_gt_900,
       count(*) FILTER (WHERE status = 'paid' AND amount > 999) AS paid_gt_999
FROM orders;
