-- Унікальність у PostgreSQL: NULL, NULLS NOT DISTINCT, частковий унікальний індекс,
-- складений унікальний, обмеження проти індексу (FK, ON CONFLICT, DEFERRABLE).
-- Запуск: docker exec -i idx-pg psql -U postgres -e < unique_pg.sql   (помилки очікувані, скрипт не зупиняється)
\set VERBOSITY terse
DROP TABLE IF EXISTS u_default, u_nnd, accounts, members, child, child2, parent_idx, parent_partial CASCADE;

-- 1. NULL за замовчуванням різні
CREATE TABLE u_default (email text UNIQUE);
INSERT INTO u_default VALUES (NULL), (NULL);           -- ок: два NULL
SELECT count(*) AS two_nulls_default FROM u_default;

-- 2. NULLS NOT DISTINCT (PG 15+)
CREATE TABLE u_nnd (email text UNIQUE NULLS NOT DISTINCT);
INSERT INTO u_nnd VALUES (NULL);
INSERT INTO u_nnd VALUES (NULL);                       -- 23505

-- 3. Частковий унікальний: email унікальний серед не видалених
CREATE TABLE accounts (id serial PRIMARY KEY, email text NOT NULL, deleted_at timestamptz);
CREATE UNIQUE INDEX accounts_email_live ON accounts (email) WHERE deleted_at IS NULL;
INSERT INTO accounts (email) VALUES ('a@x.io');
UPDATE accounts SET deleted_at = now() WHERE email = 'a@x.io';
INSERT INTO accounts (email) VALUES ('a@x.io');        -- ок: попередній видалений
INSERT INTO accounts (email) VALUES ('a@x.io');        -- 23505: дві живі
-- ON CONFLICT виводить частковий індекс лише з тим самим WHERE
INSERT INTO accounts (email) VALUES ('a@x.io') ON CONFLICT (email) DO NOTHING;                         -- 42P10
INSERT INTO accounts (email) VALUES ('a@x.io') ON CONFLICT (email) WHERE deleted_at IS NULL DO NOTHING; -- ок, 0 рядків
SELECT email, deleted_at IS NOT NULL AS deleted FROM accounts ORDER BY id;
-- частковий індекс не можна оформити як обмеження
ALTER TABLE accounts ADD CONSTRAINT c_partial UNIQUE USING INDEX accounts_email_live;              -- помилка

-- 4. Складений унікальний: email унікальний в межах tenant
CREATE TABLE members (tenant_id int, email text, UNIQUE (tenant_id, email));
INSERT INTO members VALUES (1, 'a@x.io'), (2, 'a@x.io');  -- ок
INSERT INTO members VALUES (1, 'a@x.io');                 -- 23505
INSERT INTO members VALUES (1, NULL), (1, NULL);          -- ок: NULL у будь-якому стовпці робить ключ «різним»

-- 5. Обмеження проти індексу: на що може посилатися зовнішній ключ
CREATE TABLE parent_idx (code text);
CREATE UNIQUE INDEX ON parent_idx (code);
CREATE TABLE child (code text REFERENCES parent_idx (code));       -- ок: повний унікальний індекс підходить
CREATE TABLE parent_partial (code text, active bool);
CREATE UNIQUE INDEX ON parent_partial (code) WHERE active;
CREATE TABLE child2 (code text REFERENCES parent_partial (code));  -- 42830: частковий не підходить
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'members'::regclass;  -- UNIQUE створив обмеження й індекс
SELECT indexrelid::regclass FROM pg_index WHERE indrelid = 'members'::regclass;
