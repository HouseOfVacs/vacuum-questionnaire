/**
 * House of Vacuums: Vacuum Recommendation Questionnaire, lead capture and results emails.
 *
 * Lives in the private "HOV Questionnaire Leads" spreadsheet (Extensions → Apps Script) and is deployed
 * as a web app. Setup steps: apps-script/README.md in the repo.
 *
 * Every completed questionnaire is POSTed here. The script:
 *   1. adds (or updates) a row in the Leads tab, keyed by the browser's lead ID
 *   2. if the shopper gave an email: sends them their results (once per lead) and tells HOV (once per lead)
 *
 * The web app is public, so nothing a browser sends is trusted: the shopper's results email is built from
 * the catalog sheet using only model IDs, every value is length-limited, and emails are rate-limited.
 */

const CONFIG = {
  catalogSheetId: "1_0nVe3Gfco4YRJoBYZdVNejaBOTw0Gfc0NZZoHjzGN0",   // HOV Questionnaire Catalog
  hovEmail: "hov@thehouseofvacs.com",
  fromName: "House of Vacuums",
  leadsTab: "Leads",
  maxEmailsPerAddressPerHour: 3,
  maxShopperEmailsPerDay: 200,
};

const SHOP = {
  site: "https://www.thehouseofvacs.com",
  phone: "(434) 316-9622",
  tel: "+14343169622",
  address: "3622 Old Forest Rd, Suite D, Lynchburg, VA 24501",
  hours: "Mon–Fri 9–6, Sat 10–2, closed Sunday",
};

// Must match the "summary" labels in public/js/questions.js (plus "Lifting notes").
const ANSWER_COLUMNS = [
  "Styles", "Cordless for", "Carpet vs. bare floor", "Bare floors", "Carpet and rugs", "Pets", "I vacuum",
  "Stairs", "Allergies or asthma", "Lighter (1) to deepest clean (5)", "Trouble lifting or pushing",
  "Lifting notes", "Current vacuum", "Heard about us",
];
const HEADERS = ["Timestamp", "Lead ID", "First name", "Last name", "Email", "Newsletter", ...ANSWER_COLUMNS,
  "Picks", "Fallback", "Catalog source", "Results emailed", "HOV notified"];

const SLOTS = ["Good", "Better", "Best", "Top pick", "Also great", "Corded alternative"];
const CAUTIONS = {
  shag: "Use the highest height setting on shag.",
  wool: "Go gently on wool and hand-sewn rugs. Ask us which setting to use.",
  looped: "Watch for snagged loops on berber. Ask us which setting to use.",
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- web app entry points ----------

function doPost(e) {
  try {
    if (!e || !e.postData || e.postData.contents.length > 20000) throw new Error("bad request");
    return json(handle(JSON.parse(e.postData.contents)));
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: "Could not save this submission." });
  }
}

function doGet() {
  return json({ ok: true, service: "HOV questionnaire leads" });
}

/** Run once from the editor: creates the Leads tab and asks for permission to send email. */
function setup() {
  leadsSheet();
  readCatalog();
  console.log("Leads tab ready. Emails left today: " + MailApp.getRemainingDailyQuota());
}

// ---------- handling a submission ----------

function handle(data) {
  if (data.website) return { ok: true, emailed: false };          // honeypot field: bots fill it in, people never see it
  const lead = clean(data);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = leadsSheet();
    let row = findRow(sheet, lead.id);
    const prev = row ? rowObject(sheet, row) : {};
    const values = HEADERS.map(h => cell(columnValue(h, lead, prev)));
    if (row) sheet.getRange(row, 1, 1, HEADERS.length).setValues([values]);
    else { sheet.appendRow(values); row = sheet.getLastRow(); }

    let emailed = !!prev["Results emailed"];
    let reason = "";
    if (lead.email && !emailed) {
      if (allowEmail(lead.email)) {
        sendResults(lead);
        sheet.getRange(row, HEADERS.indexOf("Results emailed") + 1).setValue(new Date());
        emailed = true;
      } else reason = "limit";
    }
    if (lead.email && !prev["HOV notified"]) {
      notifyHov(lead, sheet, row);
      sheet.getRange(row, HEADERS.indexOf("HOV notified") + 1).setValue(new Date());
    }
    return { ok: true, emailed, reason };
  } finally {
    lock.releaseLock();
  }
}

function columnValue(h, lead, prev) {
  switch (h) {
    case "Timestamp": return prev["Timestamp"] || new Date();
    case "Lead ID": return lead.id;
    case "First name": return lead.first;
    case "Last name": return lead.last;
    case "Email": return lead.email;
    case "Newsletter": return lead.newsletter ? "Yes" : "No";
    case "Picks": return lead.picks.map(pickSummary).join("\n");
    case "Fallback": return lead.fallback ? "Yes" : "No";
    case "Catalog source": return lead.source;
    case "Results emailed": return prev["Results emailed"] || "";
    case "HOV notified": return prev["HOV notified"] || "";
    default: return lead.answers[h] || "";
  }
}

function pickSummary(p) {
  return `${p.slot}${p.bestMatch ? " ★" : ""}: ${p.name || p.id} (fit ${p.score.toFixed(2)})` +
    (p.addons.length ? " + " + p.addons.join(", ") : "");
}

/** Validate and trim everything from the browser. Throws on anything malformed. */
function clean(d) {
  const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const id = str(d.leadId, 64);
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) throw new Error("bad lead id");
  const c = d.contact || {};
  const email = str(c.email, 120);
  if (email && !EMAIL_RE.test(email)) throw new Error("bad email");
  const answers = {};
  for (const k of ANSWER_COLUMNS) answers[k] = str((d.answers || {})[k], 1000);
  const names = catalogNames();
  const picks = (Array.isArray(d.picks) ? d.picks : []).slice(0, 4).map(p => ({
    slot: SLOTS.includes(p.slot) ? p.slot : "",
    id: /^[a-z0-9-]{1,40}$/.test(p.id) ? p.id : "",
    score: Number.isFinite(p.score) ? p.score : 0,
    bestMatch: p.bestMatch === true,
    addons: (Array.isArray(p.addons) ? p.addons : []).slice(0, 3).map(a => str(a, 100)).filter(a => names.addons[a]),
    cautions: (Array.isArray(p.cautions) ? p.cautions : []).filter(f => CAUTIONS[f]),
  })).filter(p => p.slot && names.models[p.id]).map(p => Object.assign(p, { name: names.models[p.id] }));
  return {
    id, email, first: str(c.first, 60), last: str(c.last, 60), newsletter: c.newsletter === true,
    answers, picks, fallback: d.fallback === true, source: d.source === "repo" ? "repo" : "sheet",
  };
}

/** Stop formulas: Sheets treats a cell starting with = + - @ as a formula. */
function cell(v) {
  return typeof v === "string" && /^[=+\-@]/.test(v) ? "'" + v : v;
}

// ---------- Leads sheet ----------

function leadsSheet() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(CONFIG.leadsTab);
  if (!sheet) sheet = book.insertSheet(CONFIG.leadsTab);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sheet;
}

function findRow(sheet, id) {
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const ids = sheet.getRange(2, 2, last - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) if (ids[i][0] === id) return i + 2;
  return 0;
}

function rowObject(sheet, row) {
  const vals = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
  return Object.fromEntries(HEADERS.map((h, i) => [h, vals[i]]));
}

// ---------- catalog (for the shopper's email) ----------

let catalogCache = null;

function readCatalog() {
  if (catalogCache) return catalogCache;
  const book = SpreadsheetApp.openById(CONFIG.catalogSheetId);
  const tab = name => {
    const [head, ...rows] = book.getSheetByName(name).getDataRange().getDisplayValues();
    return rows.map(r => Object.fromEntries(head.map((h, i) => [String(h).trim(), String(r[i]).trim()])));
  };
  const models = {};
  for (const m of tab("Models")) if (m["ID"]) models[m["ID"]] = m;
  const addons = {};
  for (const a of tab("Add-ons")) if (a["Add-on"]) addons[a["Add-on"]] = a;
  catalogCache = { models, addons };
  return catalogCache;
}

function catalogNames() {
  const { models, addons } = readCatalog();
  return {
    models: Object.fromEntries(Object.entries(models).map(([id, m]) => [id, m["Model name"]])),
    addons: Object.fromEntries(Object.keys(addons).map(n => [n, true])),
  };
}

// ---------- emails ----------

function allowEmail(email) {
  if (MailApp.getRemainingDailyQuota() < 5) return false;
  const cache = CacheService.getScriptCache();
  const key = "sent:" + email.toLowerCase();
  const recent = Number(cache.get(key) || 0);
  if (recent >= CONFIG.maxEmailsPerAddressPerHour) return false;
  const props = PropertiesService.getScriptProperties();
  const dayKey = "sent:" + Utilities.formatDate(new Date(), "America/New_York", "yyyy-MM-dd");
  const today = Number(props.getProperty(dayKey) || 0);
  if (today >= CONFIG.maxShopperEmailsPerDay) return false;
  cache.put(key, String(recent + 1), 3600);
  props.setProperty(dayKey, String(today + 1));
  return true;
}

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isLink = v => /^https:\/\/\S+$/.test(v || "");
const money = v => {
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : esc(v);
};

/** The shopper's results, styled like the site. Built only from the catalog sheet and fixed text. */
function sendResults(lead) {
  const { models, addons } = readCatalog();
  const C = { ink: "#1e2f3e", soft: "#5b6772", page: "#f9f6f1", pill: "#efe4e0", plum: "#52414c", line: "#e2d9d3", caution: "#f6ecd9" };
  const serif = "'Noto Serif', Georgia, 'Times New Roman', serif";
  const sans = "Lato, Helvetica, Arial, sans-serif";
  const button = `display:inline-block;background:${C.plum};color:#ffffff;text-decoration:none;font-family:Raleway,Helvetica,Arial,sans-serif;font-weight:600;letter-spacing:.1em;font-size:15px;padding:12px 26px;border-radius:6px;`;

  const cards = lead.picks.map(p => {
    const m = models[p.id];
    const badges = [p.bestMatch && "★ Best match for your home", m["Owner's Pick"] === "Yes" && "Owner's Pick"].filter(Boolean)
      .map(b => `<span style="display:inline-block;border:1px solid ${C.plum};${b.startsWith("★") ? `background:${C.plum};color:#fff;` : `color:${C.plum};`}border-radius:999px;padding:2px 10px;font-size:12px;margin:0 6px 4px 0;">${esc(b)}</span>`).join("");
    const addonLines = p.addons.map(name => {
      const a = addons[name];
      const label = isLink(a["Store link"]) ? `<a href="${esc(a["Store link"])}" style="color:${C.ink};">${esc(name)}</a>` : `${esc(name)} (ask us about it)`;
      return `<p style="margin:8px 0 0;padding:8px 12px;background:${C.pill};border-radius:8px;font-size:15px;">+ Add the ${label}</p>`;
    }).join("");
    const cautionLines = p.cautions.map(f => `<p style="margin:8px 0 0;padding:8px 12px;background:${C.caution};border-radius:8px;font-size:15px;"><strong>Note:</strong> ${esc(CAUTIONS[f])}</p>`).join("");
    const photo = isLink(m["Image URL"]) ? `<img src="${esc(m["Image URL"])}" alt="${esc(m["Model name"])}" width="140" style="display:block;width:140px;height:auto;margin:0 auto 8px;">` : "";
    const buy = isLink(m["Store link"]) ? `<p style="margin:14px 0 0;"><a href="${esc(m["Store link"])}" style="${button}">buy</a></p>` : "";
    return `
      <tr><td style="padding:0 0 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:${p.bestMatch ? `2px solid ${C.plum}` : `1px solid ${C.line}`};border-radius:12px;">
          <tr><td style="padding:12px 16px;background:${C.pill};border-radius:12px 12px 0 0;font-family:${sans};font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:${C.ink};">
            <strong>${esc(p.slot)}</strong>
          </td></tr>
          <tr><td style="padding:14px 16px 18px;font-family:${sans};color:${C.ink};">
            ${photo}
            <div>${badges}</div>
            <p style="margin:4px 0 2px;font-family:${serif};font-size:20px;line-height:1.3;">${esc(m["Model name"])}</p>
            <p style="margin:0;font-size:17px;font-weight:bold;">${money(m["Price"])}</p>
            ${cautionLines}${addonLines}${buy}
          </td></tr>
        </table>
      </td></tr>`;
  }).join("");

  const hello = lead.first ? `Hi ${esc(lead.first)},` : "Hi,";
  const intro = lead.fallback
    ? "Your answers don't line up neatly with one of the vacuums we carry online, so we'd rather talk it through than guess. Reply to this email or give us a call and we'll point you to the right one."
    : "Here are the vacuums we'd recommend for your home, based on your answers to our questionnaire.";

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:0;background:${C.page};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.page};"><tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
        <tr><td style="padding:0 0 8px;font-family:${serif};font-size:26px;color:${C.ink};">Your vacuum recommendations</td></tr>
        <tr><td style="padding:0 0 18px;font-family:${sans};font-size:16px;line-height:1.5;color:${C.ink};">${hello}<br>${esc(intro)}</td></tr>
        ${cards}
        <tr><td style="padding:8px 0 0;font-family:${sans};font-size:15px;line-height:1.5;color:${C.ink};border-top:1px solid ${C.line};">
          <p style="margin:14px 0 6px;"><strong>Questions?</strong> Just reply to this email, call <a href="tel:${SHOP.tel}" style="color:${C.ink};">${SHOP.phone}</a>, or visit us at ${esc(SHOP.address)}. ${esc(SHOP.hours)}.</p>
          <p style="margin:0;color:${C.soft};"><a href="${SHOP.site}" style="color:${C.soft};">House of Vacuums</a> · Lynchburg, VA</p>
        </td></tr>
      </table>
    </td></tr></table></body></html>`;

  const text = [hello, "", intro, "",
    ...lead.picks.map(p => {
      const m = models[p.id];
      return `${p.slot}${p.bestMatch ? " (Best match for your home)" : ""}: ${m["Model name"]}, ${money(m["Price"])}\n${m["Store link"]}` +
        p.addons.map(a => `\n+ Add the ${a}`).join("");
    }),
    "", `Questions? Reply to this email or call ${SHOP.phone}.`, `${SHOP.address}. ${SHOP.hours}.`].join("\n");

  MailApp.sendEmail({
    to: lead.email,
    subject: "Your vacuum recommendations from House of Vacuums",
    htmlBody: html,
    body: text,
    name: CONFIG.fromName,
    replyTo: CONFIG.hovEmail,
  });
}

/** Tell HOV about a lead that left an email address. Replies go straight to the shopper. */
function notifyHov(lead, sheet, row) {
  const name = [lead.first, lead.last].filter(Boolean).join(" ") || "(no name)";
  const link = `${sheet.getParent().getUrl()}#gid=${sheet.getSheetId()}&range=A${row}`;
  const body = [
    `${name} <${lead.email}> finished the Vacuum Recommendation Questionnaire.`,
    `Newsletter: ${lead.newsletter ? "Yes, add to the mailing list" : "No"}`, "",
    "Picks:", ...lead.picks.map(p => "  " + pickSummary(p)), lead.fallback ? "  (Fallback: worth a conversation)" : "", "",
    "Answers:", ...ANSWER_COLUMNS.filter(k => lead.answers[k]).map(k => `  ${k}: ${lead.answers[k]}`), "",
    `Leads sheet row: ${link}`,
    "Reply to this email to answer the shopper directly.",
  ].join("\n");
  MailApp.sendEmail({
    to: CONFIG.hovEmail,
    subject: `New questionnaire lead: ${name}`,
    body,
    name: "Vacuum Questionnaire",
    replyTo: lead.email,
  });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
