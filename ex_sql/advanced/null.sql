-- is null (SQL server)
SELECT SUM (ISNULL(Sales,100))
FROM Sales_Data;

-- nvl (oracle)
SELECT SUM (NVL(Sales,100)) FROM Sales_Data;

-- is null (mysql)
ISNULL(3/0) = 1
ISNULL(3*3) = 0

-- ifnull (mysql)
SELECT SUM (IFNULL(Sales,100)) FROM Sales_Data;

-- postgresql 
SELECT *
FROM employees
WHERE first_number IS NULL;

-- not null fields
SELECT Name, COALESCE (Business_Phone, Cell_Phone, Home_Phone) Contact_Phone
FROM Contact_Info;
