const BASE_DRIVE_URL = "https://www.googleapis.com/drive/v3/files";
const BASE_SHEETS_URL = "https://sheets.googleapis.com/v4/spreadsheets";

export async function getAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}

export interface Spreadsheet {
  id: string;
  name: string;
}

export async function fetchSpreadsheets(): Promise<Spreadsheet[]> {
  const token = await getAccessToken();

  const res = await fetch(
    `${BASE_DRIVE_URL}?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name)&pageSize=50`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await res.json();
  return data.files || [];
}

export async function fetchSheets(spreadsheetId: string): Promise<string[]> {
  const token = await getAccessToken();

  const res = await fetch(`${BASE_SHEETS_URL}/${spreadsheetId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  return data.sheets.map((s: any) => s.properties.title);
}