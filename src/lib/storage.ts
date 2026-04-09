export interface Selection {
  selectedSpreadsheetId: string;
  selectedSpreadsheetName: string;
  selectedSheetName: string;
}

export async function saveSelection(selection: {
  id: string;
  name: string;
  sheetName: string;
}) {
  return chrome.storage.local.set({
    selectedSpreadsheetId: selection.id,
    selectedSpreadsheetName: selection.name,
    selectedSheetName: selection.sheetName,
  });
}

export async function getSelection(): Promise<Partial<Selection>> {
  return chrome.storage.local.get([
    "selectedSpreadsheetId",
    "selectedSpreadsheetName",
    "selectedSheetName",
  ]);
}

export async function clearSelection() {
  return chrome.storage.local.remove([
    "selectedSpreadsheetId",
    "selectedSpreadsheetName",
    "selectedSheetName",
  ]);
}