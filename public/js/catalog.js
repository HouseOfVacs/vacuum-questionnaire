// Turns the catalog (Models, Add-ons, Settings tabs) into the data the engine uses.
// Reads the Google Sheet, validates every row, and falls back to the repo copy
// (public/data/*.csv) if the sheet can't be reached or anything fails validation.
// buildCatalog() mirrors load() in reference/engine_prototype.py.

import { SHEET } from "./sheet-config.js";

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

const TABS = { models: "Models", addons: "Add-ons", settings: "Settings" };
const FETCH_TIMEOUT_MS = 8000;

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
  return rows;
}

/** CSV text -> {columns, rows}; each row is {header: value} (trimmed) plus _row, its sheet row number. Blank rows are skipped. */
function table(text) {
  const [head = [], ...body] = parseCSV(text);
  const columns = head.map(h => h.trim());
  const rows = [];
  body.forEach((r, i) => {
    if (!r.some(v => v.trim() !== "")) return;
    rows.push({ ...Object.fromEntries(columns.map((k, j) => [k, (r[j] ?? "").trim()])), _row: i + 2 });
  });
  return { columns, rows };
}

const num = v => Number(String(v).replace(/[$,\s]/g, ""));

/** Build the catalog from the three CSV texts. */
export function buildCatalog({ models: modelsCSV, addons: addonsCSV, settings: settingsCSV }) {
  const models = [];
  for (const g of table(modelsCSV).rows) {
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
  for (const g of table(addonsCSV).rows) {
    const flag = Object.keys(FLAG_COLUMNS).find(k => FLAG_COLUMNS[k] === g["Fixes flag"]);
    const link = /^https?:\/\//.test(g["Store link"]) ? g["Store link"] : null;   // anything else -> "Ask us"
    const key = g["Add-on"] + "|" + link;
    const addon = shared[key] ??= { name: g["Add-on"], url: link };
    for (const id of g["Model IDs (comma-separated)"].split(",").map(s => s.trim()).filter(Boolean)) {
      (addons[id] ??= {})[flag] = addon;
    }
  }

  const byName = Object.fromEntries(table(settingsCSV).rows.map(g => [g["Setting"], num(g["Value"])]));
  const settings = Object.fromEntries(Object.entries(SETTING_NAMES).map(([k, label]) => [k, byName[label]]));

  return { models, addons, settings };
}

// ---------- validation ----------

const MODEL_COLUMNS = ["ID", "Brand", "Model name", "Price", "Store link", "Style", "Cordless role",
  "Carpet", "Bare floor", "Pet hair", "Stairs & above-floor", "Ease of handling", ...Object.values(FLAG_COLUMNS),
  "HEPA", "Owner's Pick", "House favorite boost", "Active"];
const ADDON_COLUMNS = ["Add-on", "Store link", "Fixes flag", "Model IDs (comma-separated)"];
const SETTING_COLUMNS = ["Setting", "Value"];
const RATINGS = ["Carpet", "Bare floor", "Pet hair", "Stairs & above-floor", "Ease of handling"];
const STYLES = ["Upright", "Canister", "Cordless upright", "Cordless stick"];
const ROLES = ["Main vacuum", "Quick pickups"];
const FLAG_VALUES = ["OK", "Caution", "Avoid"];
const isLink = v => /^https?:\/\/\S+$/.test(v);
const isNum = v => v !== "" && Number.isFinite(num(v));
const show = v => (v === "" ? "blank" : `"${v}"`);
const joinList = xs => (xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]);

/**
 * Check every row of the three tabs. Returns {errors, notes}.
 * Any error means the catalog must not be used. Notes are reminders that don't block anything.
 * Rows with Active = No are only checked for ID and Active, so a half-filled new model can sit in the sheet.
 */
export function validateCatalog(texts) {
  const errors = [], notes = [];
  const tabs = Object.fromEntries(Object.entries(texts).map(([k, t]) => [k, table(t)]));

  const missing = (key, need) => {
    const gone = need.filter(c => !tabs[key].columns.includes(c));
    if (gone.length) errors.push(`${TABS[key]} tab: missing column${gone.length > 1 ? "s" : ""} ${gone.map(c => `"${c}"`).join(", ")}`);
    return gone.length > 0;
  };
  // Two columns with the same name: only the last one would be read, so the other is silently ignored.
  const letter = i => (i >= 26 ? letter(Math.floor(i / 26) - 1) : "") + String.fromCharCode(65 + (i % 26));
  for (const key of Object.keys(tabs)) {
    const cols = tabs[key].columns;
    for (const name of new Set(cols.filter((c, i) => c && cols.indexOf(c) !== i))) {
      const at = cols.map((c, i) => (c === name ? letter(i) : null)).filter(Boolean);
      errors.push(`${TABS[key]} tab: ${at.length} columns are named "${name}" (columns ${joinList(at)}). Delete the one you don't need.`);
    }
  }
  const badModels = missing("models", MODEL_COLUMNS);
  const badAddons = missing("addons", ADDON_COLUMNS);
  const badSettings = missing("settings", SETTING_COLUMNS);

  const ids = new Set();
  if (!badModels) {
    let active = 0, noPhoto = 0;
    for (const g of tabs.models.rows) {
      const where = `Models row ${g._row}${g["ID"] ? ` (${g["ID"]})` : ""}`;
      const err = msg => errors.push(`${where}: ${msg}`);
      const id = g["ID"];
      if (!id) { err("ID is blank"); continue; }
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) err(`ID ${show(id)} should be lowercase letters, numbers and dashes, like sebo-d4`);
      if (ids.has(id)) err(`ID "${id}" is used on more than one row`);
      ids.add(id);
      if (!["Yes", "No"].includes(g["Active"])) { err(`Active is ${show(g["Active"])}; use Yes or No`); continue; }
      if (g["Active"] === "No") continue;
      active++;

      if (!g["Brand"]) err("Brand is blank");
      if (!g["Model name"]) err("Model name is blank");
      if (!isNum(g["Price"]) || num(g["Price"]) <= 0) err(`Price is ${show(g["Price"])}; it must be a number above 0`);
      if (!isLink(g["Store link"])) err(`Store link is ${show(g["Store link"])}; it must start with https://`);
      if (g["Image URL"] && !isLink(g["Image URL"])) err(`Image URL is ${show(g["Image URL"])}; it must start with https:// or be blank`);
      if (!g["Image URL"]) noPhoto++;
      if (!STYLES.includes(g["Style"])) err(`Style is ${show(g["Style"])}; use ${STYLES.join(", ")}`);
      const role = g["Cordless role"];
      if (g["Style"]?.startsWith("Cordless")) {
        if (!ROLES.includes(role)) err(`Cordless role is ${show(role)}; a cordless model needs Main vacuum or Quick pickups`);
      } else if (role && role !== "—") err(`Cordless role is ${show(role)}; leave it blank for a corded model`);
      for (const r of RATINGS) {
        if (!isNum(g[r]) || num(g[r]) < 1 || num(g[r]) > 5) err(`${r} rating is ${show(g[r])}; it must be 1 to 5`);
      }
      for (const f of Object.values(FLAG_COLUMNS)) {
        if (!FLAG_VALUES.includes(g[f])) err(`${f} is ${show(g[f])}; use OK, Caution or Avoid`);
      }
      if (!["Yes", "No"].includes(g["HEPA"])) err(`HEPA is ${show(g["HEPA"])}; use Yes or No`);
      if (!["Yes", "No", ""].includes(g["Owner's Pick"])) err(`Owner's Pick is ${show(g["Owner's Pick"])}; use Yes or No`);
      if (!["0", "1", "2", ""].includes(g["House favorite boost"])) err(`House favorite boost is ${show(g["House favorite boost"])}; use 0, 1 or 2`);
    }
    if (!active) errors.push("Models tab: no rows have Active = Yes");
    if (noPhoto) notes.push(`${noPhoto} active model${noPhoto > 1 ? "s have" : " has"} no Image URL yet`);
  }

  if (!badAddons) {
    const flagNames = Object.values(FLAG_COLUMNS);
    for (const g of tabs.addons.rows) {
      const err = msg => errors.push(`Add-ons row ${g._row}${g["Add-on"] ? ` (${g["Add-on"]})` : ""}: ${msg}`);
      if (!g["Add-on"]) err("Add-on name is blank");
      if (!flagNames.includes(g["Fixes flag"])) err(`Fixes flag is ${show(g["Fixes flag"])}; use ${flagNames.join(", ")}`);
      const list = g["Model IDs (comma-separated)"].split(",").map(s => s.trim()).filter(Boolean);
      if (!list.length) err("no model IDs listed");
      const unknown = badModels ? [] : list.filter(id => !ids.has(id));
      if (unknown.length) err(`unknown model ID${unknown.length > 1 ? "s" : ""} ${unknown.join(", ")}`);
    }
  }

  if (!badSettings) {
    const byName = Object.fromEntries(tabs.settings.rows.map(g => [g["Setting"], g["Value"]]));
    const v = {};
    for (const [k, label] of Object.entries(SETTING_NAMES)) {
      if (!(label in byName)) errors.push(`Settings tab: "${label}" row is missing`);
      else if (!isNum(byName[label])) errors.push(`Settings tab: "${label}" is ${show(byName[label])}; it must be a number`);
      else v[k] = num(byName[label]);
    }
    const bad = (k, ok, msg) => { if (k in v && !ok) errors.push(`Settings tab: "${SETTING_NAMES[k]}" ${msg}`); };
    bad("betterMax", !("goodMax" in v) || v.betterMax > v.goodMax, "must be higher than the Good/Better price line");
    bad("goodMax", v.goodMax > 0, "must be above 0");
    bad("minFit", v.minFit >= 1 && v.minFit <= 5, "must be between 1 and 5");
    bad("tieWindow", v.tieWindow >= 0, "can't be negative");
    bad("cautionPenalty", v.cautionPenalty >= 0, "can't be negative");
    bad("hepaBonus", v.hepaBonus >= 0, "can't be negative");
    bad("limitMinEase", v.limitMinEase >= 1 && v.limitMinEase <= 5, "must be between 1 and 5");
  }

  return { errors, notes };
}

// ---------- loading ----------

async function fetchText(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { cache: "no-store", signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } catch (e) {
    throw new Error(e.name === "AbortError" ? "timed out" : e.message);
  } finally {
    clearTimeout(timer);
  }
}

// Google's query endpoint returns a tab as CSV and allows cross-site reads. headers=1 keeps it from
// guessing how many header rows there are. It also guesses each column's type, so text typed into a
// number column comes back blank; validation then reports that cell as blank.
export const sheetTabUrl = (sheet, tab) =>
  `https://docs.google.com/spreadsheets/d/${sheet.id}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tab)}`;

export async function fetchSheetTexts(sheet = SHEET) {
  const entries = await Promise.all(Object.keys(TABS).map(async k => {
    try { return [k, await fetchText(sheetTabUrl(sheet, sheet.tabs[k]))]; }
    catch (e) { throw new Error(`${TABS[k]} tab: ${e.message}`); }
  }));
  return Object.fromEntries(entries);
}

async function fetchRepoTexts(base) {
  const files = { models: "models.csv", addons: "addons.csv", settings: "settings.csv" };
  const entries = await Promise.all(Object.entries(files).map(async ([k, f]) => [k, await fetchText(base + f)]));
  return Object.fromEntries(entries);
}

/**
 * Load the catalog: the Google Sheet if it's configured, reachable and valid; otherwise the repo copy.
 * Returns {catalog, source: "sheet"|"repo", sheetProblems, errors, notes}.
 *   sheetProblems: why the sheet wasn't used (empty when it was, or when it isn't configured)
 *   errors/notes:  validation results for whichever copy is in use
 * Pass {source: "repo"} to skip the sheet.
 */
export async function loadCatalog({ source, base = "data/" } = {}) {
  const sheetProblems = [];
  if (source !== "repo" && SHEET.id) {
    try {
      const texts = await fetchSheetTexts();
      const { errors, notes } = validateCatalog(texts);
      if (!errors.length) return { catalog: buildCatalog(texts), source: "sheet", sheetProblems, errors, notes };
      sheetProblems.push(...errors);
    } catch (e) {
      sheetProblems.push(`Couldn't reach the Google Sheet (${e.message})`);
    }
  }
  const texts = await fetchRepoTexts(base);
  const { errors, notes } = validateCatalog(texts);
  return { catalog: buildCatalog(texts), source: "repo", sheetProblems, errors, notes };
}
