"""Export each tab of the catalog workbook to a CSV in public/data/.

These CSVs are the fallback copy the questionnaire uses when the Google Sheet
can't be reached or fails validation. Re-run after editing the workbook:

    python3 scripts/export_catalog.py [path/to/workbook.xlsx]
"""
import csv
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "reference" / "HOV_Questionnaire_Catalog_v1.xlsx"
OUT = ROOT / "public" / "data"
TABS = {"Models": "models.csv", "Add-ons": "addons.csv", "Settings": "settings.csv"}


def cell(v):
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


wb = openpyxl.load_workbook(SRC, data_only=True)
OUT.mkdir(parents=True, exist_ok=True)
for tab, name in TABS.items():
    rows = [r for r in wb[tab].iter_rows(values_only=True) if any(v is not None for v in r)]
    with open(OUT / name, "w", newline="", encoding="utf-8") as f:
        csv.writer(f, lineterminator="\n").writerows([[cell(v) for v in r] for r in rows])
    print(f"{tab}: {len(rows) - 1} rows -> {(OUT / name).relative_to(ROOT)}")
