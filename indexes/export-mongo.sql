-- Вивантаження тих самих рядків у Extended JSON для mongoimport (один документ на рядок).
COPY (
  SELECT json_build_object(
           '_id', id, 'status', status, 'customer_id', customer_id, 'region', region,
           'created_at', json_build_object('$date', to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
           'amount', amount::float8)
  FROM orders ORDER BY id
) TO STDOUT;
