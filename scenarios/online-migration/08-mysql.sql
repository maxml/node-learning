-- 08. MySQL 8.4 InnoDB: which ALGORITHM each step of the same migration gets.
-- Asking for an algorithm explicitly makes MySQL refuse instead of silently copying the table.
SET SESSION cte_max_recursion_depth = 1000000;
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_id BIGINT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL
);
INSERT INTO orders (account_id, amount, created_at)
WITH RECURSIVE g(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM g WHERE n < 1000000)
SELECT 1 + n % 50000, n % 500, '2024-01-01' + INTERVAL n * 6 SECOND FROM g;

SELECT 'ADD COLUMN NULL, ALGORITHM=INSTANT' AS step;
ALTER TABLE orders ADD COLUMN tenant_id BIGINT NULL, ALGORITHM=INSTANT;
UPDATE orders SET tenant_id = 1 + account_id % 1000;

SELECT 'MODIFY NOT NULL, ALGORITHM=INSTANT (expected to be refused)' AS step;
ALTER TABLE orders MODIFY tenant_id BIGINT NOT NULL, ALGORITHM=INSTANT;

SELECT 'MODIFY NOT NULL, ALGORITHM=INPLACE, LOCK=NONE (online, but rebuilds the table)' AS step;
ALTER TABLE orders MODIFY tenant_id BIGINT NOT NULL, ALGORITHM=INPLACE, LOCK=NONE;

SELECT 'ADD INDEX, ALGORITHM=INSTANT (expected to be refused)' AS step;
ALTER TABLE orders ADD INDEX orders_tenant_created (tenant_id, created_at), ALGORITHM=INSTANT;

SELECT 'ADD INDEX, ALGORITHM=INPLACE, LOCK=NONE' AS step;
ALTER TABLE orders ADD INDEX orders_tenant_created (tenant_id, created_at), ALGORITHM=INPLACE, LOCK=NONE;
DROP TABLE orders;
