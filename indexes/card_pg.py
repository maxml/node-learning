"""Кардинальність у PostgreSQL: індекс на низькокардинальному стовпці, частковий індекс,
статистика pg_stats і CREATE STATISTICS, порядок (status, customer_id) проти (customer_id, status)
і skip scan. Той самий скрипт запускається на PostgreSQL 17 (PG_CONTAINER=idx-pg17) для порівняння.
Запуск: python3 card_pg.py
"""
import json
from pglib import psql, summary, text_plan


def only(*ddl):
    for name in psql("SELECT indexname FROM pg_indexes WHERE tablename='orders' AND indexname <> 'orders_pkey'").split():
        psql(f"DROP INDEX {name}")
    psql("DROP STATISTICS IF EXISTS st_cust_region")
    for d in ddl:
        psql(d)
    psql("ANALYZE orders")


def run(label, q, setup="", show=False):
    print(json.dumps({"case": label, **summary(q, setup)}, ensure_ascii=False))
    if show:
        print(text_plan(q, setup))


print(psql("SELECT version()"))
only()
print("pg_stats:")
print(psql("""SELECT attname, n_distinct, most_common_vals::text, most_common_freqs::text
              FROM pg_stats WHERE tablename = 'orders' AND attname IN ('status','customer_id','region')"""))

# 1. Індекс на стовпці з 5 значеннями
only("CREATE INDEX ix ON orders (status)")
run("status = 'paid' (60%), індекс (status)", "SELECT * FROM orders WHERE status = 'paid'")
run("status = 'refunded' (2%), індекс (status)", "SELECT * FROM orders WHERE status = 'refunded'")
run("status = 'paid' (60%), індекс (status), enable_seqscan=off", "SELECT * FROM orders WHERE status = 'paid'",
    setup="SET enable_seqscan = off;")

# 2. Частковий індекс під рідкісне значення
only("CREATE INDEX ix ON orders (created_at) WHERE status = 'refunded'")
print(psql("SELECT pg_size_pretty(pg_relation_size('ix')) AS partial_size"))
run("status = 'refunded' ORDER BY created_at LIMIT 20, частковий індекс",
    "SELECT * FROM orders WHERE status = 'refunded' ORDER BY created_at LIMIT 20")
only("CREATE INDEX ix ON orders (status, created_at)")
print(psql("SELECT pg_size_pretty(pg_relation_size('ix')) AS full_size"))

# 3. Корельовані стовпці: region = customer_id % 20
only()
run("customer_id = 4242 AND region = 2, без розширеної статистики",
    "SELECT * FROM orders WHERE customer_id = 4242 AND region = 2")
psql("CREATE STATISTICS st_cust_region (dependencies) ON customer_id, region FROM orders; ANALYZE orders;")
run("customer_id = 4242 AND region = 2, з CREATE STATISTICS (dependencies)",
    "SELECT * FROM orders WHERE customer_id = 4242 AND region = 2")
psql("DROP STATISTICS st_cust_region")

# 4. Порядок рівностей у складеному індексі й префікс для інших запитів
for spec in ["status, customer_id", "customer_id, status"]:
    only(f"CREATE INDEX ix ON orders ({spec})")
    run(f"({spec}): status = 'paid' AND customer_id = 4242",
        "SELECT * FROM orders WHERE status = 'paid' AND customer_id = 4242")
    run(f"({spec}): лише customer_id = 4242", "SELECT * FROM orders WHERE customer_id = 4242",
        show=spec.startswith("status"))
    run(f"({spec}): лише status = 'refunded' (план за вибором)",
        "SELECT count(*) FROM orders WHERE status = 'refunded'")
    run(f"({spec}): лише status = 'refunded', seqscan і bitmap вимкнено",
        "SELECT count(*) FROM orders WHERE status = 'refunded'",
        setup="SET enable_seqscan = off; SET enable_bitmapscan = off;")
only()
