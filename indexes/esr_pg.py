"""ESR у PostgreSQL: той самий запит під чотирма порядками стовпців складеного індексу.
Кожен індекс існує сам (крім PK), тож план обирає планувальник, без підказок.
Запуск: python3 esr_pg.py
"""
import json
from pglib import psql, summary, text_plan

ORDERS = {
    "E-S-R (status, created_at, amount)": "status, created_at, amount",
    "E-R-S (status, amount, created_at)": "status, amount, created_at",
    "S-E-R (created_at, status, amount)": "created_at, status, amount",
    "R-E-S (amount, status, created_at)": "amount, status, created_at",
}
QUERIES = {
    "range 10% (amount > 900)": "SELECT * FROM orders WHERE status = 'paid' AND amount > 900 ORDER BY created_at LIMIT 20",
    "range 0.1% (amount > 999)": "SELECT * FROM orders WHERE status = 'paid' AND amount > 999 ORDER BY created_at LIMIT 20",
    "range 0.01% (amount > 999.9)": "SELECT * FROM orders WHERE status = 'paid' AND amount > 999.9 ORDER BY created_at LIMIT 20",
}


def drop_all():
    for name in psql("SELECT indexname FROM pg_indexes WHERE tablename='orders' AND indexname <> 'orders_pkey'").split():
        psql(f"DROP INDEX {name}")


print(psql("SELECT version()"))
for label, cols in ORDERS.items():
    drop_all()
    psql(f"CREATE INDEX ix ON orders ({cols}); ANALYZE orders;")
    for qlabel, q in QUERIES.items():
        print(json.dumps({"index": label, "query": qlabel, **summary(q)}, ensure_ascii=False))
    if label.startswith("E-S-R"):
        print(text_plan(QUERIES["range 10% (amount > 900)"]))
    if label.startswith("E-R-S"):
        print(text_plan(QUERIES["range 0.1% (amount > 999)"]))
        print(text_plan(QUERIES["range 10% (amount > 900)"]))
drop_all()
