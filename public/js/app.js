// Vacuum Recommendation Questionnaire: one question per screen, progress bar, Back, answers saved in the browser.
import { BLANK_ANSWERS, HEARD_OTHER, SCREENS, toEngineAnswers, visibleScreens } from "./questions.js";
import { loadCatalog } from "./catalog.js";
import { recommend } from "./engine.js";
import { resultsHTML } from "./results.js";
import { canEmailResults, leadPayload, newLeadId, sendLead } from "./lead.js";
import { HOUSEHOLDS } from "./households.js";

const STORE_KEY = "hov-questionnaire-v1";
const ADVANCE_DELAY_MS = 180;          // lets the tapped pill show as selected before the next screen
const RESULTS = "results";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const app = document.getElementById("app");
// ?household=A shows that test household's results without touching the shopper's saved answers (linked from test.html)
const params = new URLSearchParams(location.search);
const preview = HOUSEHOLDS.find(h => h.name.startsWith((params.get("household") || "-").toUpperCase() + "."));
const catalogSource = params.get("source") === "repo" ? "repo" : undefined;   // ?source=repo skips the Google Sheet
let state = preview
  ? { answers: { ...structuredClone(BLANK_ANSWERS), ...structuredClone(preview.answers) }, screen: RESULTS }
  : restore();
let catalogPromise = null;
let lastResult = null;        // {res, source} of the results on screen, for lead capture
let honeypot = "";            // hidden "website" field on the last screen; only bots fill it in

// ---------- saved answers ----------

function restore() {
  const fresh = { answers: structuredClone(BLANK_ANSWERS), screen: SCREENS[0].id };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (!saved || typeof saved.answers !== "object") return fresh;
    const answers = { ...structuredClone(BLANK_ANSWERS), ...saved.answers };
    const ok = saved.screen === RESULTS || visibleScreens(answers).some(s => s.id === saved.screen);
    return { answers, screen: ok ? saved.screen : SCREENS[0].id, lead: saved.lead ?? null };
  } catch {
    return fresh;
  }
}

function save() {
  if (preview) return;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* private mode: answers just won't persist */ }
}

// ---------- navigation ----------

const screenById = id => SCREENS.find(s => s.id === id);

function go(id, { focus = true } = {}) {
  state.screen = id;
  save();
  render();
  scrollToTop();
  if (focus) app.querySelector("h1")?.focus({ preventScroll: true });
}

function next() {
  const list = visibleScreens(state.answers);
  const i = list.findIndex(s => s.id === state.screen);
  go(i < list.length - 1 ? list[i + 1].id : RESULTS);
}

function back() {
  if (state.screen === RESULTS) return go(SCREENS[SCREENS.length - 1].id);
  const list = visibleScreens(state.answers);
  const i = list.findIndex(s => s.id === state.screen);
  if (i > 0) go(list[i - 1].id);
}

function startOver() {
  if (preview) { location.href = location.pathname; return; }
  lastResult = null;
  state = { answers: structuredClone(BLANK_ANSWERS), screen: SCREENS[0].id };
  go(state.screen);
}

// ---------- rendering ----------

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function canContinue(screen, a) {
  switch (screen.type) {
    case "multi": return !screen.required || a[screen.key].length > 0;
    case "single": return a[screen.key] !== null;
    case "select": return !!a[screen.key];
    default: return true;
  }
}

function header(index, total) {
  const pct = Math.round(((index + 1) / total) * 100);
  return `
    <div class="progress" role="progressbar" aria-label="Progress" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${index + 1}" aria-valuetext="Question ${index + 1} of ${total}">
      <div class="progress-fill" style="width:${pct}%"></div>
    </div>
    <div class="topline">
      <button type="button" class="back" data-action="back" ${index === 0 ? "hidden" : ""}><span aria-hidden="true">←</span> Back</button>
      <span class="count">${index + 1} of ${total}</span>
    </div>`;
}

function pills(screen, a) {
  const multi = screen.type === "multi";
  const chosen = v => (multi ? a[screen.key].includes(v) : a[screen.key] === v);
  return `<div class="pills" role="group" aria-label="${esc(screen.question)}">
    ${screen.options.map((o, i) => `<button type="button" class="pill" data-action="pick" data-index="${i}" aria-pressed="${chosen(o.value)}">${esc(o.label)}</button>`).join("")}
  </div>`;
}

function nextButton(screen, a, label = "next") {
  return `<div class="actions"><button type="button" class="button" data-action="next" ${canContinue(screen, a) ? "" : "disabled"}>${esc(label)}</button></div>`;
}

function body(screen, a) {
  switch (screen.type) {
    case "single": {
      const n = screen.notes;
      const showNotes = n && a[screen.key] === n.when;
      return pills(screen, a) + (showNotes ? `
        <label class="field"><span class="field-label">${esc(n.label)}</span>
          <textarea data-key="${n.key}" rows="3" placeholder="${esc(n.placeholder)}">${esc(a[n.key])}</textarea></label>
        ${nextButton(screen, a)}` : "");
    }
    case "multi":
      return pills(screen, a) + nextButton(screen, a);
    case "slider": {
      const v = a[screen.key];
      return `<div class="slider">
          <input type="range" min="${screen.min}" max="${screen.max}" step="1" value="${v}" data-key="${screen.key}"
            aria-label="${esc(screen.ends[0])} to ${esc(screen.ends[1])}" aria-valuetext="${sliderText(screen, v)}">
          <div class="ticks" aria-hidden="true">${Array.from({ length: screen.max - screen.min + 1 }, () => "<span></span>").join("")}</div>
          <div class="ends"><span>${esc(screen.ends[0])}</span><span>${esc(screen.ends[1])}</span></div>
        </div>` + nextButton(screen, a);
    }
    case "text":
      return `<label class="field"><span class="visually-hidden">${esc(screen.question)}</span>
          <textarea data-key="${screen.key}" rows="4" placeholder="${esc(screen.placeholder)}">${esc(a[screen.key])}</textarea></label>`
        + nextButton(screen, a, a[screen.key].trim() ? "next" : "skip");
    case "select": {
      const o = screen.other;
      return `<label class="field"><span class="visually-hidden">${esc(screen.question)}</span>
          <select data-key="${screen.key}" required>
            <option value="" ${a[screen.key] ? "" : "selected"} disabled>Choose one</option>
            ${screen.options.map(v => `<option ${a[screen.key] === v ? "selected" : ""}>${esc(v)}</option>`).join("")}
          </select></label>
        ${a[screen.key] === HEARD_OTHER ? `<label class="field"><span class="field-label">${esc(o.label)}</span>
          <input type="text" data-key="${o.key}" value="${esc(a[o.key])}" placeholder="${esc(o.placeholder)}" autocomplete="off"></label>` : ""}`
        + nextButton(screen, a);
    }
    case "contact":
      return `<form class="contact" data-action="submit" novalidate>
          <div class="row">
            <label class="field"><span class="field-label">First name</span>
              <input type="text" data-key="first_name" value="${esc(a.first_name)}" autocomplete="given-name"></label>
            <label class="field"><span class="field-label">Last name</span>
              <input type="text" data-key="last_name" value="${esc(a.last_name)}" autocomplete="family-name"></label>
          </div>
          <label class="field"><span class="field-label">Email</span>
            <input type="email" data-key="email" value="${esc(a.email)}" autocomplete="email" inputmode="email" aria-describedby="email-error"></label>
          <label class="check"><input type="checkbox" data-key="newsletter" ${a.newsletter ? "checked" : ""}>
            <span>Sign up for news and updates</span></label>
          <label class="hp" aria-hidden="true">Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label>
          <p class="error" id="email-error" role="alert" hidden></p>
          <div class="actions"><button type="submit" class="button">${esc(screen.submit)}</button></div>
        </form>`;
  }
}

function sliderText(screen, v) {
  if (v === screen.min) return screen.ends[0];
  if (v === screen.max) return screen.ends[1];
  if (v === (screen.min + screen.max) / 2) return "Balanced";
  return v < (screen.min + screen.max) / 2 ? `Leaning ${screen.ends[0].toLowerCase()}` : `Leaning toward ${screen.ends[1].toLowerCase()}`;
}

function render() {
  if (state.screen === RESULTS) return renderResults();
  const a = state.answers;
  const list = visibleScreens(a);
  const index = list.findIndex(s => s.id === state.screen);
  const screen = list[index];
  app.innerHTML = header(index, list.length) + `
    <section class="screen screen-${screen.type}">
      <h1 class="question" tabindex="-1">${esc(screen.question)}</h1>
      ${screen.help ? `<p class="help">${esc(screen.help)}</p>` : ""}
      ${body(screen, a)}
    </section>`;
}

async function renderResults() {
  app.innerHTML = `<section class="screen results">
      <div class="topline"><button type="button" class="back" data-action="back"><span aria-hidden="true">←</span> Back</button></div>
      <h1 class="question" tabindex="-1">Your recommendations</h1>
      <p class="help">Finding the best fit for your home…</p>
    </section>`;
  try {
    catalogPromise ??= loadCatalog({ source: catalogSource });
    const { catalog, source } = await catalogPromise;
    if (state.screen !== RESULTS) return;
    const res = recommend(catalog, toEngineAnswers(state.answers));
    lastResult = { res, source };
    app.querySelector(".results").innerHTML = (preview ? `<p class="preview-banner">Preview of test household ${esc(preview.name)} · <a href="test.html">back to test page</a></p>` : "")
      + (preview ? "" : `<div class="topline"><button type="button" class="back" data-action="back"><span aria-hidden="true">←</span> Back</button></div>`)
      + resultsHTML(res, catalog, state.answers, { emailForm: emailFormHTML(), preview: !!preview });
    if (!preview && state.lead && state.lead.status !== "saved") submitLead();
  } catch (e) {
    console.error(e);
    app.querySelector(".help").textContent = "Something went wrong loading the recommendations. Please call us at (434) 316-9622.";
  }
}

// ---------- lead capture ----------

/** Save this completed questionnaire (and email the results if there's an address). Safe to call again: the
    Apps Script updates the same row by lead ID and never emails the same lead twice. */
async function submitLead() {
  const lead = state.lead;
  if (!lead || !lastResult || !canEmailResults()) return;
  lead.status = "sending";
  updateEmailStatus();
  try {
    const r = await sendLead(leadPayload({ leadId: lead.id, answers: state.answers, ...lastResult, honeypot }));
    if (!r.ok) throw new Error(r.error || "not saved");
    lead.status = "saved";
    lead.emailed = r.emailed === true;
  } catch (e) {
    console.error("Lead not saved:", e);
    lead.status = "failed";
  }
  save();
  updateEmailStatus();
}

function emailStatusText() {
  const { email } = state.answers, lead = state.lead;
  if (!email || !canEmailResults() || !lead) return "";
  if (lead.emailed) return `We've emailed these results to <strong>${esc(email)}</strong>.`;
  if (lead.status === "sending" || lead.status === "pending") return `Sending these results to <strong>${esc(email)}</strong>…`;
  return `We couldn't email your results just now. Use "Email us about this model" above or give us a call.`;
}

function updateEmailStatus() {
  const el = document.getElementById("email-status");
  if (el) el.innerHTML = emailStatusText();
}

// "Email these results to me", for shoppers who skipped the email on the last screen.
function emailFormHTML() {
  const a = state.answers;
  if (a.email) return canEmailResults() && !preview ? `<p class="emailed" id="email-status" role="status">${emailStatusText()}</p>` : "";
  return `<form class="email-results" data-action="email-results" novalidate>
      <h2>Email these results to me</h2>
      <div class="email-row">
        <label class="field"><span class="visually-hidden">Email</span>
          <input type="email" name="email" placeholder="you@example.com" autocomplete="email" inputmode="email" aria-describedby="email-results-msg"></label>
        <button type="submit" class="button">send</button>
      </div>
      <p class="form-msg" id="email-results-msg" role="status"></p>
    </form>`;
}

// ---------- events ----------

app.addEventListener("click", e => {
  const el = e.target.closest("[data-action]");
  if (!el || el.tagName === "FORM") return;
  const action = el.dataset.action;
  if (action === "back") return back();
  if (action === "restart") return startOver();
  if (action === "next") return next();
  if (action === "pick") return pick(screenById(state.screen), Number(el.dataset.index));
});

function pick(screen, i) {
  const a = state.answers;
  const opt = screen.options[i];
  if (screen.type === "multi") {
    const cur = a[screen.key];
    if (cur.includes(opt.value)) a[screen.key] = cur.filter(v => v !== opt.value);
    else if (opt.exclusive) a[screen.key] = [opt.value];                       // "No preference" clears the rest
    else {
      const exclusive = screen.options.filter(o => o.exclusive).map(o => o.value);
      a[screen.key] = [...cur.filter(v => !exclusive.includes(v)), opt.value];  // a style clears "No preference"
    }
    save();
    render();
    app.querySelector(`[data-index="${i}"]`)?.focus();
    return;
  }
  a[screen.key] = opt.value;
  save();
  render();
  if (screen.notes && opt.value === screen.notes.when) {
    app.querySelector(`[data-index="${i}"]`)?.focus();
    return;                                                                     // wait for notes + Next
  }
  app.querySelectorAll(".pill").forEach(b => (b.disabled = true));
  setTimeout(() => { if (state.screen === screen.id) next(); }, ADVANCE_DELAY_MS);
}

app.addEventListener("input", e => {
  const key = e.target.dataset.key;
  if (!key) return;
  const a = state.answers;
  const screen = screenById(state.screen);
  if (e.target.type === "checkbox") a[key] = e.target.checked;
  else if (e.target.type === "range") {
    a[key] = Number(e.target.value);
    e.target.setAttribute("aria-valuetext", sliderText(screen, a[key]));
  } else a[key] = e.target.value;
  save();
  if (screen?.type === "text") app.querySelector("[data-action=next]").textContent = a[key].trim() ? "next" : "skip";
  if (screen?.type === "contact") showContactError("");
});

app.addEventListener("change", e => {
  if (e.target.tagName !== "SELECT") return;
  const screen = screenById(state.screen);
  state.answers[e.target.dataset.key] = e.target.value;
  save();
  render();
  if (e.target.value === HEARD_OTHER) app.querySelector(`[data-key="${screen.other.key}"]`)?.focus();
  else app.querySelector("select")?.focus();
});

app.addEventListener("submit", e => {
  e.preventDefault();
  if (e.target.dataset.action === "email-results") return emailResults(e.target);
  const a = state.answers;
  a.email = a.email.trim();
  if (a.email && !EMAIL_RE.test(a.email)) return showContactError("That email address doesn't look right. Check it, or leave it blank.");
  if (a.newsletter && !a.email) return showContactError("Add your email to sign up for news and updates.");
  honeypot = e.target.elements.website?.value ?? "";
  state.lead = { id: newLeadId(), status: "pending", emailed: false };   // each completed questionnaire is its own lead
  save();
  go(RESULTS);
});

function emailResults(form) {
  const input = form.elements.email;
  const msg = form.querySelector(".form-msg");
  const email = input.value.trim();
  if (!EMAIL_RE.test(email)) {
    input.setAttribute("aria-invalid", "true");
    msg.textContent = "That email address doesn't look right.";
    input.focus();
    return;
  }
  input.setAttribute("aria-invalid", "false");
  if (!canEmailResults() || preview) {
    msg.textContent = preview ? "Emails aren't sent from test previews." : "Emailing results isn't switched on yet. Use \"Email us about this model\" or give us a call.";
    return;
  }
  state.answers.email = email;
  state.lead ??= { id: newLeadId(), status: "pending", emailed: false };
  state.lead.status = "pending";
  save();
  form.outerHTML = emailFormHTML();
  submitLead();
}

function showContactError(msg) {
  const el = document.getElementById("email-error");
  if (!el) return;
  el.textContent = msg;
  el.hidden = !msg;
  app.querySelector('[data-key="email"]')?.setAttribute("aria-invalid", msg ? "true" : "false");
  if (msg) app.querySelector('[data-key="email"]')?.focus();
}

// ---------- embedding (Squarespace iframe; see docs/squarespace-embed.html) ----------

const embedded = window.self !== window.top;
const toParent = msg => window.parent.postMessage({ source: "hov-vrq", ...msg }, "*");   // height/scroll only, nothing private

function scrollToTop() {
  if (embedded) toParent({ type: "scrollTop" });   // the iframe has no scrollbar; ask the page to bring its top into view
  else window.scrollTo(0, 0);
}

if (embedded) {
  document.documentElement.classList.add("embedded");
  let lastHeight = 0;
  const sendHeight = force => {
    const height = Math.ceil(document.documentElement.getBoundingClientRect().height);
    if (force || height !== lastHeight) toParent({ type: "height", height: (lastHeight = height) });
  };
  new ResizeObserver(() => sendHeight(false)).observe(document.documentElement);
  // Squarespace runs Code Block scripts late, so the page may not be listening yet when the first height goes out.
  // Repeat it every second; setting the same height again costs the page nothing.
  setInterval(() => sendHeight(true), 1000);
}

render();
