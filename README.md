# Vacuum Recommendation Questionnaire

A one-question-per-screen tool for [thehouseofvacs.com](https://www.thehouseofvacs.com) that asks a shopper about their home and recommends House of Vacuums models. Static site (HTML, CSS, JavaScript; no server), embedded in a Squarespace page.

The full plan is in [docs/Vacuum_Recommendation_Questionnaire_Build_Spec.md](docs/Vacuum_Recommendation_Questionnaire_Build_Spec.md).

## Layout

| Path | What it is |
| --- | --- |
| `public/` | The site that gets deployed. Everything in here is public. |
| `public/data/` | Fallback copy of the catalog (Models, Add-ons, Settings tabs as CSV). Used when the Google Sheet can't be reached or fails validation. |
| `docs/` | The build spec. |
| `reference/` | The approved Python prototype of the recommendation logic and the starter catalog workbook. |
| `scripts/export_catalog.py` | Regenerates `public/data/*.csv` from the workbook. |

## Updating the fallback catalog

```bash
python3 -m pip install openpyxl
python3 scripts/export_catalog.py
```

## Running the reference prototype

```bash
cd reference && python3 engine_prototype.py
```

It prints the seven approved test households. The JavaScript engine must reproduce them exactly.

## Build phases

1. **Set up** — repo, hosting, blank page live. ← current
2. Recommendation engine + `/test.html`
3. Catalog from the Google Sheet
4. Question screens
5. Results page
6. Lead capture
7. Embed and launch
