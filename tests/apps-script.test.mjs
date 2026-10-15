// Runs apps-script/Code.gs in Node against in-memory stand-ins for Google's services
// (spreadsheets, MailApp, cache, properties). Usage: node tests/apps-script.test.mjs [--html out.html]
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
import { parseCSV } from "../public/js/catalog.js";

const root = new URL("../", import.meta.url);
const read = p => readFileSync(new URL(p, root), "utf8");

function makeSheet(name, rows = []) {
  const data = rows.map(r => [...r]);
  const sheet = {
    getName: () => name,
    getSheetId: () => 123,
    getLastRow: () => data.length,
    appendRow: r => { data.push([...r]); },
    setFrozenRows() {}, getParent: () => ({ getUrl: () => "https://docs.google.com/spreadsheets/d/LEADS/edit" }),
    getDataRange: () => ({ getDisplayValues: () => data.map(r => r.map(v => String(v ?? ""))) }),
    getRange: (row, col, nRows = 1, nCols = 1) => ({
      getValues: () => data.slice(row - 1, row - 1 + nRows).map(r => r.slice(col - 1, col - 1 + nCols)),
      setValues: vals => vals.forEach((v, i) => { data[row - 1 + i] ??= []; v.forEach((x, j) => { data[row - 1 + i][col - 1 + j] = x; }); }),
      setValue: v => { data[row - 1][col - 1] = v; },
      setFontWeight() {},
    }),
    data,
  };
  return sheet;
}

function makeEnv() {
  const catalogBook = {
    getSheetByName: n => makeSheet(n, parseCSV(read({ "Models": "public/data/models.csv", "Add-ons": "public/data/addons.csv" }[n])).filter(r => r.some(v => v !== ""))),
  };
  const leadsBook = { sheets: {}, getSheetByName(n) { return this.sheets[n] || null; }, insertSheet(n) { return (this.sheets[n] = makeSheet(n)); } };
  const sent = [];
  const cache = new Map(), props = new Map();
  const ctx = {
    console: { log: console.log, error() {} },   // the script logs rejected input; keep test output clean
    SpreadsheetApp: { getActiveSpreadsheet: () => leadsBook, openById: () => catalogBook },
    MailApp: { sendEmail: m => sent.push(m), getRemainingDailyQuota: () => 100 },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: k => cache.get(k) ?? null, put: (k, v) => cache.set(k, v) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v) }) },
    Utilities: { formatDate: d => d.toISOString().slice(0, 10) },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: s => ({ setMimeType: () => ({ body: JSON.parse(s) }) }) },
  };
  vm.createContext(ctx);
  vm.runInContext(read("apps-script/Code.gs"), ctx);
  const post = payload => ctx.doPost({ postData: { contents: JSON.stringify(payload) } }).body;
  return { post, sent, leads: () => leadsBook.sheets.Leads?.data ?? [] };
}

const base = {
  leadId: "test-lead-0001", source: "sheet", fallback: false,
  contact: { first: "Pat", last: "Lee", email: "", newsletter: false },
  answers: { "Styles": "Upright, Canister", "Carpet vs. bare floor": "Mostly bare floor", "Allergies or asthma": "No", "Heard about us": "YouTube" },
  picks: [
    { slot: "Good", id: "sebo-e2", score: 4.26, bestMatch: false, addons: ["Kombi Floor Nozzle Premium (7260GS)"], cautions: [] },
    { slot: "Better", id: "sebo-k3", score: 4.43, bestMatch: false, addons: ["Kombi Floor Nozzle Premium (7260GS)"], cautions: [] },
    { slot: "Best", id: "sebo-e3", score: 4.77, bestMatch: true, addons: ["Kombi Floor Nozzle Premium (7260GS)"], cautions: [] },
  ],
};
const withEmail = (p, email) => ({ ...p, contact: { ...p.contact, email } });

let failed = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + detail}`); if (!ok) failed++; };

{
  const env = makeEnv();
  const r1 = env.post(base);
  const head = env.leads()[0];
  const col = h => head.indexOf(h);
  check("no email: saved, nothing sent", r1.ok && !r1.emailed && env.leads().length === 2 && env.sent.length === 0, JSON.stringify(r1));
  check("row holds answers and picks", env.leads()[1][col("Styles")] === "Upright, Canister" && /Best ★: Sebo Airbelt E3 Premium Canister \(fit 4\.77\) \+ Kombi/.test(env.leads()[1][col("Picks")]));

  const r2 = env.post(withEmail(base, "pat@example.com"));
  check("same lead + email: row updated, not duplicated", r2.ok && r2.emailed && env.leads().length === 2 && env.leads()[1][col("Email")] === "pat@example.com");
  check("two emails: shopper results + HOV notice", env.sent.length === 2 && env.sent[0].to === "pat@example.com" && env.sent[1].to === "hov@thehouseofvacs.com", JSON.stringify(env.sent.map(m => m.to)));
  const shopper = env.sent[0];
  check("results email has Buy links, photos and add-on from the catalog",
    shopper.htmlBody.includes("https://www.thehouseofvacs.com/store/p/sebo-airbelt-e3-premium") && shopper.htmlBody.includes("<img") &&
    shopper.htmlBody.includes("sebo-kombi-floor-nozzle-premium") && shopper.htmlBody.includes("Best match for your home") && shopper.replyTo === "hov@thehouseofvacs.com");
  check("HOV notice replies to the shopper", env.sent[1].replyTo === "pat@example.com" && env.sent[1].body.includes("Heard about us: YouTube"));
  env.post(withEmail(base, "pat@example.com"));
  check("resubmitting the same lead sends nothing new", env.sent.length === 2);
  if (process.argv[2] === "--html") writeFileSync(process.argv[3], shopper.htmlBody);
}

{
  const env = makeEnv();
  const evil = withEmail({
    ...base, leadId: "test-lead-0002",
    contact: { ...base.contact, first: "<b>Hi</b>", last: "=HYPERLINK(\"http://x\")", email: "v@example.com" },
    picks: [
      { slot: "Best", id: "not-a-model", score: 5, bestMatch: true, addons: [], cautions: [] },
      { slot: "Good", id: "sebo-e2", score: 4, bestMatch: false, addons: ["Free money <a href=x>"], cautions: ["shag", "<script>"] },
    ],
  }, "v@example.com");
  env.post(evil);
  const html = env.sent[0].htmlBody;
  const row = env.leads()[1];
  check("unknown models and add-ons are dropped from the email", !html.includes("not-a-model") && !html.includes("Free money") && html.includes("Airbelt E2"));
  check("only known caution notes are used", html.includes("highest height setting") && !html.includes("<script>"));
  check("names are escaped in the email", html.includes("Hi &lt;b&gt;Hi&lt;/b&gt;,") && !html.includes("<b>Hi</b>"));
  check("formulas are neutralized in the sheet", row[env.leads()[0].indexOf("Last name")].startsWith("'="));
}

{
  const env = makeEnv();
  let emailed = 0;
  for (let i = 0; i < 5; i++) emailed += env.post(withEmail({ ...base, leadId: `rate-limit-${i}0000` }, "same@example.com")).emailed ? 1 : 0;
  check("at most 3 results emails per address per hour", emailed === 3, `sent ${emailed}`);
  const bot = env.post({ ...withEmail(base, "bot@example.com"), leadId: "bot-lead-0000", website: "http://spam" });
  check("honeypot submissions are ignored", bot.ok && !env.leads().some(r => r.includes("bot@example.com")));
  check("bad lead ID is rejected", env.post({ ...base, leadId: "x" }).ok === false);
  check("bad email is rejected", env.post(withEmail({ ...base, leadId: "bad-email-0000" }, "nope")).ok === false);
}

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll Apps Script checks pass.");
process.exit(failed ? 1 : 0);
