// The Google Sheet the questionnaire reads its catalog from ("HOV Questionnaire Catalog").
// The sheet must be shared as "Anyone with the link: Viewer". Tabs are read by name.
// Edit: https://docs.google.com/spreadsheets/d/1_0nVe3Gfco4YRJoBYZdVNejaBOTw0Gfc0NZZoHjzGN0/edit
// Leave id empty to use only the repo copy in public/data/.
export const SHEET = {
  id: "1_0nVe3Gfco4YRJoBYZdVNejaBOTw0Gfc0NZZoHjzGN0",
  tabs: { models: "Models", addons: "Add-ons", settings: "Settings" },
};
