SELECT *
FROM course
    JOIN department
    ON course.dept_name=department.dept_name;

SELECT prereq.course_id, title, dept_name, credits, prereq_id
FROM prereq
    LEFT OUTER JOIN course
    ON prereq.course_id=course.course_id;

SELECT course.course_id, title, dept_name, credits, prereq_id
FROM prereq
    RIGHT OUTER JOIN course
    ON prereq.course_id=course.course_id;

SELECT DISTINCT course_id
FROM section
WHERE semester = 'Fall' AND year= 2009 AND course_id IN (
    SELECT course_id
    FROM section
    WHERE semester = 'Spring' AND year= 2010
  ); 