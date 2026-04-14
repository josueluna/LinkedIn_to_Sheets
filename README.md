# LinkedIn to Sheets

![Version](https://img.shields.io/badge/version-v0.1.7-blue)
![Status](https://img.shields.io/badge/status-beta-orange)
![Platform](https://img.shields.io/badge/platform-chrome-lightgrey)

Save LinkedIn profiles directly into Google Sheets in seconds.

Built for recruiters and sourcing professionals who want a faster, cleaner way to capture and organize candidate data — without manual copy-paste.

---

## 🚀 Key Features

- One-click LinkedIn profile extraction
- Direct save into Google Sheets
- Spreadsheet and tab selection
- Custom column mapping
- Sheet header preview inside column mapping
- Duplicate detection by LinkedIn profile URL
- Clean and simple workflow
- Secure Google OAuth integration

---

## ⚡ How it works

1. Open any LinkedIn profile
2. Click the extension
3. Connect your Google account
4. Select your Google Sheet and tab
5. Optionally adjust **Column Mapping**
6. Click **"Paste Current Profile"**

Done. The profile is instantly saved into your selected spreadsheet.

---

## 📊 Data captured

The extension extracts publicly available data:

- Name
- Current company
- Current position
- Location
- Profile URL

---

## 🧭 Column Mapping

LinkedIn to Sheets lets you choose which spreadsheet column receives each field.

You can map:

- Name
- Company
- Title
- Location
- Profile URL

The extension also previews sheet headers from your selected tab, so mapping is easier and more accurate.

Example:

- `B : Name`
- `C : Current Company`
- `D : Current Position`

Duplicate columns are prevented to avoid invalid mappings.

---

## 📄 Template (recommended)

Use the ready-to-use Google Sheets template:

👉 https://docs.google.com/spreadsheets/d/1w7nUnxSllVPVc7t1OhE-M6hN3zbeYIGK0jMf2SBsE60/copy

Recommended structure:

| A | B    | C       | D     | E        | F   |
|---|------|---------|-------|----------|-----|
| # | Name | Company | Title | Location | URL |

You can also use your own spreadsheet structure by configuring the column mapping.

---

## 🔐 Permissions

This extension uses:

- LinkedIn → to read profile data
- Google Sheets API → to write data
- Google Drive API → to list spreadsheets

No data is stored externally.

---

## 🧩 Troubleshooting

**Unexpected error**  
→ Try reconnecting your Google account

**Can't select spreadsheet**  
→ Make sure Google permissions were granted

**Can't find the right tab or headers**  
→ Re-select the spreadsheet/tab and reopen Column Mapping

**Duplicate profiles**  
→ The extension checks existing profile URLs before inserting

👉 [Contact Support](https://forms.gle/xmCiUB8Tzs3ocM616)

---

## 📚 Documentation

- User Guide: https://josueluna.github.io/LinkedIn_to_Sheets/docs/index.html
- Privacy Policy: https://josueluna.github.io/LinkedIn_to_Sheets/docs/privacy.html
- Changelog: https://josueluna.github.io/LinkedIn_to_Sheets/docs/changelog.html

---

## 🛠 Tech Stack

- React + Vite
- Chrome Extensions (Manifest V3)
- Google OAuth
- Google Sheets API
- Google Drive API

---

## 👨‍💻 Author

Developed by [Josué Luna](https://www.linkedin.com/in/josuelunagamboa/)
