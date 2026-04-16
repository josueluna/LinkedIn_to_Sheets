# Changelog

All notable changes to this project will be documented in this file.

---

## v0.1.8
### ✨ Features
- Added field toggles to column mapping
- Allowed users to enable or disable Name, Company, Title, and Location fields
- Kept Profile URL required for duplicate detection while allowing custom column selection
- Added support for customizable column-based capture using spreadsheet headers

### 🔄 Changes
- Added backward compatibility for legacy column mapping configurations
- Improved mapping behavior so saved settings continue working after the new mapping structure upgrade

### 🎨 UI Improvements
- Updated Current Profile preview to show only the fields currently 
enabled in column mapping
- Kept popup height stable across connected and disconnected states
- Improved disconnected-state layout with a more balanced connect flow
- Improved column mapping UI with required-state handling for Profile URL
- Improved dropdown behavior and visual consistency in mapping configuration

---

## v0.1.7
### 🎨 UI Improvements
- Aligned version label inline with author in footer for a cleaner layout

---

## v0.1.6
### ✨ Features
- Added toast notifications for user feedback
- Improved duplicate detection messaging when profile already exists

### 🎨 UI Improvements
- Refined feedback states and visual responses in popup

---

## v0.1.5
### ✨ Features
- Added Google Sheets tab selection support
- Improved spreadsheet selection flow

---

## v0.1.4
### ✨ Features
- Added dev/production manifest setup (`manifest.dev.json` and `manifest.prod.json`)
- Added GitHub Pages landing page (`docs/index.html`)

### 🔄 Changes
- Updated build scripts to support environment-based configuration
- Improved project structure for better scalability

### 🐛 Fixes
- Fixed feedback button behavior in extension popup

---

## v0.1.3
### ✨ Features
- Added Google Sheets template copy button
- Added privacy policy landing page

### 🔄 Changes
- Updated manifest with production OAuth configuration
- Minor README improvements

---

## v0.1.2
### 🚀 Initial Release
- Initial Chrome extension structure
- Core LinkedIn profile extraction functionality
- Integration with Google Sheets

---

## v0.1.1
### ✨ Features
- Base project setup with Vite, React, and TypeScript

---

## v0.1.0
### 🚀 Project Setup
- Initial project scaffolding
