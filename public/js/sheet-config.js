// Where the published Google Sheet lives. From File → Share → Publish to web in the sheet.
// publishId is the "2PACX-…" part of the published link; gids are the tab IDs (stable even if tabs are renamed or moved).
// Leave publishId empty to use only the repo copy in public/data/.
export const SHEET = {
  publishId: "",
  gids: { models: "", addons: "", settings: "" },
};
