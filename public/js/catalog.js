// Turns the catalog CSVs (Models, Add-ons, Settings tabs) into the data the engine uses.
// Mirrors load() in reference/engine_prototype.py.

export const FLAG_COLUMNS = { wool: "Wool / hand-sewn", shag: "Shag / high pile", looped: "Looped / berber" };

const STYLE_NAMES = { "Cordless stick": "Cordless (stick)", "Cordless upright": "Cordless (upright)" };

const SETTING_NAMES = {
  goodMax: "Good/Better price line",
  betterMax: "Better/Best price line",
  minFit: "Minimum fit score",
  tieWindow: "Tie window",
  cautionPenalty: "Caution penalty",
  hepaBonus: "HEPA allergy bonus",
  limitMinEase: "Q10 minimum ease",
};

/** Parse CSV text into an array of rows (arrays of strings). Handles quotes and CRLF. */
export function parseCSV(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim() !== ""));
}

/** CSV rows -> array of {header: value} objects, values trimmed. */
function records(rows) {
  const [head, ...body] = rows;
  const keys = head.map(h => h.trim());
  return body.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

const num = v => Number(String(v).replace(/[$,\s]/g, ""));

/** Build the catalog from the three CSV texts. */
export function buildCatalog({ models: modelsCSV, addons: addonsCSV, settings: settingsCSV }) {
  const models = [];
  for (const g of records(parseCSV(modelsCSV))) {
    if (!g["ID"] || g["Active"] !== "Yes") continue;
    const brand = g["Brand"];
    let name = g["Model name"];
    if (name.startsWith(brand + " ")) name = name.slice(brand.length + 1);
    models.push({
      id: g["ID"], brand, name, fullName: g["Model name"], price: num(g["Price"]),
      url: g["Store link"], image: g["Image URL"] || null,
      style: STYLE_NAMES[g["Style"]] ?? g["Style"], role: g["Cordless role"] || "—",
      carpet: num(g["Carpet"]), bare: num(g["Bare floor"]), pet: num(g["Pet hair"]),
      stairs: num(g["Stairs & above-floor"]), ease: num(g["Ease of handling"]),
      flags: Object.fromEntries(Object.entries(FLAG_COLUMNS).map(([k, col]) => [k, g[col]])),
      pick: g["Owner's Pick"] === "Yes", boost: num(g["House favorite boost"] || 0),
      hepa: g["HEPA"] === "Yes", blurb: g["Blurb (optional)"] || null,
    });
  }

  // {modelId: {flag: addon}} -- an add-on turns that flag to OK for that model
  const addons = {};
  const shared = {};
  for (const g of records(parseCSV(addonsCSV))) {
    const flag = Object.keys(FLAG_COLUMNS).find(k => FLAG_COLUMNS[k] === g["Fixes flag"]);
    const link = /^https?:\/\//.test(g["Store link"]) ? g["Store link"] : null;   // anything else -> "Ask us"
    const key = g["Add-on"] + "|" + link;
    const addon = shared[key] ??= { name: g["Add-on"], url: link };
    for (const id of g["Model IDs (comma-separated)"].split(",").map(s => s.trim()).filter(Boolean)) {
      (addons[id] ??= {})[flag] = addon;
    }
  }

  const byName = Object.fromEntries(records(parseCSV(settingsCSV)).map(g => [g["Setting"], num(g["Value"])]));
  const settings = Object.fromEntries(Object.entries(SETTING_NAMES).map(([k, label]) => [k, byName[label]]));

  return { models, addons, settings };
}

/** Fetch the repo copy of the catalog (public/data/*.csv). */
export async function loadRepoCatalog(base = "data/") {
  const get = async f => {
    const r = await fetch(base + f, { cache: "no-cache" });
    if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
    return r.text();
  };
  const [models, addons, settings] = await Promise.all(["models.csv", "addons.csv", "settings.csv"].map(get));
  return buildCatalog({ models, addons, settings });
}
