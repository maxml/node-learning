-- Demo schema: one shared table, tenant_id on every row, RLS as the last line of defence.
-- Local throwaway database only; the password is a demo value, not a secret.
DROP TABLE IF EXISTS orders;
DROP ROLE IF EXISTS app_user;

-- The application role: not the table owner, not superuser, no BYPASSRLS.
CREATE ROLE app_user LOGIN PASSWORD 'app' NOSUPERUSER NOBYPASSRLS;

CREATE TABLE orders (
  id        serial PRIMARY KEY,
  tenant_id int  NOT NULL,
  item      text NOT NULL
);
CREATE INDEX orders_tenant_idx ON orders (tenant_id);

INSERT INTO orders (tenant_id, item)
SELECT t, 'tenant-' || t || '-item-' || i
FROM generate_series(1, 3) AS t, generate_series(1, 5) AS i;

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- Without FORCE the table owner bypasses policies; here the owner is a superuser
-- (bypasses anyway), FORCE matters when a non-superuser role owns the table.
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

-- NULLIF: after a SET LOCAL ends, a custom setting reverts to '' (not NULL) for the rest
-- of the session, and ''::int would raise. NULL tenant -> predicate is NULL -> no rows (fail closed).
CREATE POLICY tenant_isolation ON orders
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::int)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::int);

-- A second, naive policy text is kept in rls-demo to show the '' cast error.
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO app_user;
GRANT USAGE ON SEQUENCE orders_id_seq TO app_user;
