# WordForge SRS

A local-first Spaced Repetition System (SRS) powered by the SM-2 algorithm for efficient language learning.

## Introduction

WordForge SRS is a digital flashcard tool designed for high-efficiency memorization. It utilizes the scientific SM-2 algorithm to dynamically adjust review intervals based on your forgetting curve.

- **SM-2 Algorithm Engine**: Automatically calculates optimal review intervals based on card interaction history (`Again` / `Hard` / `Good` / `Easy`).
- **Local-First Storage**: All vocabulary data and learning progress are stored in the browser's IndexedDB, ensuring privacy and offline accessibility.
- **PWA Support**: Installable on mobile or desktop for a native app-like offline experience.
- **Robust Import**: Supports bulk CSV uploads with a built-in strict format validation system.
- **Flexible Quotas**: Individually configurable global daily new card limits and per-deck independent quotas.

## Installation

Ensure you have [Node.js](https://nodejs.org/) installed, then run the following commands:

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd wordcards
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

## Usage

### Importing Vocabulary
1. Prepare a CSV file in the format: `front text,back text`.
2. Click the **"Import CSV"** button in the top-right corner to upload.

### Start Learning
1. Select a deck to study from the dashboard.
2. Interact with the review buttons based on your memory; the system will schedule the next review session automatically.

### PWA Installation (Recommended)
- **iOS**: Open in Safari, tap "Share", and select "Add to Home Screen".
- **Android**: Open in Chrome, tap the menu, and select "Install app".

## Tech Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite
- **UI Styling**: Tailwind CSS v3, Lucide-React
- **Storage**: IndexedDB (Native API wrapper)
- **Data Parsing**: PapaParse
- **Testing**: Playwright (E2E Testing)
- **Deployment**: GitHub Actions, GitHub Pages
