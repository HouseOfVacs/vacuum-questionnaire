// Runs the seven approved test households against the repo catalog (public/data/*.csv).
// Usage: node tests/run-tests.mjs     Exits 1 if any household fails.
import { readFileSync } from "node:fs";
import { buildCatalog } from "../public/js/catalog.js";
import { recommend } from "../public/js/engine.js";
import { HOUSEHOLDS, check } from "../public/js/households.js";

const read = f => readFileSync(new URL(`../public/data/${f}`, import.meta.url), "utf8");
const catalog = buildCatalog({ models: read("models.csv"), addons: read("addons.csv"), settings: read("settings.csv") });
const money = p => "$" + p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let failed = 0;
for (const h of HOUSEHOLDS) {
  const res = recommend(catalog, h.answers);
  const problems = check(res, h.expected);
  if (problems.length) failed++;
  console.log(`\n${problems.length ? "FAIL" : "PASS"}  ${h.name}${res.fallback ? "   [FALLBACK: worth a conversation]" : ""}`);
  for (const p of res.picks) {
    let extra = "";
    if (p.addons.length) extra += "  + " + p.addons.map(x => x.name).join(", ");
    if (p.cautions.length) extra += "  (caution: " + p.cautions.join(", ") + ")";
    if (p.best_match) extra += "  << BEST MATCH FOR YOUR HOME";
    console.log(`  ${p.slot.padEnd(19)}${p.name.padEnd(36)}${money(p.price).padStart(9)}  fit ${p.score.toFixed(2)}${extra}`);
  }
  for (const msg of problems) console.log("  ✗ " + msg);
}
console.log(`\n${HOUSEHOLDS.length - failed} of ${HOUSEHOLDS.length} households pass.`);
process.exit(failed ? 1 : 0);
