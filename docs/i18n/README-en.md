# WordForge — High-Quality Flashcards 🚀

[![README](https://img.shields.io/badge/README-繁體中文-blue.svg)](../../README.md)
[![Data Spec](https://img.shields.io/badge/Data%20Spec-v1.0-green.svg)](../SPEC.md)
[![PWA](https://img.shields.io/badge/PWA-offline%20ready-5a67d8.svg)](#-access--installation)

A minimalist flashcard system for advanced learners. Features a precise SRS (Spaced Repetition System), a multilingual interface, and a privacy-first offline experience.

## ✨ Core Features
*   **Multilingual Architecture & UI**: Supports 8 UI languages (Traditional Chinese, English, Japanese, Korean, German, Spanish, French, Thai) with **custom flashcard layouts** per language (e.g., Kana/Kanji for Japanese, gender for German, tone for Thai).
*   **Text-to-Speech (TTS)**: Pronounces both the word and the example sentence to reinforce listening.
*   **Continuous Listening**: Repeats the word/phrase and example 0–5 times each, with today/all, sequential/shuffle, loop, and playlist navigation, without changing SRS progress.
*   **Personalized Themes**: Includes three light and three dark presets, system mode, live preview, HEX/color-picker customization, and WCAG contrast protection.
*   **Adjustable Layout and Icons**: Uses minus/editable-percentage/plus controls to safely scale eight text/icon categories and stores three named custom-icon profiles. Each image can be fitted, zoomed, and repositioned inside its frame.
*   **Portable Data Backups**: Exports settings, custom icons, decks, SRS progress, and reports as a versioned JSON file with an integrity hash and validates it before import.
*   **Opt-in Google Drive Sync**: Connects to the user's private Google Drive app-data folder only on request, using the minimal `drive.appdata` scope, in-memory short-lived tokens, offline continuity, and conflict preservation.
*   **Progressive Web App (PWA)**: Installable on mobile and desktop for a native, full-screen, offline experience.
*   **Local-first Offline Storage (IndexedDB)**: Decks and progress are stored in the browser first and work offline without an account. Data is synchronized only after the user explicitly connects Google Drive.
*   **High-Quality CSV Import**: Imports 9-column CSV files that follow the [Data Spec](../SPEC.md), with automatic language detection.

## 📲 Access & Installation

### 1. Web Version (Fastest)
[Open the WordForge Web App](https://shuai-chi.github.io/wordcards/)
*   A pure frontend app. Once loaded it works offline; data stays in the browser by default and Google Drive sync is optional.

### 2. Mobile Installation (PWA Recommended)
*   **iOS (Safari)**: Tap **Share** → **Add to Home Screen**.
*   **Android (Chrome)**: Tap the menu → **Install App**.

### 3. Local Development
```bash
git clone https://github.com/Shuai-chi/wordcards.git
cd wordcards
npm install
npm run dev -- --host 0.0.0.0
```

When the project runs in WSL2, open `http://localhost:5173` directly in Windows Chrome or Edge; the repository does not need to be copied to the Windows filesystem. If Windows localhost forwarding is temporarily unavailable, start the app with `npm run dev -- --host 0.0.0.0`, obtain the WSL address from `hostname -I`, and open `http://<WSL-IP>:5173`. Backup export and palette copying support this non-secure preview origin. Google OAuth acceptance is the exception: the URL must exactly match an Authorized JavaScript origin, so use `http://localhost:5173` or a registered HTTPS deployment rather than a temporary WSL address.

## 🛠️ User Guide

### Step 1: Prepare & Import
1.  **Get cards**: Use the ready-made decks in [`sample-decks/`](../../sample-decks) (GRE / TOEFL / High-School CEFR levels), or generate your own CSV following the [Data Spec](../SPEC.md).
2.  **Import**: Click the **Upload** icon on the home screen and select your CSV. The language is detected automatically.

### Step 2: Settings
1.  **Fixed controls**: The settings title, tabs, Save, and Close stay at the top while only the active tab content scrolls. A successful save keeps the window open and shows a saved state. Closing through X, the backdrop, or Escape prompts before discarding an unsaved draft.
2.  **Appearance**: In **Settings → Appearance**, choose system, light, or dark mode and apply a recommended theme. Brand, accent, background, and card colors can be customized. The AI color command bar uses the locale-independent format `background=#RRGGBB;card=#RRGGBB;primary=#RRGGBB;accent=#RRGGBB`; a command may contain only the fields to change. Apply updates the live preview, while the fixed top **Save** button remains the only persistence action. The current full command can be shown or copied, and restore returns the active mode to its most recently saved palette.
3.  **Size controls**: Use minus, an editable percentage, and plus to adjust base text, page headings, card titles, descriptions, statistic numbers, card icons, study prompts, and study answers. The fixed interface-and-study-card preview responds immediately; every control also has a safe range and reset action.
4.  **Custom icons**: In **Settings → Icons**, switch among or rename three image profiles. A name may remain blank while editing and falls back to “設定 1/2/3” only when saved blank. Each of the six icons accepts PNG/JPG/WebP up to 512 KiB and supports fit, fill, zoom, drag positioning, and individual removal; the fixed icon dock previews the active profile and image transform.
5.  **Readability protection**: A palette that misses the text or control contrast threshold is identified and cannot be saved until corrected.
6.  **Global daily limit**: In **Settings → General & backup**, set the maximum number of new cards per day across all decks. Per-deck limits remain available.
7.  **Backup and restore**: Use **Settings → General & backup** to export JSON. Schema v3 includes size settings, custom icons, and continuous-listening preferences, while schema v1/v2 files remain importable. Import first shows deck, card, and report counts; data is replaced only after confirmation, and a failed validation or apply keeps the current data.
8.  **Google Drive sync (Pilot)**: Explicitly connect Google Drive from **Settings → General & backup**. Initial authorization and renewal of an expired short-lived token require a user click. Once connected, local changes, restored connectivity, and foreground activation schedule sync; **Sync now** remains available. Disconnecting deletes neither local nor cloud data. **Delete cloud backups** has a separate confirmation, permanently deletes only WordForge snapshots, and keeps local data. Diverging copies are preserved as conflicts instead of silently using device time.

### Step 3: Learning (SRS)
The system schedules the next review based on your feedback:
*   **Again (1)**: Forgot completely. The card re-enters learning and reappears soon.
*   **Hard (2)**: Recalled slowly. Shortens the next interval.
*   **Good (3)**: Clear recall. Standard interval growth.
*   **Easy (4)**: Effortless recall. Significantly extends the interval.

### Step 4: Continuous Listening
Select decks in the Learning Center, then choose **Open Listening Mode**. This read-only mode creates no rating and never changes SRS progress. Word/phrase and example repetitions can each be set from 0 to 5, with today's list or all cards, sequential or shuffle order, whole-playlist looping, and direct playlist navigation.

- Playback rates: 0.5×, 0.75×, 0.85×, 1×, 1.25×, 1.5×, 1.75×, and 2×; default 0.85×.
- Preferred voices come from the current browser and operating system. Missing or incompatible voices automatically fall back to a compatible voice.
- Rate and voice changes apply from the next repetition without interrupting the active utterance. Preview interrupts that repetition and leaves playback paused.

Foreground playback is the supported target. Whether speech continues after switching apps, locking the screen, or system sleep depends on the browser and operating system. If the platform interrupts speech, returning to the foreground leaves the player stopped at the current repetition and never speaks automatically. Reopening restores the last card but remains paused. See the [continuous-listening manual QA guide](../continuous-listening-manual-qa.md) for platform checks.

### Step 5: Re-practice Today's Cards
After finishing your daily tasks, the start button becomes **"Repeat today"**, letting you consolidate today's cards without affecting the long-term SRS schedule.

## 📂 Project Structure
*   `src/components/`: UI components (Dashboard, LearningView, etc.).
*   `src/lib/`: Core logic (SRS algorithm, CSV parsing, language detection, IndexedDB).
*   `docs/`: Multilingual READMEs and the [Data Spec](../SPEC.md).
*   `prompts/`: AI prompts and format notes for generating your own cards.
*   `sample-decks/`: Ready-to-import sample CSV decks.

## 🛡️ Privacy
WordForge is **local-first and privacy-first**. Theme, size, icon-profile metadata, and continuous-listening preferences are kept in browser `localStorage`; custom image blobs, decks, and learning progress are kept in IndexedDB. Until the user explicitly connects Google Drive, this data does not leave the browser.

After opt-in, a complete backup is synchronized to the connected account's hidden Google Drive `appDataFolder`. It includes settings, decks, original card text, SRS progress, reports, and custom icons. WordForge requests only `drive.appdata`; access tokens remain in memory, and no client secret, refresh token, or WordForge backend is used. Disconnect and permanent cloud deletion are separate actions. Clearing browser data can still remove unsynchronized changes, so **regularly export a JSON file from Settings → General & backup and store it safely**.

The Google Drive Pilot implementation is present, but real two-browser-profile acceptance is still required before calling cross-device sync verified. Follow the Traditional Chinese [WordForge cloud-sync verification guide](../../../WordForge_雲端同步驗證指南.html) for Cloud Console, leaked-secret rotation, WSL2, offline, and conflict steps.
