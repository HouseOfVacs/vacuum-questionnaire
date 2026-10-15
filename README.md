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
| `public/js/engine.js` | The recommendation engine, ported line for line from the prototype. |
| `public/js/catalog.js` | Loads the catalog from the Google Sheet, validates every row, and falls back to the repo copy on any problem. |
| `public/js/sheet-config.js` | The Google Sheet's ID and tab names. The sheet must be shared as "Anyone with the link: Viewer". |
| `public/js/households.js` | The seven approved test households and their expected results. |
| `public/test.html` | Runs the seven households in the browser and shows pass or fail. |
| `tests/run-tests.mjs` | The same check from the command line. CI runs it before every deploy, so a failing household blocks the deploy. |

## Updating the fallback catalog

The live catalog is the Google Sheet. After Matt approves a catalog change, refresh the repo copy from the sheet, run the tests, and commit:

```bash
node scripts/pull-sheet.mjs
```

`scripts/export_catalog.py` rebuilds the CSVs from the original workbook instead (needs `pip install openpyxl`).

## Running the tests

```bash
node tests/run-tests.mjs
```

Or serve the site locally and open http://localhost:8787/test.html:

```bash
python3 -m http.server 8787 --directory public
```

Live: https://houseofvacs.github.io/vacuum-questionnaire/test.html

## Running the reference prototype

```bash
cd reference && python3 engine_prototype.py
```

It prints the seven approved test households. The JavaScript engine must reproduce them exactly.

## Build phases

1. **Set up** — repo, hosting, blank page live. ✓
2. **Recommendation engine** + `/test.html` ✓
3. **Catalog from the Google Sheet** ← current
4. Question screens
5. Results page
6. Lead capture
7. Embed and launch
