-- postgresql
DECLARE @myvar INT;
SET @myvar = 5;

SELECT *
FROM somewhere
WHERE something = @myvar

-- mysql
SET @start = 1, @finish = 10; 
