# WordForge SRS

A local-first Spaced Repetition System (SRS) client powered by the SM-2 algorithm, built with a modern React architecture.

## Introduction

WordForge SRS is a digital flashcard tool designed for high-efficiency memorization. It utilizes the scientific SM-2 algorithm to dynamically adjust review intervals based on your forgetting curve.

- **SM-2 Algorithm Engine**: Dynamically calculates spaced intervals based on interaction histories (`again` / `hard` / `good` / `easy`).
- **Zero-Backend Architecture**: All CRUD operations resolve inside the browser storage (IndexedDB) without establishing backend communication.
- **PWA Offline Mode**: Built-in Service Worker for asset caching, enabling stable operation in offline environments.
- **Defensive Data Input**: Features a robust formatting validation system processing bulk CSV uploads without compromising stability.
- **Dual Quota Control**: Global daily new card limits and individual deck quotas can be configured separately.

## Installation

For the best user experience (full-screen mode, faster startup), it is recommended to install this application as a **Web App (PWA)**.

### 📲 PWA Installation Guide
#### 🍎 iPhone / iPad (iOS)
- **Safari Browser**: 
    1. Tap the **"Share"** button 📤 at the bottom.
    2. Scroll up and select **"Add to Home Screen"**.
    3. Tap "Add" in the top right to complete the setup.
#### 🤖 Android
- **Google Chrome**:
    1. Tap the three-dot menu **(⋮)** in the top right.
    2. Select **"Install app"** or **"Add to Home screen"**.
#### 💻 Desktop
- **Chrome / Edge**: 
    1. In the address bar, click the **"Install"** icon (monitor and arrow icon).
    2. WordForge will open in a standalone window.

---

### 🚀 Developer Setup (Optional)
If you are a developer and wish to run this project locally:
```bash
npm install     # Install dependencies
npm run dev     # Start development server
npx playwright test # Run test suite
```

## Usage

### 📤 How to Import Vocabulary
WordForge is local-first. The import button is located in the top-right corner.
![UI Guide](./public/docs/ui-guide.png)
1. Prepare a CSV file in the format: `front text,back text`.
2. Click the highlighted **"Import CSV"** button to upload.

### Core Interaction
- **Selection Controls**: Added "Select All", "Deselect All", and "Invert Selection" for rapid study plan adjustments.
- **Learning Queue**: Cards in 'Learning' state are retained until mastered, bypassing daily limits.

## Tech Stack

- **Architecture**: Single Page Application (SPA), Mobile-First UI
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v3, Lucide-React
- **Storage**: IndexedDB (Native API wrapper)
- **Data Parsing**: PapaParse (Client-side CSV parsing)
- **CI/CD**: GitHub Actions, GitHub Pages
