// Results page: one card per pick, plus the conversation fallback and the links below the cards.
import { describeAnswers } from "./questions.js";
import { SHOP } from "./shop.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = p => "$" + p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const joinAnd = xs => (xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]);
const lower = s => s.replace(/\s*\(.*?\)\s*/g, " ").trim().toLowerCase();

// Plain-words notes for a Caution flag that applies and no add-on fixes. Wording for Matt to review.
const CAUTIONS = {
  shag: "Use the lowest height setting on shag.",
  wool: "Go gently on wool and hand-sewn rugs. Ask us which setting to use.",
  looped: "Watch for snagged loops on berber. Ask us which setting to use.",
};

// How each rug answer reads in an add-on line ("for your wool and jute rugs").
const RUG_WORDS = {
  "Wool (any kind)": "wool", "Persian (Hand Sewn)": "hand-sewn", "Jute": "jute",
  "Synthetic Cut High Pile (Shag & Frieze)": "shag", "Looped High Pile": "high-pile looped",
  "Textured (looped & cut)": "textured", "Looped Low Pile": "berber", "Looped Medium Pile": "looped",
};
const FLAG_RUGS = {
  wool: ["Wool (any kind)", "Persian (Hand Sewn)", "Jute"],
  shag: ["Synthetic Cut High Pile (Shag & Frieze)", "Looped High Pile"],
  looped: ["Textured (looped & cut)", "Looped Low Pile", "Looped Medium Pile", "Looped High Pile"],
};

/** "Why it fits": the model's best ratings (4+) on what mattered most for this shopper. */
export function whyItFits(pick, res, answers) {
  if (pick.blurb) return pick.blurb;
  const w = res.weights;
  const floors = answers.floors.map(lower);
  const phrase = {
    carpet: answers.mix === "bare" ? "rugs" : "carpet",
    bare: floors.length ? `your ${joinAnd(floors.slice(0, 2))} floors` : "bare floors",
    pet: "pet hair",
    stairs: answers.stairs === "carpeted" ? "carpeted stairs" : "stairs",
  };
  const strong = ["carpet", "bare", "pet", "stairs"]
    .filter(d => w[d] > 0 && pick[d] >= 4)
    .sort((x, y) => w[y] * pick[y] - w[x] * pick[x])
    .slice(0, 2);
  const easy = w.ease > 0 && pick.ease >= 4 ? (pick.ease === 5 ? "very easy to handle" : "easy to handle") : null;

  let line;
  if (strong.length) {
    const word = strong.every(d => pick[d] === 5) ? "Excellent on" : "Strong on";
    line = `${word} ${joinAnd(strong.map(d => phrase[d]))}${easy ? `, and ${easy}` : ""}.`;
  } else if (easy) {
    line = easy[0].toUpperCase() + easy.slice(1) + ".";
  } else {
    line = "A good all-round fit for your home.";
  }
  if (answers.allergies && pick.hepa) line += " HEPA filtration helps with allergies.";
  return line;
}

/** Add-on lines: which rugs each add-on is for. */
function addonLines(pick, res, catalog, answers) {
  return pick.addons.map(addon => {
    const flags = Object.keys(res.need).filter(f => res.need[f] && catalog.addons[pick.id]?.[f] === addon);
    const rugs = [...new Set(flags.flatMap(f => FLAG_RUGS[f]).filter(r => answers.carpets.includes(r)).map(r => RUG_WORDS[r]))];
    const forWhat = rugs.length ? ` for your ${joinAnd(rugs)} rugs` : "";
    const name = addon.url
      ? `<a href="${esc(addon.url)}" target="_top">${esc(addon.name)}</a>`
      : esc(addon.name);
    const ask = addon.url ? "" : ` <a href="${esc(mailto(`Question about the ${addon.name}`, answers, null))}" target="_top">Ask us</a> about it.`;
    return `<p class="addon"><span aria-hidden="true">+</span> Add the ${name}${forWhat}.${ask}</p>`;
  });
}

/** mailto: link to HOV with the shopper's answers (and picks) in the body. */
export function mailto(subject, answers, picks, intro = "") {
  const name = [answers.first_name, answers.last_name].map(s => s.trim()).filter(Boolean).join(" ");
  const lines = [
    "Hi House of Vacuums,", "",
    intro || "My question:", "", "",
    "My questionnaire answers:", ...describeAnswers(answers).map(l => "- " + l),
  ];
  if (picks?.length) {
    lines.push("", "My recommendations:", ...picks.map(p => `- ${p.slot}: ${p.fullName} (${money(p.price)})`));
  }
  if (name) lines.push("", name);
  return `mailto:${SHOP.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\r\n"))}`;
}

function card(pick, res, catalog, answers, allPicks) {
  const badges = [
    pick.best_match && `<span class="badge badge-best"><span aria-hidden="true">★</span> Best match for your home</span>`,
    pick.pick && `<span class="badge">Owner's Pick</span>`,
  ].filter(Boolean).join("");
  const priciest = Math.max(...allPicks.filter(p => p.slot !== "Corded alternative").map(p => p.price));
  const notes = [];
  if (pick.best_match && pick.price < priciest) notes.push("Our best fit for your home, even though it isn't the most expensive pick.");
  if (pick.slot === "Corded alternative") notes.push("If you're open to a cord, this one is easy to handle and fits your home well.");
  const subject = `Question about the ${pick.fullName}`;
  return `
    <article class="card${pick.best_match ? " card-best" : ""}">
      <div class="card-head"><span class="slot">${esc(pick.slot)}</span>${badges}</div>
      ${pick.image ? `<div class="card-photo"><img src="${esc(pick.image)}" alt="${esc(pick.fullName)}" loading="lazy" width="750" height="750"></div>` : ""}
      <div class="card-body">
        <h2 class="model">${esc(pick.fullName)}</h2>
        <p class="price">${money(pick.price)}</p>
        ${notes.map(n => `<p class="note">${esc(n)}</p>`).join("")}
        <p class="why"><strong>Why it fits:</strong> ${esc(whyItFits(pick, res, answers))}</p>
        ${pick.cautions.map(f => `<p class="caution"><strong>Note:</strong> ${esc(CAUTIONS[f])}</p>`).join("")}
        ${addonLines(pick, res, catalog, answers).join("")}
        <div class="card-actions">
          <a class="button" href="${esc(pick.url)}" target="_top">buy</a>
          <a class="link" href="${esc(mailto(subject, answers, allPicks))}" target="_top">Email us about this model</a>
        </div>
      </div>
    </article>`;
}

/** HTML for the whole results page. */
export function resultsHTML(res, catalog, answers, { emailForm, preview = false }) {
  const picks = res.picks;
  const main = picks.filter(p => p.slot !== "Corded alternative");
  const three = main.length >= 3;
  const talk = mailto("Help choosing a vacuum", answers, picks, "Can you help me choose?");

  const intro = res.fallback
    ? `<div class="fallback">
         <h2>This one's worth a conversation</h2>
         <p>Your answers don't line up neatly with one of the vacuums we carry online, so we'd rather talk it through than guess.
           Tell us a bit more and we'll point you to the right one.</p>
         <div class="fallback-actions">
           <a class="button" href="${esc(talk)}" target="_top">email us</a>
           <a class="button button-secondary" href="tel:${SHOP.tel}" target="_top">call ${esc(SHOP.phone)}</a>
         </div>
         ${picks.length ? `<p class="help">${main.length ? "In the meantime, here's the closest fit:" : "In the meantime, here's an option if you're open to a cord:"}</p>` : ""}
       </div>`
    : `<p class="help">${three ? "Picked for your home from the vacuums we carry: one at each price level." : "Picked for your home from the vacuums we carry."}</p>`;

  return `
    <h1 class="question" tabindex="-1">Your recommendations</h1>
    ${intro}
    <div class="cards">${picks.map(p => card(p, res, catalog, answers, picks)).join("")}</div>
    ${emailForm}
    <div class="talk">
      <p><strong>Prefer to talk it through?</strong> Call <a href="tel:${SHOP.tel}" target="_top">${esc(SHOP.phone)}</a>
        or visit the shop at <a href="${esc(SHOP.mapUrl)}" target="_blank" rel="noopener">${esc(SHOP.address)}</a>.
        ${esc(SHOP.hours)}.</p>
    </div>
    <p class="restart">${preview ? "" : `<button type="button" class="link" data-action="back">Change my answers</button>
      <span aria-hidden="true">·</span> `}<button type="button" class="link" data-action="restart">Start over</button></p>`;
}
