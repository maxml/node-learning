"""Check-then-insert під конкуренцією в PostgreSQL: дві сесії одночасно перевіряють
«чи є email?» і вставляють. Без UNIQUE (READ COMMITTED), з UNIQUE, без UNIQUE на SERIALIZABLE.
Запуск: python3 race_pg.py
"""
import subprocess
from pglib import CONTAINER, psql

BODY = """BEGIN ISOLATION LEVEL {iso};
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM r WHERE email = 'a') THEN
    PERFORM pg_sleep(0.5);
    INSERT INTO r VALUES ('a');
  END IF;
END $$;
COMMIT;"""


def race(label, ddl, iso):
    psql(f"DROP TABLE IF EXISTS r; {ddl}")
    procs = [subprocess.Popen(["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-q", "-v", "VERBOSITY=terse"],
                              stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
             for _ in range(2)]
    for p in procs:  # обидві сесії отримують SQL до того, як чекаємо на будь-яку
        p.stdin.write(BODY.format(iso=iso))
        p.stdin.close()
    outs = [p.stdout.read().strip().replace("\n", " | ") for p in procs]
    for p in procs:
        p.wait()
    print(f"{label}: рядків 'a' = {psql('SELECT count(*) FROM r')}; сесії: {outs}")


race("без UNIQUE, READ COMMITTED", "CREATE TABLE r (email text)", "READ COMMITTED")
race("з UNIQUE, READ COMMITTED", "CREATE TABLE r (email text UNIQUE)", "READ COMMITTED")
race("без UNIQUE, SERIALIZABLE", "CREATE TABLE r (email text)", "SERIALIZABLE")
psql("DROP TABLE r")
