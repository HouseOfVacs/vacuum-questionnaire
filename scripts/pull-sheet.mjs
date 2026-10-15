// Refreshes the repo copy of the catalog (public/data/*.csv) from the published Google Sheet.
// Run after Matt approves catalog changes, then run the tests and commit:
//   node scripts/pull-sheet.mjs && node tests/run-tests.mjs
// Writes nothing if the sheet fails validation.
import { writeFileSync } from "node:fs";
import { fetchSheetTexts, validateCatalog } from "../public/js/catalog.js";
import { SHEET } from "../public/js/sheet-config.js";

if (!SHEET.publishId) {
  console.error("No Google Sheet set up in public/js/sheet-config.js");
  process.exit(1);
}
const texts = await fetchSheetTexts();
const { errors, notes } = validateCatalog(texts);
if (errors.length) {
  console.error("The sheet has problems, so the repo copy was not changed:\n  " + errors.join("\n  "));
  process.exit(1);
}
const files = { models: "models.csv", addons: "addons.csv", settings: "settings.csv" };
for (const [k, f] of Object.entries(files)) {
  const text = texts[k].replace(/\r\n/g, "\n");
  writeFileSync(new URL(`../public/data/${f}`, import.meta.url), text.endsWith("\n") ? text : text + "\n");
  console.log(`wrote public/data/${f}`);
}
for (const n of notes) console.log("note: " + n);
