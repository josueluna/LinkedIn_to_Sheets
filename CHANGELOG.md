# Changelog

All notable changes to this project will be documented in this file.

---

## v0.1.13

### Improved
- Refined the popup UI with cleaner spacing and more polished visual hierarchy.
- Replaced profile preview icons with custom inline Tabler-style icons for a more on-brand look.
- Improved LinkedIn URL preview formatting by removing `https://` and `www.`.
- Unified popup notifications under a single toast system for success, warning, and error states.
- Improved toast placement and styling so notifications remain visible inside the extension popup.
- Refined the feedback prompt flow:
  - first appears after 20 successful pastes
  - reappears after 30 more successful pastes if dismissed
  - reappears after 100 more successful pastes if feedback is sent

### Changed
- When feedback is due, the feedback prompt now appears before the success confirmation screen.
- Minor copy and UI polish updates across the popup.

---

## v0.1.12

### Features
- Added multi-language support with English and Spanish localization.
- Extension UI now adapts to the browser's language setting automatically.

---

## v0.1.11

### UI Improvements
- Added subtle glow animation to the Send feedback link in the footer for better discoverability.

---

## v0.1.10

### Improved
- Improved public project pages for a more consistent visual presentation across Home, Changelog, and Privacy.

### Fixed
- Fixed changelog page loading so changelog content renders correctly from the Markdown source.
- Improved documentation page consistency and navigation.

---

## v0.1.9

### Improved
- Added subtle guided highlight states to the Spreadsheet and Tab selectors when a destination has not been selected yet.
- Improved popup guidance so required destination steps are more visually noticeable.
- Added subtle popup screen transitions for the main view, column mapping panel, and success state.
- Improved column mapping behavior so draft edits are only saved when clicking **Save changes**.
- Reset to Default now restores the default mapping, saves it immediately, and closes the panel.
- Improved popup loading behavior with a dedicated loading shell to avoid a blank flash before the main UI appears.

### Fixed
- Prevented column mapping changes from being unintentionally preserved when leaving the panel with **Back**.
- Stabilized popup UI tests after the animated panel update.
- Expanded scraper coverage with additional LinkedIn fixture variations and layout scenarios.

### Testing
- Added stronger popup UI coverage for connected/disconnected states, mapping validation, and required Profile URL behavior.
- Added fixture-based scraper tests for alternate layouts, missing fields, reordered sections, and profile URL fallback cases.

---

## v0.1.8

### Features
- Added field toggles to column mapping.
- Allowed users to enable or disable Name, Company, Title, and Location fields.
- Kept Profile URL required for duplicate detection while allowing custom column selection.
- Added support for customizable column-based capture using spreadsheet headers.

### Changes
- Added backward compatibility for legacy column mapping configurations.
- Improved mapping behavior so saved settings continue working after the new mapping structure upgrade.

### UI Improvements
- Updated Current Profile preview to show only the fields currently enabled in column mapping.
- Kept popup height stable across connected and disconnected states.
- Improved disconnected-state layout with a more balanced connect flow.
- Improved column mapping UI with required-state handling for Profile URL.
- Improved dropdown behavior and visual consistency in mapping configuration.

---

## v0.1.7

### UI Improvements
- Aligned version label inline with author in footer for a cleaner layout.

---

## v0.1.6

### Features
- Added toast notifications for user feedback.
- Improved duplicate detection messaging when profile already exists.

### UI Improvements
- Refined feedback states and visual responses in popup.

---

## v0.1.5

### Features
- Added Google Sheets tab selection support.
- Improved spreadsheet selection flow.

---

## v0.1.4

### Features
- Added dev/production manifest setup (`manifest.dev.json` and `manifest.prod.json`).
- Added GitHub Pages landing page (`docs/index.html`).

### Changes
- Updated build scripts to support environment-based configuration.
- Improved project structure for better scalability.

### Fixes
- Fixed feedback button behavior in extension popup.

---

## v0.1.3

### Features
- Added Google Sheets template copy button.
- Added privacy policy landing page.

### Changes
- Updated manifest with production OAuth configuration.
- Minor README improvements.

---

## v0.1.2

### Initial Release
- Initial Chrome extension structure.
- Core LinkedIn profile extraction functionality.
- Integration with Google Sheets.

---

## v0.1.1

### Features
- Base project setup with Vite, React, and TypeScript.

---

## v0.1.0

### Project Setup
- Initial project scaffolding.