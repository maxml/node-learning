-- alias
SELECT C.ID, C.NAME, C.AGE, D.DEPT
   FROM COMPANY AS C, DEPARTMENT AS D
   WHERE  C.ID = D.EMP_ID;
   
-- subquery
SELECT SUM (Sales) FROM Store_Information
WHERE Store_Name IN
    (
        SELECT Store_Name 
        FROM Geography
        WHERE Region_Name = 'West'
    );

-- create view
CREATE VIEW V_REGION_SALES AS 
    SELECT A1.Region_Name REGION, SUM(A2.Sales) SALES
    FROM Geography A1, Store_Information A2
    WHERE A1.Store_Name = A2.Store_Name
    GROUP BY A1.Region_Name;
    
-- inline view
SELECT a2.ZIP_CODE, COUNT(a1.User_ID) 
FROM
    (
        SELECT User_ID, SUM(Score) 
        FROM User_Score 
        GROUP BY User_ID 
        HAVING SUM(Score) > 200
    ) a1,
    User_Address a2
    WHERE a1.User_ID = a2.User_ID
    GROUP BY a2.ZIP_CODE;


SELECT SUM (a1.Sales) 
FROM Store_Information a1
WHERE a1.Store_Name IN
    (
        SELECT Store_Name 
        FROM Geography a2
        WHERE a2.Store_Name = a1.Store_Name
    );
