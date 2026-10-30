"""Тонка обгортка: psql у контейнері idx-pg, розбір EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)."""
import json, os, statistics, subprocess

CONTAINER = os.environ.get("PG_CONTAINER", "idx-pg")


def psql(sql):
    r = subprocess.run(["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-At", "-v", "ON_ERROR_STOP=1"],
                       input=sql, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr)
    return r.stdout.strip()


def explain(query, setup=""):
    out = psql(setup + "\nEXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + query + ";")
    return json.loads(out[out.index("["):])[0]


def walk(node):
    yield node
    for c in node.get("Plans", []):
        yield from walk(c)


def summary(query, setup="", runs=5):
    """Перший прогін прогріває кеш; далі runs прогонів, медіана Execution Time."""
    explain(query, setup)
    plans = [explain(query, setup) for _ in range(runs)]
    p = plans[-1]
    nodes = list(walk(p["Plan"]))
    shape = " → ".join(
        n["Node Type"] + (f" [{n['Index Name']}]" if "Index Name" in n else "") for n in nodes)
    top = p["Plan"]
    return {
        "plan": shape,
        "sort": any(n["Node Type"] in ("Sort", "Incremental Sort") for n in nodes),
        "rows": top["Actual Rows"],
        "removed_by_filter": sum(n.get("Rows Removed by Filter", 0) for n in nodes),
        "index_searches": sum(n.get("Index Searches", 0) for n in nodes),
        "heap_fetches": sum(n.get("Heap Fetches", 0) for n in nodes),
        "buffers": top.get("Shared Hit Blocks", 0) + top.get("Shared Read Blocks", 0),
        "est_rows": top["Plan Rows"],
        "ms": round(statistics.median(x["Execution Time"] for x in plans), 3),
    }


def text_plan(query, setup=""):
    return psql(setup + "\nEXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF) " + query + ";")
