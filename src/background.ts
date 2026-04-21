import {
  ColumnMapping,
  defaultColumnMapping,
  normalizeColumnMapping,
} from "./lib/mappings";
import {
  buildRow,
  getMaxColumnIndex,
  getProfileUrlDuplicateColumns,
  isDuplicateProfile,
  normalizeProfileUrl,
} from "./lib/sheets";

type LinkedinProfile = {
  name: string;
  company: string;
  title: string;
  location: string;
  profileUrl: string;
};

type ExtractProfileSuccessResponse = { ok: true; profile: LinkedinProfile };
type ExtractProfileErrorResponse = { ok: false; error: string };
type ExtractProfileResponse =
  | ExtractProfileSuccessResponse
  | ExtractProfileErrorResponse;

type SpreadsheetItem = {
  id: string;
  name: string;
  url: string;
};

type SpreadsheetCacheEntry = {
  expiresAt: number;
  value: SpreadsheetItem[];
};

const SPREADSHEET_CACHE_TTL_MS = 30_000;
let spreadsheetsCache: SpreadsheetCacheEntry | null = null;

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
      parsed.hostname === "www.linkedin.com" ||
      parsed.hostname === "linkedin.com";
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
    console.log("[background] Content script ensured via executeScript", {
      tabId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!isBenignContentScriptInjectionError(message)) {
      throw error;
    }

    // Content script may already be present via manifest injection.
    console.log("[background] executeScript skipped/ignored", {
      tabId,
      error: message,
    });
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

function normalizeExtractProfileResponse(raw: unknown): ExtractProfileResponse {
  const direct = raw as Partial<ExtractProfileResponse> | undefined;
  if (direct?.ok === true && direct.profile) {
    return { ok: true, profile: direct.profile };
  }

  if (direct?.ok === false) {
    return {
      ok: false,
      error: direct.error || "Could not extract LinkedIn profile.",
    };
  }

  // Defensive fallback for accidental nested envelopes.
  const nested = (raw as any)?.data as
    | Partial<ExtractProfileResponse>
    | undefined;
  if (nested?.ok === true && nested.profile) {
    return { ok: true, profile: nested.profile };
  }

  if (nested?.ok === false) {
    return {
      ok: false,
      error: nested.error || "Could not extract LinkedIn profile.",
    };
  }

  return { ok: false, error: "Could not extract LinkedIn profile." };
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

  const rawResponse = await sendExtractProfileMessageWithRetry(tab.id!);
  const response = normalizeExtractProfileResponse(rawResponse);

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
  spreadsheetsCache = null;

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

async function fetchSpreadsheets(): Promise<SpreadsheetItem[]> {
  const token = await getGoogleAuthTokenSafe();
  const query = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
  );

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Unable to list spreadsheets.");
  }

  return (Array.isArray(data.files) ? data.files : []).map((file: any) => ({
    id: file.id,
    name: file.name,
    url: `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
  }));
}

async function listSpreadsheets(
  forceRefresh = false,
): Promise<SpreadsheetItem[]> {
  const now = Date.now();

  if (!forceRefresh && spreadsheetsCache && spreadsheetsCache.expiresAt > now) {
    return spreadsheetsCache.value;
  }

  const value = await fetchSpreadsheets();
  spreadsheetsCache = {
    value,
    expiresAt: now + SPREADSHEET_CACHE_TTL_MS,
  };

  return value;
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
    },
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
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Unable to load sheet headers.");
  }

  const headers = Array.isArray(data.values?.[0]) ? data.values[0] : [];

  return columnOptionsFromHeaders(headers);
}

// --------------------
// WRITE PROFILE
// --------------------

async function appendProfileToSheet(
  spreadsheetId: string,
  sheetName: string,
  profile: LinkedinProfile,
  columnMapping: ColumnMapping = defaultColumnMapping,
) {
  const normalizedMapping = normalizeColumnMapping(columnMapping);
  const normalizedProfileUrl = normalizeProfileUrl(profile.profileUrl);
  const token = await getGoogleAuthTokenSafe();

  const duplicateCheckColumns =
    getProfileUrlDuplicateColumns(normalizedMapping);

  for (const column of duplicateCheckColumns) {
    const checkRange = `${sheetName}!${column}2:${column}`;

    const checkRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(checkRange)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const checkData = await checkRes.json();
    const existingRows = Array.isArray(checkData.values)
      ? checkData.values
      : [];

    const duplicateResult = isDuplicateProfile(
      existingRows,
      normalizedProfileUrl,
    );
    if (duplicateResult.duplicate) {
      return duplicateResult;
    }
  }

  const maxColumnIndex = getMaxColumnIndex(normalizedMapping);
  const maxColumnLetter = String.fromCharCode(65 + maxColumnIndex);
  const readRange = `${sheetName}!A2:${maxColumnLetter}`;

  const readRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(readRange)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  const readData = await readRes.json();
  const rows = Array.isArray(readData.values) ? readData.values : [];
  const nextRow = rows.length + 2;

  const rowValues = buildRow(
    {
      ...profile,
      profileUrl: normalizedProfileUrl,
    },
    normalizedMapping,
  );

  const writeRange = `${sheetName}!A${nextRow}:${maxColumnLetter}${nextRow}`;

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
    },
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
        const spreadsheets = await listSpreadsheets(
          Boolean(message.forceRefresh),
        );
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
          message.sheetName,
        );
        sendResponse({ ok: true, headers });
        break;
      }

      case "APPEND_PROFILE": {
        const result = await appendProfileToSheet(
          message.spreadsheetId,
          message.sheetName,
          message.profile,
          message.columnMapping ?? defaultColumnMapping,
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
