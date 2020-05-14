SELECT DISTINCT dept_name
FROM course;

SELECT *
FROM course
WHERE dept_name='Comp. Sci.';

SELECT *
FROM course
WHERE credits>3;

SELECT *
FROM course
WHERE dept_name='Comp. Sci.' AND credits>3;

SELECT COUNT(course_id), dept_name
FROM course
GROUP BY dept_name;

SELECT COUNT(course_id), dept_name
FROM course
GROUP BY dept_name
HAVING COUNT(course_id)>1;

SELECT *
FROM course
ORDER BY credits;

SELECT *
FROM course
ORDER BY credits DESC;

SELECT *
FROM instructor
WHERE salary BETWEEN 50000 AND 100000;

SELECT *
FROM course
WHERE title LIKE '%to%';

SELECT *
FROM course
WHERE course_id LIKE 'CS-___'; 
