// The questionnaire screens, in order (spec: "Questions"). Each option's value is what the engine uses.
//   single: tapping an answer saves it and advances    multi: pills + Next
//   slider, text, select, contact: their own controls + Next
// show(answers) hides a screen when it doesn't apply.

export const HEARD_OTHER = "Other";

export const SCREENS = [
  {
    id: "styles", type: "multi", key: "styles", required: true, summary: "Styles",
    question: "Which styles would you consider?", help: "Select all that apply.",
    options: [
      { value: "upright", label: "Upright" },
      { value: "canister", label: "Canister" },
      { value: "cordless", label: "Cordless" },
      { value: "any", label: "No preference", exclusive: true },
    ],
  },
  {
    id: "cordless_role", type: "single", key: "cordless_role", summary: "Cordless for",
    show: a => a.styles.includes("cordless"),
    question: "What would the cordless be for?",
    options: [
      { value: "main", label: "My main vacuum for the whole house" },
      { value: "quick", label: "Quick pickups between deeper cleans" },
    ],
  },
  {
    id: "mix", type: "single", key: "mix", summary: "Carpet vs. bare floor",
    question: "How much of your home is carpet vs. bare floor?",
    options: [
      { value: "carpet", label: "Mostly carpet" },
      { value: "half", label: "About half" },
      { value: "bare", label: "Mostly bare floor" },
      { value: "none", label: "No carpet or rugs at all" },
    ],
  },
  {
    id: "floors", type: "multi", key: "floors", required: false, summary: "Bare floors",
    question: "What kind of bare floor do you have?", help: "Select all that apply.",
    options: ["Linoleum", "Vinyl Plank", "Tile", "Brick", "Finished Concrete", "Unfinished Concrete",
      "Hardwood", "Laminate Hardwood", "Bamboo"].map(v => ({ value: v, label: v })),
  },
  {
    id: "carpets", type: "multi", key: "carpets", required: true, summary: "Carpet and rugs",
    show: a => a.mix !== "none",
    question: "What kind of carpet or rugs do you have?", help: "Select all that apply.",
    options: [
      { value: "Commercial", label: "Commercial" },
      { value: "Synthetic Cut Low Pile", label: "Synthetic Cut Low Pile" },
      { value: "Synthetic Cut Medium Pile (Frieze)", label: "Synthetic Cut Medium Pile (Frieze)" },
      { value: "Synthetic Cut High Pile (Shag & Frieze)", label: "Synthetic Cut High Pile (Shag & Frieze)" },
      { value: "Wool (any kind)", label: "Wool (any kind)" },
      { value: "Jute", label: "Jute" },
      { value: "Textured (looped & cut)", label: "Textured (looped & cut)" },
      { value: "Looped Low Pile", label: "Looped Low Pile (berber, pattern, flat weave)" },
      { value: "Looped Medium Pile", label: "Looped Medium Pile" },
      { value: "Looped High Pile", label: "Looped High Pile" },
      { value: "Persian (Hand Sewn)", label: "Persian (Hand Sewn)" },
      { value: "Not Sure", label: "Not Sure" },
    ],
  },
  {
    id: "pets", type: "single", key: "pets", summary: "Pets",
    question: "Do you have pets and how much do they shed?",
    options: [
      { value: "none", label: "No pets" },
      { value: "low", label: "Non-shed, low-shed pets" },
      { value: "moderate", label: "Moderate shedding pets" },
      { value: "heavy", label: "Heavily shedding pets, possibly with long coats" },
    ],
  },
  {
    id: "freq", type: "single", key: "freq", summary: "I vacuum",
    question: "I vacuum…",
    options: [
      { value: "daily", label: "All the time, at least daily" },
      { value: "several", label: "Several times a week" },
      { value: "weekly", label: "Once a week" },
      { value: "less", label: "Less than once a week" },
    ],
  },
  {
    id: "stairs", type: "single", key: "stairs", summary: "Stairs",
    question: "Do you have stairs?",
    options: [
      { value: "no", label: "No" },
      { value: "carpeted", label: "Yes, carpeted" },
      { value: "bare", label: "Yes, bare" },
    ],
  },
  {
    id: "allergies", type: "single", key: "allergies", summary: "Allergies or asthma",
    question: "Does anyone in your household have allergies or asthma?", help: "Can be seasonal or not.",
    options: [{ value: true, label: "Yes" }, { value: false, label: "No" }],
  },
  {
    id: "slider", type: "slider", key: "slider", min: 1, max: 5, summary: "Lighter (1) to deepest clean (5)",
    question: "What matters more to you?",
    ends: ["Lighter and easier", "Deepest clean"],
  },
  {
    // "Yes" opens an optional notes box with a Next button; "No" advances straight away.
    id: "limit", type: "single", key: "limit", summary: "Trouble lifting or pushing",
    question: "Does anyone who'll use it have trouble lifting or pushing a full-size vacuum?",
    options: [{ value: true, label: "Yes" }, { value: false, label: "No" }],
    notes: { key: "limit_notes", when: true, label: "Anything we should know? (optional)", placeholder: "For example: arthritis in my hands, or a bad back" },
  },
  {
    id: "current", type: "text", key: "current_vacuum", summary: "Current vacuum",
    question: "What vacuum do you have now? What do you like or dislike about it?",
    help: "Optional. This gives us context for your recommendation.",
    placeholder: "For example: an old Kenmore canister. Great suction, but the hose is heavy.",
  },
  {
    id: "heard", type: "select", key: "heard", required: true, summary: "Heard about us",
    question: "How did you hear about us?",
    options: ["Family/Friends", "YouTube", "Google (Search)", "Reddit", "AI (Claude, Gemini, ChatGPT, etc.)",
      "Social media (Instagram, Facebook, TikTok)", "Physical Ad", HEARD_OTHER],
    other: { key: "heard_other", label: "Tell us where", placeholder: "Where did you hear about us?" },
  },
  {
    id: "contact", type: "contact",
    question: "Email my results to me",
    help: "Optional. We'll send your recommendations with links to each model.",
    submit: "See my recommendations",
  },
];

export const BLANK_ANSWERS = {
  styles: [], cordless_role: null, mix: null, floors: [], carpets: [], pets: null, freq: null,
  stairs: null, allergies: null, slider: 3, limit: null, limit_notes: "", current_vacuum: "",
  heard: null, heard_other: "", first_name: "", last_name: "", email: "", newsletter: false,
};

/** The screens this shopper will see, given their answers so far. */
export const visibleScreens = answers => SCREENS.filter(s => !s.show || s.show(answers));

/** The shopper's answers as "Label: answer" lines, for emails. Skips screens they didn't see and blank answers. */
export function describeAnswers(a) {
  const lines = [];
  for (const s of visibleScreens(a)) {
    if (!s.summary) continue;
    const label = v => s.options?.find(o => (o.value ?? o) === v)?.label ?? v;
    let text;
    if (s.type === "multi") text = a[s.key].map(label).join(", ") || "None";
    else if (s.type === "slider") text = String(a[s.key]);
    else if (s.type === "select") text = a[s.key] === HEARD_OTHER && a[s.other.key].trim() ? `Other: ${a[s.other.key].trim()}` : a[s.key];
    else if (s.type === "text") text = a[s.key].trim();
    else text = a[s.key] === null ? "" : label(a[s.key]);
    if (s.notes && a[s.key] === s.notes.when && a[s.notes.key].trim()) text += ` (${a[s.notes.key].trim()})`;
    if (text) lines.push(`${s.summary}: ${text}`);
  }
  return lines;
}

/** Shopper answers -> the engine's input (see engine.js). */
export function toEngineAnswers(a) {
  return {
    styles: a.styles, cordless_role: a.styles.includes("cordless") ? a.cordless_role : undefined,
    mix: a.mix, floors: a.floors, carpets: a.mix === "none" ? [] : a.carpets,
    pets: a.pets, freq: a.freq, stairs: a.stairs, allergies: a.allergies === true,
    slider: a.slider, limit: a.limit === true,
  };
}
