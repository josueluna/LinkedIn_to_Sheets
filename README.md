# LinkedIn to Sheets

Save LinkedIn profiles directly into Google Sheets in one click.

Built for recruiters and sourcing teams who want to turn LinkedIn profiles into structured data instantly.

---

## Changelog

[Changelog](./CHANGELOG.md)

---

##  Features

- Extract LinkedIn profile data automatically
- Save profiles into Google Sheets
- Select spreadsheet and tab
- Avoid duplicate entries
- Simple and fast workflow
- Google OAuth integration

---

##  How it works

1. Open a LinkedIn profile  
2. Click the extension  
3. Select your Google Sheet & Tab  
4. Click **Paste Current Profile**

Done 

---

##  Data captured

The extension extracts:

- Name
- Company
- Job Title
- Location
- Profile URL

---

##  Template (recommended)

You can use a ready-to-use Google Sheets template:

 [Use template](https://docs.google.com/spreadsheets/d/1w7nUnxSllVPVc7t1OhE-M6hN3zbeYIGK0jMf2SBsE60/copy)

Recommended columns:

| A | B | C | D | E | F |
|--|--|--|--|--|--|
| # | Name | Company | Title | Location | URL |

---

##  Permissions

This extension uses:

- LinkedIn (to read profile data)
- Google Sheets API (to write data)
- Google Drive API (to list spreadsheets)

No data is stored externally.

---

##  Tech Stack

- React + Vite
- Chrome Extensions (Manifest V3)
- Google OAuth
- Google Sheets API

---
