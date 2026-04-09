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
  return /^https:\/\/www\.linkedin\.com\/in\/.+/i.test(url);
}

async function ensureContentScript(tabId: number) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["assets/content.js"],
  });
}

async function getProfileFromActiveTab(): Promise<LinkedinProfile> {
  const tab = await getActiveTab();

  if (!isLinkedInProfileUrl(tab.url)) {
    throw new Error("Open a LinkedIn profile page first.");
  }

  await ensureContentScript(tab.id!);

  const response = await chrome.tabs.sendMessage(tab.id!, {
    type: "EXTRACT_PROFILE",
  });

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

// --------------------
// WRITE PROFILE (FIXED)
// --------------------

async function appendProfileToSheet(
  spreadsheetId: string,
  sheetName: string,
  profile: LinkedinProfile
) {
  const token = await getGoogleAuthTokenSafe();

  // 🔍 1. Buscar duplicados (columna F)
  const checkRange = `${sheetName}!F2:F`;

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

  // 🔢 2. Encontrar siguiente fila disponible
  const readRange = `${sheetName}!B2:F`;

  const readRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(readRange)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const readData = await readRes.json();
  const rows = Array.isArray(readData.values) ? readData.values : [];

  const nextRow = rows.length + 2;

  // ✍️ 3. Escribir EXACTAMENTE en B:F
  const writeRange = `${sheetName}!B${nextRow}:F${nextRow}`;

  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(writeRange)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [[
          profile.name,
          profile.company,
          profile.title,
          profile.location,
          profile.profileUrl,
        ]],
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
        const profile = await getProfileFromActiveTab();
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

      case "APPEND_PROFILE": {
        const result = await appendProfileToSheet(
          message.spreadsheetId,
          message.sheetName,
          message.profile
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