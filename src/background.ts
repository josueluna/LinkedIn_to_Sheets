import { ColumnMapping, defaultColumnMapping, normalizeColumnMapping } from "./lib/mappings";
type LinkedinProfile = {
  name: string;
  company: string;
  title: string;
  location: string;
  profileUrl: string;
};

// --------------------
// TAB / LINKEDIN
// --------------------

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });

  if (!tab?.id) {
    throw new Error("No active tab found.");
  }

  return tab;
}

function isLinkedInProfileUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const isLinkedInHost =
      parsed.hostname === "www.linkedin.com" || parsed.hostname === "linkedin.com";
    const normalizedPath = parsed.pathname.toLowerCase();
    return isLinkedInHost && /^\/in\/[^/]+\/?$/.test(normalizedPath);
  } catch {
    return false;
  }
}

function isBenignContentScriptInjectionError(message: string): boolean {
  return (
    message.includes("Cannot access contents of url") ||
    message.includes("The extensions gallery cannot be scripted") ||
    message.includes("Cannot create item with duplicate id")
  );
}

async function ensureContentScript(tabId: number) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["assets/content.js"],
    });
    console.log("[background] Content script ensured via executeScript", { tabId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!isBenignContentScriptInjectionError(message)) {
      throw error;
    }

    // Content script may already be present via manifest injection.
    console.log("[background] executeScript skipped/ignored", { tabId, error: message });
  }
}

async function sendExtractProfileMessageWithRetry(tabId: number) {
  const attempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: "EXTRACT_PROFILE",
      });

      console.log("[background] EXTRACT_PROFILE response", {
        tabId,
        attempt,
        ok: response?.ok,
      });

      return response;
    } catch (error) {
      lastError = error;
      console.log("[background] EXTRACT_PROFILE sendMessage failed", {
        tabId,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });

      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        await ensureContentScript(tabId);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not contact LinkedIn content script.");
}

async function getProfileFromActiveTab(): Promise<LinkedinProfile> {
  const tab = await getActiveTab();
  console.log("[background] getProfileFromActiveTab", {
    tabId: tab.id,
    url: tab.url,
  });

  if (!isLinkedInProfileUrl(tab.url)) {
    console.log("[background] Active tab is not a LinkedIn profile URL", {
      tabId: tab.id,
      url: tab.url,
    });
    return null as unknown as LinkedinProfile;
  }

  await ensureContentScript(tab.id!);

  const response = await sendExtractProfileMessageWithRetry(tab.id!);

  if (!response?.ok || !response.profile) {
    throw new Error(response?.error || "Could not extract LinkedIn profile.");
  }

  return response.profile as LinkedinProfile;
}

// --------------------
// GOOGLE AUTH
// --------------------

function getGoogleAuthToken(interactive: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        console.error("Auth error:", chrome.runtime.lastError);
        reject(chrome.runtime.lastError.message);
        return;
      }

      if (!token) {
        reject("No token received.");
        return;
      }

      resolve(token);
    });
  });
}

async function getGoogleAuthTokenSafe(): Promise<string> {
  try {
    return await getGoogleAuthToken(false);
  } catch {
    return await getGoogleAuthToken(true);
  }
}

async function connectGoogle(): Promise<string> {
  await chrome.identity.clearAllCachedAuthTokens();
  return await getGoogleAuthToken(true);
}

async function disconnectGoogle() {
  await chrome.identity.clearAllCachedAuthTokens();

  await chrome.storage.local.remove([
    "isConnected",
    "spreadsheetId",
    "spreadsheetName",
    "spreadsheetUrl",
    "sheetName",
  ]);

  return { disconnected: true };
}

// --------------------
// GOOGLE DRIVE
// --------------------

async function listSpreadsheets() {
  const token = await getGoogleAuthTokenSafe();

  const query = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
    );

  const response = await fetch(
`https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=100`,
{
  headers: {
    Authorization: `Bearer ${token}`,
  },
}
);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Unable to list spreadsheets.");
  }

  return data.files.map((file: any) => ({
    id: file.id,
    name: file.name,
    url: `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
  }));
}

// --------------------
// GOOGLE SHEETS
// --------------------

async function getSheetTabs(spreadsheetId: string) {
  const token = await getGoogleAuthTokenSafe();

  const response = await fetch(
`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
{
  headers: {
    Authorization: `Bearer ${token}`,
  },
}
);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Unable to load sheet tabs.");
  }

  return data.sheets.map((s: any) => s.properties.title);
}
function columnOptionsFromHeaders(headers: string[]) {
  return Array.from({ length: 10 }, (_, index) => {
    const column = String.fromCharCode(65 + index);
    const header = headers[index] ?? "";

    return {
      column,
      header,
    };
  });
}
async function getSheetHeaders(spreadsheetId: string, sheetName: string) {
  const token = await getGoogleAuthTokenSafe();

  const range = `${sheetName}!A1:J1`;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Unable to load sheet headers.");
  }

  const headers = Array.isArray(data.values?.[0]) ? data.values[0] : [];

  return columnOptionsFromHeaders(headers);
}

// --------------------
// WRITE PROFILE (FIXED)
// --------------------

function columnLetterToIndex(letter: string): number {
  return letter.toUpperCase().charCodeAt(0) - 65;
}

function columnLetterToRange(letter: string, row: number): string {
  return `${letter.toUpperCase()}${row}`;
}

function getMaxColumnIndex(mapping: ColumnMapping): number {
  const enabledColumns = Object.values(mapping)
    .filter((field) => field.enabled)
    .map((field) => columnLetterToIndex(field.column));

  if (enabledColumns.length === 0) {
    return columnLetterToIndex(defaultColumnMapping.profileUrl.column);
  }

  return Math.max(...enabledColumns);
}

async function appendProfileToSheet(
  spreadsheetId: string,
  sheetName: string,
  profile: LinkedinProfile,
  columnMapping: ColumnMapping = defaultColumnMapping
) {
  const normalizedMapping = normalizeColumnMapping(columnMapping);
  const token = await getGoogleAuthTokenSafe();

  // 🔍 1. Buscar duplicados en la columna configurada para Profile URL
  const duplicateCheckColumns = normalizedMapping.profileUrl.enabled
    ? Array.from(new Set([normalizedMapping.profileUrl.column.toUpperCase(), "F"]))
    : ["F"];

  for (const column of duplicateCheckColumns) {
    const checkRange = `${sheetName}!${column}2:${column}`;

    const checkRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(checkRange)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const checkData = await checkRes.json();
    const existingRows = Array.isArray(checkData.values) ? checkData.values : [];

    for (let i = 0; i < existingRows.length; i++) {
      const value = existingRows[i]?.[0];
      if (value === profile.profileUrl) {
        return {
          duplicate: true,
          row: i + 2,
        };
      }
    }
  }

  // 🔢 2. Encontrar siguiente fila disponible usando la columna más a la derecha del mapping
  const maxColumnLetter = String.fromCharCode(65 + getMaxColumnIndex(normalizedMapping));
  const readRange = `${sheetName}!A2:${maxColumnLetter}`;

  const readRes = await fetch(
`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(readRange)}`,
{
  headers: { Authorization: `Bearer ${token}` },
}
);

  const readData = await readRes.json();
  const rows = Array.isArray(readData.values) ? readData.values : [];

  const nextRow = rows.length + 2;

// ✍️ 3. Escribir en las columnas configuradas
  const maxColumnIndex = getMaxColumnIndex(normalizedMapping);
  const rowValues = new Array(maxColumnIndex + 1).fill("");

    if (normalizedMapping.name.enabled) {
      rowValues[columnLetterToIndex(normalizedMapping.name.column)] = profile.name;
    }

    if (normalizedMapping.company.enabled) {
      rowValues[columnLetterToIndex(normalizedMapping.company.column)] = profile.company;
    }

    if (normalizedMapping.title.enabled) {
      rowValues[columnLetterToIndex(normalizedMapping.title.column)] = profile.title;
    }

    if (normalizedMapping.location.enabled) {
      rowValues[columnLetterToIndex(normalizedMapping.location.column)] = profile.location;
    }

    if (normalizedMapping.profileUrl.enabled) {
      rowValues[columnLetterToIndex(normalizedMapping.profileUrl.column)] = profile.profileUrl;
}

  const writeRange = `${sheetName}!A${nextRow}:${String.fromCharCode(65 + maxColumnIndex)}${nextRow}`;

  const writeRes = await fetch(
`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(writeRange)}?valueInputOption=USER_ENTERED`,
{
  method: "PUT",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    values: [rowValues],
  }),
}
);

  const writeData = await writeRes.json();

  if (!writeRes.ok) {
    throw new Error(writeData?.error?.message || "Unable to write to Sheets.");
  }

  return {
    duplicate: false,
    row: nextRow,
    updatedRange: writeData.updatedRange,
  };
}

// --------------------
// MENSAJES
// --------------------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
    case "GET_ACTIVE_PROFILE": {
      console.log("[background] Handling GET_ACTIVE_PROFILE");
      const profile = await getProfileFromActiveTab();
      console.log("[background] Returning GET_ACTIVE_PROFILE response", {
        hasProfile: Boolean(profile),
      });
      sendResponse({ ok: true, profile });
      break;
    }

  case "AUTH_GOOGLE": {
    const token = await connectGoogle();
    sendResponse({ ok: true, token });
    break;
  }

case "DISCONNECT_GOOGLE": {
  const result = await disconnectGoogle();
  sendResponse({ ok: true, result });
  break;
}

case "LIST_SPREADSHEETS": {
  const spreadsheets = await listSpreadsheets();
  sendResponse({ ok: true, spreadsheets });
  break;
}

case "GET_SHEET_TABS": {
  const tabs = await getSheetTabs(message.spreadsheetId);
  sendResponse({ ok: true, tabs });
  break;
}

case "GET_SHEET_HEADERS": {
  const headers = await getSheetHeaders(
    message.spreadsheetId,
    message.sheetName
  );
  sendResponse({ ok: true, headers });
  break;
}

case "APPEND_PROFILE": {
  const result = await appendProfileToSheet(
    message.spreadsheetId,
    message.sheetName,
    message.profile,
    message.columnMapping ?? defaultColumnMapping
    );
  sendResponse({ ok: true, result });
  break;
}

default:
  sendResponse({ ok: false, error: "Unknown message type." });
}
})().catch((error) => {
  sendResponse({
    ok: false,
    error: error instanceof Error ? error.message : "Unexpected error.",
  });
});

return true;
});
