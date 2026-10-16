#!/usr/bin/env python3
"""Independent extraction and checking of the Task 28 export.

Deliberately a *different implementation* from the writer under test: Python's `zipfile` for the
archive — including its own CRC verification (`ZipFile.testzip()`) — and Python's `csv` module for
the per-subject files. `lib/zip.ts` and `lib/csv.ts` are hand-rolled, so the only honest way to say
they are right is to have something that did not write them open the result and disagree if they are
wrong. This is that something.

Usage: export-unzip-check.py <zip-path> <expectations.json>

Expectations:
  {
    "date":  "<ISO instant the export was stamped with>",
    "files": ["README.txt", "master.json", ...],          # exactly what the archive must hold
    "subjects": [                                          # one entry per CSV, in master's order
      {"key": "cars", "file": "cars.csv", "rows": 17, "columns": ["id", ...]}
    ]
  }
"""
import csv
import io
import json
import sys
import zipfile

ZIP_PATH, EXP_PATH = sys.argv[1], sys.argv[2]
exp = json.load(open(EXP_PATH))
subjects = exp["subjects"]
counts = {s["key"]: s["rows"] for s in subjects}

passed: list[str] = []
problems: list[str] = []


def ok(name: str, condition: bool, detail: str = "") -> None:
    (passed if condition else problems).append(name if condition else f"{name}  {detail}")


def eq(name: str, got, want) -> None:
    if got == want:
        passed.append(name)
    else:
        problems.append(f"{name}\n      got:  {got!r}\n      want: {want!r}")


with zipfile.ZipFile(ZIP_PATH) as z:
    # ---- 1. the archive itself -------------------------------------------------------------
    names = z.namelist()
    eq("the expected files are inside, and nothing else", sorted(names), sorted(exp["files"]))
    eq("README.txt comes first", names[0] if names else None, "README.txt")

    bad = z.testzip()  # decompresses every entry and checks its CRC — zipfile's own arithmetic
    ok("every entry's CRC verifies (zipfile's independent check)", bad is None, f"— first bad: {bad}")

    # ---- 2. master.json: the nesting has to survive ----------------------------------------
    master = json.loads(z.read("master.json").decode("utf-8"))
    eq("master.json carries the instant of the export", master.get("exported_at"), exp["date"])
    eq("master.json's counts equal the store's own row counts", master.get("counts"), counts)
    for key in ("cars", "enquiries", "taps", "activity", "settings"):
        ok(f"master.json carries the {key} subject", isinstance(master.get(key), list))
    ok("master.json nests costs and photos — they are not top-level subjects",
       "costs" not in master and "photos" not in master)

    cars = master.get("cars", [])
    eq("master.json holds every car the store holds", len(cars), counts["cars"])
    ok("every car carries cost_lines and photos arrays",
       all(isinstance(c.get("cost_lines"), list) and isinstance(c.get("photos"), list) for c in cars))

    eq("the nested cost lines total the costs subject",
       sum(len(c.get("cost_lines", [])) for c in cars), counts["costs"])
    eq("the nested photos total the photos subject",
       sum(len(c.get("photos", [])) for c in cars), counts["photos"])

    # ---- 3. the CSVs, read with Python's own reader ----------------------------------------
    def read_csv(name: str) -> list[list[str]]:
        text = z.read(name).decode("utf-8")
        return list(csv.reader(io.StringIO(text, newline="")))

    parsed = {s["file"]: read_csv(s["file"]) for s in subjects}

    for s in subjects:
        rows = parsed[s["file"]]
        eq(f"{s['file']}: the header is the store's own columns, in order", rows[0], s["columns"])
        eq(f"{s['file']}: one row per stored record", len(rows) - 1, s["rows"])
        ok(f"{s['file']}: every row has as many cells as the header",
           all(len(r) == len(s["columns"]) for r in rows),
           f"— widths seen: {sorted({len(r) for r in rows})}")

    # The nesting must be the *same rows* as the flat files, matched by car_id — not merely equal
    # in number. This is what "parts intact" means.
    def ids_by_car(file_name: str) -> dict[str, set[str]]:
        rows = parsed[file_name]
        id_at = rows[0].index("id")
        car_at = rows[0].index("car_id")
        by_car: dict[str, set[str]] = {}
        for row in rows[1:]:
            by_car.setdefault(row[car_at], set()).add(row[id_at])
        return by_car

    for file_name, field in (("costs.csv", "cost_lines"), ("photos.csv", "photos")):
        flat = ids_by_car(file_name)
        nested = {c["id"]: {r["id"] for r in c.get(field, [])} for c in cars}
        mismatched = [car for car, ids in flat.items() if nested.get(car) != ids]
        ok(f"{file_name}: each car nests exactly the rows the CSV files under it",
           not mismatched, f"— cars that disagree: {mismatched[:3]}")

    # ---- 4. README.txt ---------------------------------------------------------------------
    readme = z.read("README.txt").decode("utf-8")
    ok("README.txt names the date it was made", exp["date"][:10] in readme)
    ok("README.txt names every file in the archive",
       all(f in readme for f in exp["files"]),
       f"— missing: {[f for f in exp['files'] if f not in readme]}")

# ---- report --------------------------------------------------------------------------------
for line in passed:
    print(f"  PASS  {line}")
for line in problems:
    print(f"  FAIL  {line}")
print(f"\n{len(passed)} passed, {len(problems)} failed")
sys.exit(1 if problems else 0)
