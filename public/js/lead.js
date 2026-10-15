// Lead capture and results emails: posts each completed questionnaire to the Google Apps Script web app
// (apps-script/Code.gs), which saves it to the Leads sheet and sends the emails.
import { leadFields } from "./questions.js";

// The Apps Script web app URL (Deploy → Manage deployments → Web app URL). Empty = nothing is sent.
export const LEADS_URL = "";

export const canEmailResults = () => !!LEADS_URL;

export const newLeadId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/** Everything the Leads sheet stores for one completed questionnaire. */
export function leadPayload({ leadId, answers, res, source, honeypot = "" }) {
  return {
    leadId, source, website: honeypot,
    contact: {
      first: answers.first_name.trim(), last: answers.last_name.trim(),
      email: answers.email.trim(), newsletter: answers.newsletter === true,
    },
    answers: leadFields(answers),
    picks: res.picks.map(p => ({
      slot: p.slot, id: p.id, score: p.score, bestMatch: p.best_match === true,
      addons: p.addons.map(a => a.name), cautions: p.cautions,
    })),
    fallback: res.fallback,
  };
}

/** POST to the web app. Plain-text body keeps it a "simple" cross-site request (no preflight). */
export async function sendLead(payload) {
  if (!LEADS_URL) return { ok: false, skipped: true };
  const r = await fetch(LEADS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
