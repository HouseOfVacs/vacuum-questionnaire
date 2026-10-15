# Launch checklist: Vacuum Recommendation Questionnaire

Everything here happens in the Squarespace editor. The questionnaire itself is already live at
https://houseofvacs.github.io/vacuum-questionnaire/; these steps put it on thehouseofvacs.com.

## 0. Before you start

- [ ] **Plan check.** The embed needs a Code Block that runs JavaScript, which Squarespace allows on Core, Plus and Advanced plans (and the older Business and Commerce plans), but not on Personal or Basic. Check under **Settings → Billing**.
      Without it, the iframe can't resize, so it would need a fixed height with its own scrollbar.
- [ ] **Who edits the site.** The footer credits Delaney Consulting. If they manage it, send them this checklist.

## 1. Create the questionnaire page

1. **Pages → + → Blank Page.** Title: **Vacuum Recommendations**. In **Page Settings**, set the URL slug to `vacuum-questionnaire`.
   Decide whether it appears in the main navigation (it can live under "Not Linked" and still be reached from the buttons).
2. Edit the page. Add a section, pick the light theme whose background is the off-white `#F9F6F1` (the same as the old form), and give it small top and bottom padding.
3. Optional: add a Text Block heading above the questionnaire, such as **Find the right vacuum for your home**.
4. Add a **Code Block**: choose **HTML**, turn **Display Source** off, and paste in everything from `docs/squarespace-embed.html` in the repo.
5. Save and publish. Open `thehouseofvacs.com/vacuum-questionnaire` and click through a few screens.
   The questionnaire should grow and shrink with no second scrollbar, and each new question should scroll back to its top.

## 2. Point the homepage at it

| Where | Change |
| --- | --- |
| Hero button **Get personalized recommendations** (links to `/#recs`) | Link to `/vacuum-questionnaire` |
| "Not sure where to start?" button **Get personalized recommendations** (links to `/#recs`) | Link to `/vacuum-questionnaire` |
| #recs section button **Get your recommendations** (opens the old lightbox form) | Change its action from the lightbox to a link to `/vacuum-questionnaire` |

Keep the old lightbox form for a week or two in case you need to switch back, then delete it.

## 3. Update the homepage copy

The current wording promises that an expert personally curates each list. Suggested replacements:

| Section | Now | New |
| --- | --- | --- |
| "Not sure where to start?" intro | Fill out our quick questionnaire, and one of our vacuum experts will personally curate a list of the best options for your home. | Answer a few quick questions about your home, and we'll match you with the vacuums that fit it best, at three price levels. |
| Step 1 title | Fill out our questionnaire | Answer a few questions |
| Step 1 text | Fill out our questionnaire to give us the information we'll need to point you in the right direction. | Tell us about your floors, pets and how you like to clean. It takes about two minutes. |
| Step 2 title | Dive into your Personalized recommendations | See your recommendations right away |
| Step 2 text | An expert will create a custom good, better, best vacuum recommendation list to fit your needs. | Get a good, better and best pick for your home instantly, based on our team's hands-on ratings of every vacuum we carry. Questions? We're always happy to talk it through. |
| Step 3 | Select and order your Dream vac / Now all you need to do is wait for your new home helper to arrive at your door! | Keep as is |
| #recs heading | Get personalized vacuum recommendations from one of our experts | Find the right vacuum for your home in about two minutes |

## 4. Privacy policy

Add a paragraph to the Privacy Policy page:

> **Vacuum Recommendation Questionnaire.** When you complete our questionnaire, we store your answers, the recommendations we show you, how you heard about us and, if you choose to give them, your name and email address. Two questions touch on health (allergies or asthma, and trouble lifting or pushing a vacuum); for those we keep only your yes or no answer and any note you add. We use this information to send your results, answer your questions and improve our recommendations. We don't sell it. If you sign up for news and updates, we'll add your email to our mailing list, and you can unsubscribe at any time.

## 5. Test before announcing it

- [ ] Phone, tablet and desktop: complete the questionnaire on the live page. Check that it looks like the site, has no second scrollbar, and that Buy opens the store page in the same tab.
- [ ] One run with your email: the row lands in the Leads sheet and both emails arrive.
- [ ] Every homepage button opens `/vacuum-questionnaire`.
- [ ] Reality check (from the spec): run 10 past #recs form submissions through the questionnaire and compare its picks with what you actually recommended. Differences usually mean a rating to adjust in the catalog sheet.
- [ ] Delete the TEST rows from the Leads sheet.

## Good to know

- **Saved answers inside the embed.** Some browsers, Safari especially, restrict storage for content embedded from another site, so an answer-in-progress may not survive closing the tab there. The questionnaire still works.
  Hosting it on a subdomain such as `quiz.thehouseofvacs.com` would fix this. It's an optional follow-up that needs a DNS change.
- **Catalog changes** still happen only in the Google Sheet, and the test page at `/test.html` shows their effect.
