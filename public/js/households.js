// The seven test households Matt approved on Oct 14, 2026, with their expected results.
// Change an expected result only after Matt approves the shift (see the spec, "Test households").

const KOMBI = "Kombi Floor Nozzle Premium (7260GS)";
const SOFT = "Soft bristle brush roller (5010GE)";

export const HOUSEHOLDS = [
  {
    name: "A. Carpet family, heavy-shedding dog",
    summary: "No preference · mostly carpet · vinyl plank · cut medium pile · heavy shedder · several times a week · carpeted stairs · allergies · slider 3 · no limit",
    answers: { styles: ["any"], mix: "carpet", floors: ["Vinyl Plank"], carpets: ["Synthetic Cut Medium Pile (Frieze)"], pets: "heavy", freq: "several", stairs: "carpeted", allergies: true, slider: 3, limit: false },
    expected: { fallback: false, picks: [
      { slot: "Good", id: "riccar-r27p", score: 4.22 },
      { slot: "Better", id: "sebo-g4", score: 3.99 },
      { slot: "Best", id: "sebo-d4", score: 4.64, best: true },
    ] },
  },
  {
    name: "B. Hardwood home with wool rugs, no pets",
    summary: "Upright or canister · mostly bare · hardwood · wool · no pets · weekly · no stairs · no allergies · slider 3 · no limit",
    answers: { styles: ["upright", "canister"], mix: "bare", floors: ["Hardwood"], carpets: ["Wool (any kind)"], pets: "none", freq: "weekly", stairs: "no", allergies: false, slider: 3, limit: false },
    expected: { fallback: false, picks: [
      { slot: "Good", id: "sebo-e2", score: 4.26, addons: [KOMBI] },
      { slot: "Better", id: "sebo-k3", score: 4.43, addons: [KOMBI] },
      { slot: "Best", id: "sebo-e3", score: 4.77, addons: [KOMBI], best: true },
    ] },
  },
  {
    name: "C. Arthritis, half and half, cat",
    summary: "No preference · about half · laminate · cut low pile · moderate shedder · weekly · no stairs · no allergies · slider 2 · limit: Yes",
    answers: { styles: ["any"], mix: "half", floors: ["Laminate Hardwood"], carpets: ["Synthetic Cut Low Pile"], pets: "moderate", freq: "weekly", stairs: "no", allergies: false, slider: 2, limit: true },
    expected: { fallback: false, picks: [
      { slot: "Good", id: "sebo-e2", score: 3.64 },
      { slot: "Better", id: "sebo-k3", score: 3.88 },
      { slot: "Best", id: "sebo-e3", score: 4.55, best: true },
    ] },
  },
  {
    name: "D. Cordless main vacuum, mostly carpet",
    summary: "Cordless → main · mostly carpet · tile · cut low pile · moderate shedder · several times a week · carpeted stairs · no allergies · slider 3 · no limit",
    answers: { styles: ["cordless"], cordless_role: "main", mix: "carpet", floors: ["Tile"], carpets: ["Synthetic Cut Low Pile"], pets: "moderate", freq: "several", stairs: "carpeted", allergies: false, slider: 3, limit: false },
    expected: { fallback: false, picks: [
      { slot: "Top pick", id: "riccar-r27cv", score: 3.37 },
      { slot: "Also great", id: "riccar-r10cv", score: 3.10 },
      { slot: "Corded alternative", id: "sebo-e3", score: 4.62 },
    ] },
  },
  {
    name: "E. Shag + heavy shedder, uprights only, deepest clean",
    summary: "Upright only · mostly carpet · cut high pile (shag) · heavy shedder · weekly · no stairs · no allergies · slider 5 · no limit",
    answers: { styles: ["upright"], mix: "carpet", floors: [], carpets: ["Synthetic Cut High Pile (Shag & Frieze)"], pets: "heavy", freq: "weekly", stairs: "no", allergies: false, slider: 5, limit: false },
    expected: { fallback: false, picks: [
      { slot: "Good", id: "riccar-r27p", score: 4.29 },
      { slot: "Better", id: "sebo-g4", score: 4.14 },
      { slot: "Best", id: "sebo-x7", score: 4.71, addons: [SOFT], best: true },
    ] },
  },
  {
    name: "F. No carpet (tile + LVP), cat, quick-pickup cordless",
    summary: "Cordless → quick pickups · no carpet · tile, vinyl plank · moderate shedder · daily · no stairs · allergies · slider 2 · no limit",
    answers: { styles: ["cordless"], cordless_role: "quick", mix: "none", floors: ["Tile", "Vinyl Plank"], carpets: [], pets: "moderate", freq: "daily", stairs: "no", allergies: true, slider: 2, limit: false },
    expected: { fallback: false, picks: [
      { slot: "Top pick", id: "riccar-r65", score: 4.23 },
      { slot: "Also great", id: "sebo-a1", score: 4.23 },
    ] },
  },
  {
    name: "G. Berber + stairs, allergies, no preference, lighter",
    summary: "No preference · about half · hardwood · looped low pile · low-shed · weekly · carpeted stairs · allergies · slider 2 · no limit",
    answers: { styles: ["any"], mix: "half", floors: ["Hardwood"], carpets: ["Looped Low Pile"], pets: "low", freq: "weekly", stairs: "carpeted", allergies: true, slider: 2, limit: false },
    expected: { fallback: false, picks: [
      { slot: "Good", id: "sebo-e2", score: 3.94 },
      { slot: "Better", id: "sebo-k3", score: 4.37 },
      { slot: "Best", id: "sebo-e3", score: 4.69, best: true },
    ] },
  },
];

/** Compare a result to a household's expected output. Returns a list of problems (empty = pass). */
export function check(result, expected) {
  const problems = [];
  if (result.fallback !== expected.fallback) problems.push(`fallback is ${result.fallback}, expected ${expected.fallback}`);
  const n = Math.max(result.picks.length, expected.picks.length);
  for (let i = 0; i < n; i++) {
    const got = result.picks[i], want = expected.picks[i];
    if (!got) { problems.push(`missing pick ${i + 1}: ${want.slot} ${want.id}`); continue; }
    if (!want) { problems.push(`unexpected pick ${i + 1}: ${got.slot} ${got.id}`); continue; }
    const diffs = [];
    if (got.slot !== want.slot) diffs.push(`slot ${got.slot} ≠ ${want.slot}`);
    if (got.id !== want.id) diffs.push(`model ${got.id} ≠ ${want.id}`);
    if (got.score.toFixed(2) !== want.score.toFixed(2)) diffs.push(`fit ${got.score.toFixed(2)} ≠ ${want.score.toFixed(2)}`);
    if (!!got.best_match !== !!want.best) diffs.push(`best-match badge ${!!got.best_match} ≠ ${!!want.best}`);
    const ga = got.addons.map(x => x.name).join(", "), wa = (want.addons ?? []).join(", ");
    if (ga !== wa) diffs.push(`add-ons "${ga}" ≠ "${wa}"`);
    const gc = got.cautions.join(", "), wc = (want.cautions ?? []).join(", ");
    if (gc !== wc) diffs.push(`cautions "${gc}" ≠ "${wc}"`);
    if (diffs.length) problems.push(`pick ${i + 1}: ` + diffs.join("; "));
  }
  return problems;
}
