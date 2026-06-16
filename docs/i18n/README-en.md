# WordForge — High-Quality Flashcards 🚀

[![README](https://img.shields.io/badge/README-繁體中文-blue.svg)](../../README.md)
[![Data Spec](https://img.shields.io/badge/Data%20Spec-v1.0-green.svg)](../SPEC.md)
[![PWA](https://img.shields.io/badge/PWA-offline%20ready-5a67d8.svg)](#-access--installation)

A minimalist flashcard system for advanced learners. Features a precise SRS (Spaced Repetition System), a multilingual interface, and a privacy-first offline experience.

## ✨ Core Features
*   **Multilingual Architecture & UI**: Supports 8 UI languages (Traditional Chinese, English, Japanese, Korean, German, Spanish, French, Thai) with **custom flashcard layouts** per language (e.g., Kana/Kanji for Japanese, gender for German, tone for Thai).
*   **Text-to-Speech (TTS)**: Pronounces both the word and the example sentence to reinforce listening.
*   **Design System & Dark/Light Mode**: A warm stone-gray base with a deep ochre-amber accent, set in DM Sans and DM Mono. Supports system preference and manual toggle.
*   **Progressive Web App (PWA)**: Installable on mobile and desktop for a native, full-screen, offline experience.
*   **Local Privacy (IndexedDB)**: All decks and learning progress are stored locally in your browser. No connection is required and nothing is uploaded to any server.
*   **High-Quality CSV Import**: Imports 9-column CSV files that follow the [Data Spec](../SPEC.md), with automatic language detection.

## 📲 Access & Installation

### 1. Web Version (Fastest)
[Open the WordForge Web App](https://shuai-chi.github.io/wordcards/)
*   A pure frontend app. Once loaded it works offline; data lives only in your browser's IndexedDB.

### 2. Mobile Installation (PWA Recommended)
*   **iOS (Safari)**: Tap **Share** → **Add to Home Screen**.
*   **Android (Chrome)**: Tap the menu → **Install App**.

### 3. Local Development
```bash
git clone https://github.com/Shuai-chi/wordcards.git
cd wordcards
npm install
npm run dev
```

## 🛠️ User Guide

### Step 1: Prepare & Import
1.  **Get cards**: Use the ready-made decks in [`sample-decks/`](../../sample-decks) (GRE / TOEFL / High-School CEFR levels), or generate your own CSV following the [Data Spec](../SPEC.md).
2.  **Import**: Click the **Upload** icon on the home screen and select your CSV. The language is detected automatically.

### Step 2: Settings
1.  **Global daily limit**: In **Settings**, set the maximum number of new cards per day across all decks.
2.  **Per-deck limit**: You can also set an individual daily new-card limit for each deck.

### Step 3: Learning (SRS)
The system schedules the next review based on your feedback:
*   **Again (1)**: Forgot completely. The card re-enters learning and reappears soon.
*   **Hard (2)**: Recalled slowly. Shortens the next interval.
*   **Good (3)**: Clear recall. Standard interval growth.
*   **Easy (4)**: Effortless recall. Significantly extends the interval.

### Step 4: Re-practice Today's Cards
After finishing your daily tasks, the start button becomes **"Repeat today"**, letting you consolidate today's cards without affecting the long-term SRS schedule.

## 📂 Project Structure
*   `src/components/`: UI components (Dashboard, LearningView, etc.).
*   `src/lib/`: Core logic (SRS algorithm, CSV parsing, language detection, IndexedDB).
*   `docs/`: Multilingual READMEs and the [Data Spec](../SPEC.md).
*   `prompts/`: AI prompts and format notes for generating your own cards.
*   `sample-decks/`: Ready-to-import sample CSV decks.

## 🛡️ Privacy
WordForge is **privacy-first**: your data never leaves your browser. Note that clearing your browser data will erase your decks and progress, so **keep the original CSV files you imported as a backup**.
