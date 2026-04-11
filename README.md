# LinkedIn to Sheets

Save LinkedIn profiles directly into Google Sheets with one click.

This Chrome extension is designed for recruiters and sourcing professionals who need to quickly capture and organize publicly available LinkedIn profile data.

---

## Documentation

- Wiki: https://josueluna.github.io/LinkedIn_to_Sheets/wiki.html  
- Privacy Policy: https://josueluna.github.io/LinkedIn_to_Sheets/privacy.html  
- Changelog: ./CHANGELOG.md  

---

## Features

- Extract LinkedIn profile data with one click  
- Save profiles directly into Google Sheets  
- Select spreadsheet and tab  
- Avoid duplicate entries  
- Simple and fast workflow  
- Google OAuth integration  

---

## How it works

1. Open a LinkedIn profile  
2. Click the extension  
3. Connect your Google account  
4. Select your Google Sheet and tab  
5. Click "Paste Current Profile"  

The data will be automatically inserted into your selected Google Sheet.

---

## Data captured

The extension extracts the following publicly available information:

- Name  
- Current company  
- Current position  
- Location  
- Profile URL  

---

## Template (recommended)

You can use a ready-to-use Google Sheets template:

Use template

Recommended columns:

| A | B    | C       | D     | E        | F   |
|---|------|--------|------|----------|-----|
| # | Name | Company | Title | Location | URL |

---

## Permissions

This extension uses:

- LinkedIn (to read profile data)  
- Google Sheets API (to write data)  
- Google Drive API (to list spreadsheets)  

No data is stored externally.

---

## Troubleshooting

Unexpected error  
Try reconnecting your Google account  

Can't select spreadsheet  
Make sure permissions were granted  

Duplicate profiles  
The extension checks existing profile URLs before inserting  

Support: https://forms.gle/xmCiUB8Tzs3ocM616  

---

## Tech Stack

- React + Vite  
- Chrome Extensions (Manifest V3)  
- Google OAuth  
- Google Sheets API  

---

## Author

Developed by Josué Luna  
https://www.linkedin.com/in/josuelunagamboa/
