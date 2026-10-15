# Lead capture: Google Apps Script setup

`Code.gs` saves every completed questionnaire to a **Leads** sheet, and when the shopper leaves an email address it:

- emails them their results (styled like the site, with Buy links), once per submission
- emails hov@thehouseofvacs.com about the lead, once per submission (reply goes straight to the shopper)

The emails come from the Google account that deploys the script. Use **hov@thehouseofvacs.com** if it's a Google account, so replies and sent mail live there. Daily sending limit: 100 emails on a free Gmail account, 1,500 on Google Workspace. The script also caps shopper emails at 200 a day, and 3 an hour per email address.

## One-time setup (about 10 minutes)

1. **Create a new, private spreadsheet** at https://sheets.new and name it **HOV Questionnaire Leads**.
   Keep it separate from the catalog sheet, which is link-shared. Don't share this one.
2. In that spreadsheet: **Extensions → Apps Script**.
3. Delete the starter code in `Code.gs`, paste in the whole of `apps-script/Code.gs` from this repo, and click **Save** (disk icon).
4. In the function dropdown at the top, choose **setup** and click **Run**.
   Google asks for permission: **Review permissions** → choose the account → **Advanced** → **Go to (project name)** → **Allow**.
   It needs to edit this spreadsheet, read the catalog sheet, and send email as you. A **Leads** tab appears in the spreadsheet.
5. **Deploy → New deployment** → gear icon → **Web app**.
   - Description: `Questionnaire leads`
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**, then copy the **Web app URL** (it ends in `/exec`).
6. Send that URL to Claude, or paste it into `LEADS_URL` in `public/js/lead.js`, commit and push.

## Changing the script later

Paste the new `Code.gs`, save, then **Deploy → Manage deployments** → pencil icon → Version: **New version** → **Deploy**.
The URL stays the same, so the site doesn't need to change.

## Leads tab columns

Timestamp, Lead ID, name, email, Newsletter (Yes = add to the mailing list), every questionnaire answer, Picks (with fit scores), Fallback, Catalog source, Results emailed, HOV notified.
For screens 8 and 10 (allergies, trouble lifting) only the Yes/No answer and the optional notes are stored.

## Testing

`node tests/apps-script.test.mjs` runs the script against stand-ins for Google's services: rows, emails, safeguards and rate limits. CI runs it on every push.
