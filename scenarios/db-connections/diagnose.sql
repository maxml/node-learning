-- What a DBA looks at first: the statements that consume the database, then their plan.
\pset footer off
SELECT left(regexp_replace(query, '\s+', ' ', 'g'), 70) AS query,
       calls,
       round(total_exec_time::numeric / 1000, 1) AS total_s,
       round(mean_exec_time::numeric, 2)         AS mean_ms,
       round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 1) AS pct
FROM pg_stat_statements
WHERE query NOT ILIKE '%pg_stat%'
ORDER BY total_exec_time DESC
LIMIT 3;

EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT count(*), coalesce(sum(amount), 0) FROM orders WHERE customer_id = 4242;
