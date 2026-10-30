"""Тонкощі ESR у PostgreSQL: IN, <>, змішаний напрям сортування, покривні індекси.
Запуск: python3 nuances_pg.py
"""
import json
from pglib import psql, summary, text_plan


def only(*ddl):
    for name in psql("SELECT indexname FROM pg_indexes WHERE tablename='orders' AND indexname <> 'orders_pkey'").split():
        psql(f"DROP INDEX {name}")
    for d in ddl:
        psql(d)
    psql("VACUUM ANALYZE orders")  # visibility map для Index Only Scan


def run(label, q, show=False):
    print(json.dumps({"case": label, **summary(q)}, ensure_ascii=False))
    if show:
        print(text_plan(q))


only("CREATE INDEX ix ON orders (status, created_at, amount)")
run("IN (2 значення), ESR-індекс",
    "SELECT * FROM orders WHERE status IN ('paid','shipped') AND amount > 900 ORDER BY created_at LIMIT 20", show=True)
print(json.dumps({"case": "IN (2 значення), ESR-індекс, enable_seqscan=off", **summary(
    "SELECT * FROM orders WHERE status IN ('paid','shipped') AND amount > 900 ORDER BY created_at LIMIT 20",
    setup="SET enable_seqscan = off;")}, ensure_ascii=False))
run("<> 'paid', ESR-індекс",
    "SELECT * FROM orders WHERE status <> 'paid' AND amount > 900 ORDER BY created_at LIMIT 20", show=True)
run("покритий: SELECT created_at, amount, ESR-індекс",
    "SELECT created_at, amount FROM orders WHERE status = 'paid' AND amount > 900 ORDER BY created_at LIMIT 20", show=True)

only("CREATE INDEX ix ON orders (status, created_at) INCLUDE (amount)")
run("INCLUDE (amount): SELECT created_at, amount",
    "SELECT created_at, amount FROM orders WHERE status = 'paid' AND amount > 900 ORDER BY created_at LIMIT 20", show=True)

only("CREATE INDEX ix ON orders (status, customer_id, created_at)")
run("напрям: ORDER BY customer_id, created_at DESC при (status, customer_id, created_at)",
    "SELECT * FROM orders WHERE status = 'paid' ORDER BY customer_id, created_at DESC LIMIT 20", show=True)
run("напрям: ORDER BY customer_id DESC, created_at DESC (зворотний обхід)",
    "SELECT * FROM orders WHERE status = 'paid' ORDER BY customer_id DESC, created_at DESC LIMIT 20")
only("CREATE INDEX ix ON orders (status, customer_id, created_at DESC)")
run("напрям: ORDER BY customer_id, created_at DESC при (status, customer_id, created_at DESC)",
    "SELECT * FROM orders WHERE status = 'paid' ORDER BY customer_id, created_at DESC LIMIT 20")
only()
