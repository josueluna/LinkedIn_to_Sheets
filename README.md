# LinkedIn to Sheets

![Version](https://img.shields.io/badge/version-v0.1.11-blue)
![Status](https://img.shields.io/badge/status-beta-orange)
![Platform](https://img.shields.io/badge/platform-chrome-lightgrey)

Save LinkedIn profiles directly into Google Sheets in seconds.

Built for recruiters and sourcing professionals who want a faster, cleaner
way to capture and organize candidate data — without copy-paste.

---

## 🚀 Key Features

- One-click LinkedIn profile extraction
- Guided destination selection with subtle visual prompts
- Direct save into Google Sheets
- Spreadsheet and tab selection
- Custom column mapping
- Field toggles for optional data capture
- Explicit **Save changes** behavior for column mapping
- One-click **Reset to Default** for column mapping
- Duplicate detection (by profile URL)
- Smooth popup transitions for configuration and success states
- Improved popup loading with a dedicated loading shell
- Clean and simple workflow
- Secure Google OAuth integration
- Automated UI and scraper test coverage

---

## ⚡ How it works

1. Open any LinkedIn profile
2. Click the extension
3. Connect your Google account
4. Select your Google Sheet and tab
5. Optionally configure which fields to capture and where to place them
6. Click **"Paste Current Profile"**

Done. The profile is instantly saved.

---

## 📊 Data captured

The extension extracts publicly available data from LinkedIn profiles:

- Name
- Current company
- Current position
- Location
- Profile URL

Name, Company, Title, and Location can be enabled or disabled in the
column mapping settings.

Profile URL is always required because it is used for duplicate detection.

---

## 🧭 Column Mapping

Column mapping lets you control which fields are saved and which sheet
columns receive each value.

- Changes behave like a draft and are only saved when clicking **Save changes**
- Clicking **Back** discards unsaved edits
- **Reset to Default** restores the default mapping, saves it immediately,
  and closes the panel
- Profile URL is always required and cannot be disabled

---

## 📄 Template (recommended)

Use the ready-to-use Google Sheets template:

👉
https://docs.google.com/spreadsheets/d/1w7nUnxSllVPVc7t1OhE-M6hN3zbeYIGK0jMf2SBsE60/copy

The template is recommended, but column placement can be customized inside
the extension.

Recommended structure:

| A | B    | C       | D     | E        | F   |
|---|------|---------|-------|----------|-----|
| # | Name | Company | Title | Location | URL |

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
→ Make sure permissions were granted

**Duplicate profiles**  
→ The extension checks existing profile URLs before inserting

**Mapping issues after an update**  
→ Reopen the popup and review your column mapping settings. Legacy
mappings are automatically normalized.

**Documentation page doesn't load as expected**  
→ Refresh the page or open the GitHub-hosted docs again after deployment updates.

👉 [Contact Support](https://forms.gle/xmCiUB8Tzs3ocM616)

---

## 🧪 Testing

The project includes automated coverage for:

- popup UI behavior
- column mapping validation
- duplicate detection logic
- LinkedIn scraper fixture variations
- profile URL fallback and layout edge cases

---

## 📚 Documentation

- User Guide:  
  https://josueluna.github.io/LinkedIn_to_Sheets/docs/index.html
- Privacy Policy:  
  https://josueluna.github.io/LinkedIn_to_Sheets/docs/privacy.html
- Changelog:  
  https://josueluna.github.io/LinkedIn_to_Sheets/docs/changelog.html

---

## 🛠 Tech Stack

- React + Vite
- Chrome Extensions (Manifest V3)
- Google OAuth
- Google Sheets API
- Vitest + React Testing Library

---

## 👨‍💻 Author

Developed by [Josué Luna](https://www.linkedin.com/in/josuelunagamboa/)