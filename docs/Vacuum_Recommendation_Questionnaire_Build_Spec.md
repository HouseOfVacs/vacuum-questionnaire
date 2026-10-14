# Vacuum Recommendation Questionnaire: Build Spec

Oct 14, 2026 · House of Vacuums

## Overview

The Vacuum Recommendation Questionnaire is a one-question-per-screen tool that asks a shopper about their home and returns three House of Vacuums recommendations, each with a Buy link and an "Email us about this model" link. It replaces the expert-curated email form at [thehouseofvacs.com/#recs](https://www.thehouseofvacs.com/#recs). Version one recommends only the 4 Riccar and 19 Sebo models on the online store (23 total).

**Decisions locked in during planning**

- **Name:** Vacuum Recommendation Questionnaire.
- **Placement:** a standalone page embedded in a Squarespace page so it feels native, with the real site header and footer, no second scrollbar, and Buy links opening in the same window.
- **Flow:** one question per screen with a progress bar, a Back button, and answers saved in the browser.
- **Email:** an optional "Email my results to me" step at the end, right before results, offered again after results. Name is optional too.
- **Results:** Good / Better / Best by price band. The highest-scoring pick gets a **Best match for your home** badge, regardless of price.
- **Honesty rule:** the badge makes it clear when a cheaper model is the better fit. HOV is fine with that.
- **Fallback:** conflicting or thin answers get a "this one's worth a conversation" result instead of a forced pick.
- **Catalog:** a Google Sheet Matt owns, so adding models never requires reopening the build.
- **Code:** lives in a GitHub repo from day one. The previous attempt was lost when a local folder was deleted.
- **Homepage copy:** the text promising that an expert personally curates the list gets updated at launch.

## Look, feel and embedding

The tool must look like part of thehouseofvacs.com, not a third-party widget. The current #recs form is the visual reference.

**Visual match**

- Warm off-white page background, taupe pill-shaped answer buttons, a dark plum Submit button, and the site's sans-serif typeface.
- Pull exact colors and fonts from the live site's CSS (Squarespace site styles) rather than eyeballing them. Store them as CSS variables in one file.
- The selected state of an answer pill needs a clear contrast change. The current form doesn't show one in the screenshots.
- Mobile-first: most visitors will be on phones.

**Hosting and embedding**

- Build it as a static site (HTML, CSS, JavaScript; no server), hosted free on Cloudflare Pages or GitHub Pages.
- Embed it in a new Squarespace page (suggested URL: `/vacuum-questionnaire`) with an iframe that resizes to its content height, so there is never a second scrollbar.
- All store links open in the parent window (`target="_top"`) so the shopper stays on thehouseofvacs.com.
- Link to the new page from the homepage "Get personalized recommendations" buttons and the #recs section.

**Code safety**

- Create the GitHub repo before writing any code, and push after every working session.
- Keep the catalog data in the Google Sheet (see Product catalog), with a copy committed to the repo as a fallback.

## Questions

Most shoppers see 12 screens. Two screens are conditional: the cordless follow-up appears only when Cordless is picked, and the carpet screen is skipped when the home has no carpet or rugs.

| # | Screen | Answer options | Type |
| --- | --- | --- | --- |
| 1 | Which styles would you consider? | Upright · Canister · Cordless · No preference | Multi-select |
| 1b | What would the cordless be for? *(only if Cordless picked)* | My main vacuum for the whole house · Quick pickups between deeper cleans | Single |
| 2 | How much of your home is carpet vs. bare floor? | Mostly carpet · About half · Mostly bare floor · No carpet or rugs at all | Single |
| 3 | What kind of bare floor do you have? | Linoleum · Vinyl Plank · Tile · Brick · Finished Concrete · Unfinished Concrete · Hardwood · Laminate Hardwood · Bamboo | Multi-select |
| 4 | What kind of carpet or rugs do you have? *(skipped if "No carpet or rugs")* | Commercial · Synthetic Cut Low Pile · Synthetic Cut Medium Pile (Frieze) · Synthetic Cut High Pile (Shag & Frieze) · Wool (any kind) · Jute · Textured (looped & cut) · Looped Low Pile (berber, pattern, flat weave) · Looped Medium Pile · Looped High Pile · Persian (Hand Sewn) · Not Sure | Multi-select |
| 5 | Do you have pets and how much do they shed? | No pets · Non-shed, low-shed pets · Moderate shedding pets · Heavily shedding pets, possibly with long coats | Single |
| 6 | I vacuum… | All the time, at least daily · Several times a week · Once a week · Less than once a week | Single |
| 7 | Do you have stairs? | No · Yes, carpeted · Yes, bare | Single |
| 8 | Does anyone in your household have allergies or asthma? (Can be seasonal or not.) | Yes · No | Single |
| 9 | What matters more to you? | Slider, 5 stops: Lighter and easier ↔ Deepest clean. Starts in the middle. | Slider |
| 10 | Does anyone who'll use it have trouble lifting or pushing a full-size vacuum? | Yes · No, plus an optional notes box | Single + text |
| 11 | What vacuum do you have now? What do you like or dislike about it? | Free text, optional. Context for HOV only; not used in scoring. | Text |
| 12 | How did you hear about us? *(required)* | Family/Friends · YouTube · Google (Search) · Reddit · AI (Claude, Gemini, ChatGPT, etc.) · Social media (Instagram, Facebook, TikTok) · Physical Ad · Other, with a text box | Dropdown |
| 13 | Email my results to me *(optional)* | First name, last name, email, all optional · Sign up for news and updates | Form |

**Behavior**

- Single-choice screens advance as soon as an answer is tapped. Multi-select screens and the slider have a Next button.
- Every screen has a Back button and a progress bar.
- Answers are saved in the browser, so a refresh doesn't lose them.
- "No preference" on screen 1 clears the other style choices, and picking a style clears "No preference."
- The submit button on screen 13 reads "See my recommendations" and works with or without an email.

## Product catalog

The catalog is a Google Sheet that Matt owns: one row per model, which the questionnaire reads on load. A copy is committed to the repo and used if the sheet can't be reached or fails validation. The starter sheet is `HOV_Questionnaire_Catalog_v1.xlsx`; values below match it as of Oct 14, 2026.

**Columns (Models tab)**

- **ID:** a short permanent slug, such as `sebo-d4`. Never reuse or change it.
- **Brand, Model name, Price, Store link:** shown to the shopper.
- **Image URL:** the product photo shown on the result card.
- **Style:** Upright, Canister, Cordless upright, or Cordless stick.
- **Cordless role:** Main vacuum (cordless uprights) or Quick pickups (sticks).
- **Ratings, 1 to 5:** Carpet, Bare floor, Pet hair, Stairs & above-floor, and Ease of handling.
- **Fit flags (OK, Caution or Avoid):** Wool / hand-sewn, Shag / high pile, and Looped / berber.
- **HEPA:** Yes if the model has or offers HEPA filtration. This drives a small allergy bonus.
- **Owner's Pick (Yes/No):** shows a badge on the result card.
- **House favorite boost (0, 1 or 2):** breaks ties only.
- **Active (Yes/No):** lets Matt pull a model without deleting its row.
- **Blurb (optional):** overrides the auto-written "Why it fits" line.

| Model | Price | Style | Carpet | Bare | Pet | Stairs | Ease | Wool | Shag | Looped | HEPA | Pick | Boost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [Riccar R65 Cordless Stick Vacuum](https://www.thehouseofvacs.com/store/p/riccar-r65-cordless-stick-vacuum) | $449.00 | Cordless stick · quick | 2 | 4 | 2 | 4 | 5 | Caution | Avoid | OK | Yes | Yes | 2 |
| [Riccar R10CV Cordless Supralite Upright](https://www.thehouseofvacs.com/store/p/riccar-r10cv-cordless-supralite-upright-vacuum) | $849.00 | Cordless upright · main | 3 | 3 | 3 | 1 | 5 | Avoid | Caution | OK | Yes | Yes | 1 |
| [Riccar R27CV Cordless Clean Air Upright](https://www.thehouseofvacs.com/store/p/riccar-r27cv-cordless-upright) | $899.99 | Cordless upright · main | 3 | 3 | 3 | 4 | 4 | Caution | Caution | OK | Yes | Yes | 1 |
| [Riccar R27P Premium Pet Clean Air Upright](https://www.thehouseofvacs.com/store/p/riccar-r27p) | $699.99 | Upright | 4 | 3 | 5 | 4 | 3 | Caution | OK | OK | Yes | Yes | 1 |
| [Sebo Airbelt K2 Kombi Canister](https://www.thehouseofvacs.com/store/p/sebo-airbelt-k2-kombi-canister) | $499.00 | Canister | 1 | 4 | 2 | 3 | 4 | OK | OK | OK | Yes |  | 0 |
| [Sebo Airbelt K2 Turbo](https://www.thehouseofvacs.com/store/p/sebo-airbelt-k2-turbo) | $599.00 | Canister | 2 | 5 | 3 | 4 | 4 | Avoid | Avoid | OK | Yes |  | 0 |
| [Sebo Airbelt E1 Kombi Canister](https://www.thehouseofvacs.com/store/p/sebo-airbelt-e1-kombi-canister) | $649.00 | Canister | 1 | 4 | 2 | 5 | 4 | OK | OK | OK | No |  | 0 |
| [Sebo Airbelt E2 Turbo Canister](https://www.thehouseofvacs.com/store/p/sebo-airbelt-e2-turbo-canister) | $749.00 | Canister | 2 | 5 | 3 | 5 | 4 | Caution | Avoid | OK | No |  | 1 |
| [Sebo Airbelt D1 Turbo Canister](https://www.thehouseofvacs.com/store/p/sebo-airbelt-d1-turbo) | $899.00 | Canister | 3 | 5 | 3 | 5 | 3 | Avoid | Avoid | OK | No |  | 0 |
| [Sebo Airbelt K3 Premium Canister](https://www.thehouseofvacs.com/store/p/sebo-airbelt-k3-premium-canister) | $949.00 | Canister | 3 | 5 | 3 | 5 | 4 | Caution | OK | OK | Yes |  | 0 |
| [Sebo Airbelt E3 Premium Canister](https://www.thehouseofvacs.com/store/p/sebo-airbelt-e3-premium) | $1,149.00 | Canister | 5 | 5 | 4 | 5 | 4 | Caution | OK | OK | No | Yes | 1 |
| [Sebo Airbelt D4 Premium Canister](https://www.thehouseofvacs.com/store/p/sebo-airbelt-d4-premium) | $1,449.00 | Canister | 5 | 5 | 5 | 5 | 3 | Caution | OK | OK | No | Yes | 2 |
| [Sebo Balance A1 Cordless Stick Vacuum](https://www.thehouseofvacs.com/store/p/sebo-balance-a1-cordless) | $549.00 | Cordless stick · quick | 2 | 4 | 3 | 5 | 5 | Caution | Avoid | OK | No | Yes | 1 |
| [Sebo Dart Upright](https://www.thehouseofvacs.com/store/p/sebo-dart) | $649.00 | Upright | 3 | 4 | 3 | 3 | 4 | OK | Caution | OK | No | Yes | 0 |
| [Sebo 300 Mechanical Upright](https://www.thehouseofvacs.com/store/p/sebo-300-mechanical-upright) | $699.00 | Upright | 3 | 2 | 3 | 3 | 2 | Avoid | OK | OK | Yes |  | 0 |
| [Sebo Mechanical 350 Upright](https://www.thehouseofvacs.com/store/p/sebo-mechanical-350-upright) | $799.00 | Upright | 3 | 3 | 3 | 2 | 2 | Avoid | OK | OK | Yes |  | 0 |
| [Sebo Felix Premium Upright](https://www.thehouseofvacs.com/store/p/sebo-felix-premium) | $799.00 | Upright | 3 | 4 | 3 | 3 | 4 | OK | Caution | OK | No | Yes | 1 |
| [Sebo Essential G4 Upright](https://www.thehouseofvacs.com/store/p/sebo-essential-g4-upright) | $849.00 | Upright | 4 | 2 | 5 | 3 | 3 | Avoid | OK | OK | Yes |  | 0 |
| [Sebo Automatic X4](https://www.thehouseofvacs.com/store/p/sebo-automatic-x4-9sh74) | $949.00 | Upright | 4 | 3 | 4 | 3 | 3 | Avoid | Caution | OK | Yes |  | 0 |
| [Sebo Essential G5 Upright](https://www.thehouseofvacs.com/store/p/sebo-essential-g5-upright) | $949.00 | Upright | 4 | 2 | 5 | 2 | 2 | Avoid | OK | OK | Yes |  | 0 |
| [Sebo Automatic X4 Boost](https://www.thehouseofvacs.com/store/p/sebo-automatic-x4) | $1,049.00 | Upright | 5 | 3 | 5 | 3 | 3 | Avoid | Caution | OK | Yes | Yes | 0 |
| [Sebo Automatic X7 Premium Upright](https://www.thehouseofvacs.com/store/p/sebo-automatic-x7-premium-upright-arctic-white) | $1,149.00 | Upright | 5 | 3 | 5 | 3 | 3 | Avoid | Caution | OK | Yes | Yes | 2 |
| [Sebo Automatic X8 Premium Upright](https://www.thehouseofvacs.com/store/p/sebo-automatic-x8-premium-upright) | $1,199.00 | Upright | 5 | 3 | 5 | 2 | 2 | Avoid | Caution | OK | Yes |  | 0 |

Among uprights, a carpet rating of 5 requires automatic height adjustment, which is why the G4 and G5 are 4.

**Add-ons (Add-ons tab).** Each add-on turns a Caution or Avoid flag into OK for the listed models, and is shown with that model as "model + add-on."

| Add-on | Fixes | Models | Store link |
| --- | --- | --- | --- |
| Soft bristle brush roller 5010GE | Shag | X4, X4 Boost, X7, Felix, Dart | [link](https://www.thehouseofvacs.com/store/p/sebo-brush-roller-12-5010ge-soft-bristle) |
| Soft bristle brush roller 5290GE | Shag | X8 | Not on store yet: shows "Ask us" |
| Kombi Floor Nozzle Premium 7260GS | Wool / hand-sewn | D4, D1, E3, E2, K3, K2 Turbo | [link](https://www.thehouseofvacs.com/store/p/sebo-kombi-floor-nozzle-premium) |
| Kombi Floor Nozzle Premium 7260GS | Shag | K2 Turbo | Same as above |

**Removed:** the Sebo Softcase CE12 is excluded; Matt expects it to leave the market.

**Settings tab:** the Good/Better price line ($800), the Better/Best line ($1,000), the minimum fit score (3.0), the tie window (0.1), the Caution penalty (0.3), the HEPA allergy bonus (0.2) and the screen 10 minimum ease (4), so Matt can adjust them without code.

## Recommendation logic

Every recommendation is made in four steps: rule out models that don't fit, score the rest from 1 to 5, pick one per price band, then label the results. A working Python prototype of these exact rules (`engine_prototype.py`) comes with this spec and should be ported to JavaScript as-is.

**At a glance**

```
Answers (13 screens) → Rule out (style, rugs, limits) → Score (weighted 1–5 fit) → Pick by price (one per band)
                                                                                         │
                         ┌───────────────────────────────────────────────────────────────┼──────────────────────────────┐
                         ▼                                                               ▼                              ▼
              3 picks: Good, Better, Best                              2 picks: Top pick, Also great          Fewer than 2: worth a conversation
              + Best match badge                                       + corded alternative*                  email and call links
```

\*The corded alternative appears only for shoppers who chose Cordless → Main vacuum.

### Step 1: Rule out

A model is removed when any of these is true:

1. **Style:** its style wasn't picked on screen 1.
    - "No preference" allows every style except cordless sticks.
    - Sticks appear only when the shopper picks Cordless → Quick pickups.
    - Cordless → Main vacuum allows only cordless uprights.
2. **Rug fit:** it's flagged Avoid for a rug type the shopper has, and no add-on fixes it.
3. **Physical limit:** the shopper answered Yes on screen 10 and its Ease rating is below 4.
4. **Inactive:** Active is No in the sheet.
5. **Weak fit:** its fit score (Step 2) is below 3.0.

Rug answers map to fit flags as follows:

- **Wool flag:** Wool (any kind), Persian (Hand Sewn), Jute.
- **Shag flag:** Synthetic Cut High Pile, Looped High Pile.
- **Looped flag:** Textured (looped & cut), Looped Low, Medium and High Pile.
- Commercial, Synthetic Cut Low and Medium Pile, and Not Sure raise no flag.

### Step 2: Score

The fit score is a weighted average of the model's five ratings, with weights set by the shopper's answers.

| Rating | Weight | Set by |
| --- | --- | --- |
| Carpet | Mostly carpet 3 · About half 2 · Mostly bare 1 · No carpet 0 | Screen 2 |
| Bare floor | Mostly carpet 1 · About half 2 · Mostly bare 3 · No carpet 3, plus 0.5 if hardwood, bamboo or laminate was picked | Screens 2 and 3 |
| Pet hair | No pets 0 · Low-shed 0.5 · Moderate 1.5 · Heavy 3 | Screen 5 |
| Stairs | No 0 · Carpeted 1.5 · Bare 1 | Screen 7 |
| Ease of handling | (5 − slider stop) × 0.75, plus daily 1 · several times a week 0.5 · weekly or less 0 | Screens 6 and 9 |

The slider also scales the Carpet, Bare floor and Pet weights by (0.8 + 0.1 × slider stop). Stop 1 is "Lighter and easier" and stop 5 is "Deepest clean."

```
fit = Σ(weight × rating) / Σ(weight)
      + 0.2 if the shopper has allergies and the model has HEPA
      − 0.3 for each Caution flag that applies
```

- A flag fixed by an add-on counts as OK and costs nothing; the add-on is attached to the pick.
- Report scores to two decimals. Any model within 0.1 of the top score counts as tied with it. Among tied models, the higher house-favorite boost wins, then the lower price. The boost is how Matt's hard-to-quantify preferences, like the E2 over the K2 Turbo, decide close calls.

### Step 3: Pick one per price band

- **Bands:** Good is under $800, Better is $800 to $999.99, and Best is $1,000 and up. Band edges live in the Settings tab.
- Take the highest-scoring surviving model in each band, using the tie rule above.
- When a band is empty, fill the slot with the next-best surviving model from any band, then order the three picks by price.

### Step 4: Label

- **Three picks:** Good, Better, Best by price. The highest score of the three gets the **Best match for your home** badge, using the same tie rule.
- **Two picks:** labeled **Top pick** and **Also great**, ordered by score, with no badge.
- **Owner's Pick:** models marked Yes show a small Owner's Pick badge. It doesn't affect scoring.
- **Corded alternative:** only for shoppers who picked Cordless alone with Main vacuum and got fewer than three picks. Add the best-scoring corded model with Ease 4 or higher, labeled "Corded alternative."
- **Fallback:** fewer than two picks, not counting the corded alternative, shows "This one's worth a conversation," with the Email us and call links, plus the single pick if there is one.

## Results page and email

Each recommendation is a card that sells the fit, links straight to the store, and makes it easy to ask HOV a question.

**Each card shows**

- The slot label (Good, Better, Best, Top pick, Also great, or Corded alternative), plus the Best match and Owner's Pick badges where they apply.
- Product photo, model name and price.
- **Why it fits:** one or two lines built from the ratings that carried the most weight for this shopper. An example: "Strong on carpet and pet hair, with a parquet brush for your hardwood." The Blurb column overrides it.
- Any Caution note in plain words, such as "Use the lowest height setting on shag."
- Any add-on as its own line with a link, such as "Add the Kombi Floor Nozzle for your wool rugs." An add-on with no store link says "Ask us."
- **Buy** button: opens the store page in the same window.
- **Email us about this model:** opens the shopper's email app to hov@thehouseofvacs.com. The subject is "Question about the {model}" and the body is prefilled with their answers.

**Below the cards**

- "Email these results to me," for shoppers who skipped it on screen 13.
- "Prefer to talk it through? Call (434) 316-9622 or visit the shop," with hours.
- A Start over link.

**Lead capture**

- Every completed questionnaire is saved, with or without an email: answers, picks, scores, how they heard about HOV, and a timestamp.
- Suggested backend: a Google Apps Script web app (free) that appends a row to a **Leads** tab in a Google Sheet and emails hov@thehouseofvacs.com when an email address was given.
- When the shopper gave an email, the same script sends them their results, styled like the site, with Buy links.
- Newsletter opt-ins are marked in their own column so they can be added to the mailing list.
- Screens 8 and 10 touch on health. Store only the Yes/No answers and the optional notes, and add one line to the privacy policy covering the questionnaire.

## Test households

Matt approved these seven results on Oct 14, 2026. The finished tool must reproduce them exactly, and they run as automatic checks after every change. Fit scores are shown in parentheses; ★ marks the Best match for your home badge.

| Household | Answers | Expected result |
| --- | --- | --- |
| A. Carpet family | No preference · mostly carpet · vinyl plank · cut medium pile · heavy shedder · several times a week · carpeted stairs · allergies · slider 3 · no limit | Good: R27P (4.22) · Better: G4 (3.99) · Best: D4 ★ (4.64) |
| B. Hardwood + wool rugs | Upright or canister · mostly bare · hardwood · wool · no pets · weekly · no stairs · no allergies · slider 3 · no limit | Good: E2 + Kombi (4.26) · Better: K3 + Kombi (4.43) · Best: E3 + Kombi ★ (4.77) |
| C. Arthritis | No preference · about half · laminate · cut low pile · moderate shedder · weekly · no stairs · no allergies · slider 2 · **limit: Yes** | Good: E2 (3.64) · Better: K3 (3.88) · Best: E3 ★ (4.55) |
| D. Cordless main vacuum | Cordless → main · mostly carpet · tile · cut low pile · moderate shedder · several times a week · carpeted stairs · no allergies · slider 3 · no limit | Top pick: R27CV (3.37) · Also great: R10CV (3.10) · Corded alternative: E3 (4.62) |
| E. Shag + heavy shedder | Upright only · mostly carpet · cut high pile (shag) · heavy shedder · weekly · no stairs · no allergies · slider 5 · no limit | Good: R27P (4.29) · Better: G4 (4.14) · Best: X7 + soft brush roller ★ (4.71) |
| F. Cordless quick pickups | Cordless → quick pickups · no carpet · tile, vinyl plank · moderate shedder · daily · no stairs · allergies · slider 2 · no limit | Top pick: R65 (4.23) · Also great: A1 (4.23) · no corded alternative |
| G. Berber + stairs | No preference · about half · hardwood · looped low pile · low-shed · weekly · carpeted stairs · allergies · slider 2 · no limit | Good: E2 (3.94) · Better: K3 (4.37) · Best: E3 ★ (4.69) |

Four results are decided by the tie rule. In B, C and G, the E2 is within 0.1 of the leader (the K2 Turbo, and in C also the Felix), and its boost of 1 plus a lower price than the Felix wins. In F, the R65 and A1 tie at 4.23, and the R65's boost of 2 makes it the Top pick. In C, this matches Matt's judgment: the E2's handle weighs under 1 lb, against about 3 lb for the Felix.

When the catalog changes (new Titan, Electrolux or Riccar models), these results are expected to shift. Each shift gets reviewed and approved by Matt before the expected results are updated.

## How to update

Adding, removing or re-pricing models happens in the Google Sheet, with no code and no rebuild. Reopen the build only to change the questions or how scoring works.

**Add a model** (for example, a new Titan or Electrolux)

1. Add the product to the Squarespace store and copy its page link and photo link.
2. In the Models tab, add a row with a new permanent ID, such as `titan-t500`.
3. Fill in brand, name, price, store link, image link and style. For a cordless model, also fill in its cordless role.
4. Rate it 1 to 5 against the models already in the sheet, not the whole market. Among uprights, carpet 5 needs automatic height adjustment.
5. Set the three fit flags, HEPA, Owner's Pick and boost, and set Active to Yes.
6. Open the questionnaire's test page (`/test.html`) and check the seven households. Changes are expected as the lineup grows; anything that looks wrong is usually a rating to adjust.

**Other changes**

- **Price change:** edit the Price cell. Band placement updates automatically.
- **Pull a model:** set Active to No. Keep the row, in case it comes back.
- **New add-on:** add a row to the Add-ons tab with its name, link, the flag it fixes and the model IDs it fits.
- **Move the price bands:** edit the Settings tab. This will matter once cheaper Titan and Electrolux models fill the Good band.

**Reopen the build in Claude Code when**

- Adding, removing or rewording a question.
- Changing the scoring weights, penalties or the badge rules.
- Adding a new kind of style or fit flag.
- Updating the seven expected results after Matt approves a shift.

**If something breaks:** the questionnaire falls back to the last good copy of the catalog in the repo, and the test page lists which rows failed validation, such as a missing price or a rating outside 1 to 5.

## Build plan for Claude Code

Build in seven phases, logic first, so the recommendations are proven correct before any design work. Each phase ends with a check Matt can see.

**Files that come with this spec:** `engine_prototype.py` (the reference logic) and `HOV_Questionnaire_Catalog_v1.xlsx` (the starter Google Sheet, with every correction applied; import it into Google Sheets as-is).

1. **Set up.** Create the GitHub repo and connect it to Cloudflare Pages (or GitHub Pages). Commit this spec, the catalog as a CSV, and the prototype for reference.
    - Check: a blank page is live at its hosting address, and the repo shows the first commit.
2. **Recommendation engine.** Port the prototype to JavaScript, with no user interface yet. Build `/test.html`, which runs the seven test households and shows pass or fail.
    - Check: all seven pass with the exact picks and scores in the Test households table.
3. **Catalog from the Google Sheet.** Matt imports the starter sheet (Models, Add-ons and Settings tabs) into Google Sheets and publishes it. The tool reads it, validates every row, and falls back to the repo copy on any error.
    - Check: changing a price in the sheet changes the test page within a few minutes.
4. **Question screens.** Build the 13 screens with the site's look, the progress bar, Back, auto-advance, skip logic and saved answers. Build mobile first.
    - Check: Matt completes it on his phone and says it looks like the site.
5. **Results page.** Cards, badges, add-ons, Buy buttons, the prefilled email link, the corded alternative and the conversation fallback.
    - Check: each test household shows the right cards, and every Buy link opens the right store page.
6. **Lead capture.** Apps Script endpoint, Leads sheet, the notification email to HOV, and the results email to the shopper.
    - Check: a test submission lands in the sheet, and both emails arrive.
7. **Embed and launch.** Create the Squarespace page, embed with auto-resize, point the homepage buttons and #recs at it, and update the homepage copy.
    - Check: tested on a phone, a tablet and a desktop.

**Before launch, run a reality check:** take 10 past submissions of the current #recs email form and compare the tool's picks to what Matt actually recommended. Differences are usually a rating to adjust in the sheet.

## Open items and future work

Five things need an answer before or during the build. None of them change the logic.

- [ ] Confirm who manages the Squarespace site (it lists Delaney Consulting as the builder), and that the plan allows embed and code blocks.
- [ ] Confirm hov@thehouseofvacs.com is a Google Workspace account, so the Apps Script can send the lead and results emails from it.
- [ ] Collect a product photo link for each of the 23 models (the Image URL column).
- [ ] Add the 5290GE soft brush roller for the X8 to the store, or leave it as "Ask us."
- [ ] Add one line about the questionnaire to the privacy policy.

**Future work, not in version one**

- **Titan and Electrolux:** cheaper corded and cordless models. Add them through the sheet, then revisit the $800 Good/Better line.
- **Miele:** once added, cordless and two-pick results will usually fill all three slots.
- **Corded Riccar lightweights:** revisit the corded-alternative rule, and whether quick-pickup shoppers should see one.
- **Pairing suggestions:** for example, a stick plus a corded main vacuum for homes with heavy carpet or pets.
- **Click tracking:** which picks shoppers click, to tune ratings over time.
- **Handle weight for screen 10:** add a Handle weight column, with 3 lb as the threshold for shoppers who answer Yes on screen 10. On bag-in-handle designs like the Felix and Dart, the listed 3 lb is with an empty bag, and the handle gets heavier as the bag fills.
- **Re-evaluate after each big catalog addition:** re-run the seven households plus new ones that exercise the new models, and review the results with Matt before updating the expected outputs.
