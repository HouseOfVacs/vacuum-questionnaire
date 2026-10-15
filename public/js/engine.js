// Recommendation engine: a line-for-line port of recommend() in reference/engine_prototype.py.
// Thresholds (price bands, minimum fit, tie window, penalties) come from the Settings tab.

const WOOL = new Set(["Wool (any kind)", "Persian (Hand Sewn)", "Jute"]);
const SHAG = new Set(["Synthetic Cut High Pile (Shag & Frieze)", "Looped High Pile"]);
const LOOPED = new Set(["Textured (looped & cut)", "Looped Low Pile", "Looped Medium Pile", "Looped High Pile"]);
const DELICATE = new Set(["Hardwood", "Bamboo", "Laminate Hardwood"]);
const CORDED_ALT_MIN_EASE = 4;

const MIX_CARPET = { carpet: 3, half: 2, bare: 1, none: 0 };
const MIX_BARE = { carpet: 1, half: 2, bare: 3, none: 3 };
const PETS = { none: 0, low: 0.5, moderate: 1.5, heavy: 3 };
const STAIRS = { no: 0, carpeted: 1.5, bare: 1 };
const FREQ = { daily: 1, several: 0.5, weekly: 0, less: 0 };

const overlaps = (items, set) => items.some(x => set.has(x));

/** Python's round(x, 2): round half to even on the exact binary value. */
export function round2(x) {
  const y = x * 100;
  const f = Math.floor(y);
  const exactHalf = y - f === 0.5 && Number.isInteger(x * 8);   // only k/8 values sit exactly on .xx5
  if (exactHalf) return (f % 2 === 0 ? f : f + 1) / 100;
  return Number(x.toFixed(2));
}

/** Highest fit; scores within the tie window of the leader tie -> higher boost, then lower price. */
function bestOf(cands, tieWindow) {
  if (!cands.length) return null;
  const lead = Math.max(...cands.map(c => c.score));
  let best = null;
  for (const c of cands) {
    if (lead - c.score > tieWindow + 1e-9) continue;
    if (!best || c.boost > best.boost || (c.boost === best.boost && c.price < best.price)) best = c;
  }
  return best;
}

/**
 * answers: { styles: ["upright"|"canister"|"cordless"|"any"], cordless_role: "main"|"quick",
 *            mix: "carpet"|"half"|"bare"|"none", floors: [...], carpets: [...],
 *            pets: "none"|"low"|"moderate"|"heavy", freq: "daily"|"several"|"weekly"|"less",
 *            stairs: "no"|"carpeted"|"bare", allergies: bool, slider: 1..5, limit: bool }
 * returns { picks, fallback, pool }
 */
export function recommend(catalog, a) {
  const { models, addons: ADDONS, settings: S } = catalog;
  const rugs = a.mix === "none" ? [] : a.carpets;
  const need = { wool: overlaps(rugs, WOOL), shag: overlaps(rugs, SHAG), looped: overlaps(rugs, LOOPED) };
  const styles = new Set(a.styles);

  function styleOk(m) {
    if (styles.has("any")) return m.role !== "Quick pickups";        // sticks only when asked for
    if (m.style === "Upright" && styles.has("upright")) return true;
    if (m.style === "Canister" && styles.has("canister")) return true;
    if (m.style.startsWith("Cordless") && styles.has("cordless")) {
      const want = a.cordless_role === "main" ? "Main vacuum" : "Quick pickups";
      return m.role === want;
    }
    return false;
  }

  // weights
  let cw = MIX_CARPET[a.mix];
  let bw = MIX_BARE[a.mix] + (overlaps(a.floors, DELICATE) ? 0.5 : 0);
  let pw = PETS[a.pets];
  const sw = STAIRS[a.stairs];
  const s = a.slider;                                                // 1 = lighter ... 5 = deepest clean
  const ew = (5 - s) * 0.75 + FREQ[a.freq];
  const mult = 0.8 + 0.1 * s;
  cw = cw * mult; bw = bw * mult; pw = pw * mult;

  function evaluate(m) {
    const addons = [], notes = [];
    let pen = 0.0;
    for (const [f, needed] of Object.entries(need)) {
      if (!needed) continue;
      const flag = m.flags[f];
      const fix = ADDONS[m.id]?.[f];
      if (flag !== "OK" && fix) {
        if (!addons.includes(fix)) addons.push(fix);
        continue;
      }
      if (flag === "Avoid") return null;
      if (flag === "Caution") { pen += S.cautionPenalty; notes.push(f); }
    }
    if (a.limit && m.ease < S.limitMinEase) return null;
    const tw = cw + bw + pw + sw + ew;
    let score = (cw * m.carpet + bw * m.bare + pw * m.pet + sw * m.stairs + ew * m.ease) / tw;
    score += (a.allergies && m.hepa ? S.hepaBonus : 0) - pen;
    return { ...m, score: round2(score), addons, cautions: notes };
  }

  const pool = [];
  for (const m of models) {
    if (!styleOk(m)) continue;
    const r = evaluate(m);
    if (r && r.score >= S.minFit) pool.push(r);
  }

  const band = p => (p < S.goodMax ? "Good" : p < S.betterMax ? "Better" : "Best");
  const chosen = [];
  for (const b of ["Good", "Better", "Best"]) {
    const w = bestOf(pool.filter(r => band(r.price) === b), S.tieWindow);
    if (w) chosen.push(w);
  }
  pool.sort((x, y) => (y.score - x.score) || (y.boost - x.boost) || (x.price - y.price));
  for (const r of pool) {                                            // fill empty bands with next-best fits
    if (chosen.length >= 3) break;
    if (!chosen.includes(r)) chosen.push(r);
  }
  chosen.sort((x, y) => x.price - y.price);

  let out;
  if (chosen.length >= 3) {
    out = chosen.slice(0, 3).map((c, i) => ({ ...c, slot: ["Good", "Better", "Best"][i] }));
    bestOf(out, S.tieWindow).best_match = true;                      // "Best match for your home"
  } else if (chosen.length) {
    const first = bestOf(chosen, S.tieWindow);
    const ranked = [first, ...chosen.filter(c => c !== first)];
    out = ranked.map((c, i) => ({ ...c, slot: ["Top pick", "Also great"][i] }));
  } else {
    out = [];                                                        // the prototype raises here; nothing fits
  }

  if (styles.size === 1 && styles.has("cordless") && a.cordless_role === "main" && out.length < 3) {
    const alt = recommend(catalog, { ...a, styles: ["upright", "canister"] });   // easy-handling corded alternative
    const cands = alt.pool.filter(x => x.ease >= CORDED_ALT_MIN_EASE);
    if (cands.length) out.push({ ...bestOf(cands, S.tieWindow), slot: "Corded alternative", best_match: false });
  }
  const fallback = out.filter(o => o.slot !== "Corded alternative").length < 2;
  return { picks: out, fallback, pool };
}
