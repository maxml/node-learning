BEGIN;

UPDATE accounts SET balance = balance + 100 WHERE id = 10;
UPDATE accounts SET balance = balance - 100 WHERE id = 11;

COMMIT;


BEGIN;

INSERT INTO foo(column1,column2,column3) VALUES (1,2,0);
INSERT INTO foo(column1,column2,column3) VALUES (1,2,0);
INSERT INTO foo(column1,column2,column3) VALUES (1,2,0);

SELECT * FROM foo;

SAVEPOINT main_values_inserted;

INSERT INTO foo(column1,column2,column3) VALUES (1,2,1/0);
ROLLBACK TO SAVEPOINT main_values_inserted;
INSERT INTO foo(column1,column2,column3) VALUES (1,2,3);
SELECT * FROM foo;

COMMIT;

