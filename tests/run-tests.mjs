// Checks the repo copy of the catalog (public/data/*.csv) and runs the seven approved test households.
// Usage: node tests/run-tests.mjs     Exits 1 on any failure.
import { readFileSync } from "node:fs";
import { buildCatalog, validateCatalog } from "../public/js/catalog.js";
import { recommend } from "../public/js/engine.js";
import { HOUSEHOLDS, check } from "../public/js/households.js";

const read = f => readFileSync(new URL(`../public/data/${f}`, import.meta.url), "utf8");
const texts = { models: read("models.csv"), addons: read("addons.csv"), settings: read("settings.csv") };
const money = p => "$" + p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let failed = 0;

// 1. The repo copy must pass validation, since it's the fallback.
const { errors, notes } = validateCatalog(texts);
console.log(`Catalog (repo copy): ${errors.length ? "FAIL" : "valid"}${notes.length ? "  · " + notes.join("; ") : ""}`);
for (const e of errors) console.log("  ✗ " + e);
if (errors.length) failed++;

// 2. Validation catches broken rows. Each case breaks one thing and expects that error.
const edit = (key, from, to) => ({ ...texts, [key]: texts[key].replace(from, to) });
const CASES = [
  ["missing price", edit("models", "riccar-r65,Riccar,Riccar R65 Cordless Stick Vacuum,449,", "riccar-r65,Riccar,Riccar R65 Cordless Stick Vacuum,,"), "Models row 2 (riccar-r65): Price is blank"],
  ["rating out of range", edit("models", "Main vacuum,3,3,3,1,5,", "Main vacuum,3,3,3,1,7,"), "Models row 3 (riccar-r10cv): Ease of handling rating is \"7\""],
  ["bad flag", edit("models", "Cordless upright,Main vacuum,3,3,3,1,5,Avoid,", "Cordless upright,Main vacuum,3,3,3,1,5,Maybe,"), "Wool / hand-sewn is \"Maybe\""],
  ["duplicate ID", edit("models", "sebo-x8,", "sebo-x7,"), "ID \"sebo-x7\" is used on more than one row"],
  ["add-on for unknown model", edit("addons", "sebo-x8", "sebo-x9"), "unknown model ID sebo-x9"],
  ["missing setting", edit("settings", /Tie window,[^\n]*\n/, ""), "\"Tie window\" row is missing"],
  ["price lines reversed", edit("settings", "Better/Best price line,1000", "Better/Best price line,700"), "must be higher than the Good/Better price line"],
  ["renamed column", edit("models", "Carpet,Bare floor", "Carpets,Bare floor"), "Models tab: missing column \"Carpet\""],
  ["not a CSV (sign-in page)", { ...texts, settings: "<!DOCTYPE html><html>" }, "Settings tab: missing columns"],
];
for (const [name, broken, want] of CASES) {
  const got = validateCatalog(broken).errors;
  const ok = got.some(e => e.includes(want));
  if (!ok) { failed++; console.log(`  ✗ validation case "${name}": expected an error containing ${want}; got ${JSON.stringify(got)}`); }
}
const inactive = edit("models", /(sebo-x8,[^\n]*),Yes,\n/, "$1,No,\n").models.replace(/sebo-x8,Sebo,[^,]*,1199/, "sebo-x8,Sebo,,");
if (validateCatalog({ ...texts, models: inactive }).errors.length) { failed++; console.log("  ✗ an inactive half-filled row should not block the catalog"); }
console.log(`Validation cases: ${CASES.length + 1} checked`);

// 3. The seven households.
const catalog = buildCatalog(texts);
let hhFailed = 0;
for (const h of HOUSEHOLDS) {
  const res = recommend(catalog, h.answers);
  const problems = check(res, h.expected);
  if (problems.length) hhFailed++;
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
console.log(`\n${HOUSEHOLDS.length - hhFailed} of ${HOUSEHOLDS.length} households pass.`);
process.exit(failed || hhFailed ? 1 : 0);
