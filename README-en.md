# WordForge - High-Quality English Flashcards 🚀

A minimalist flashcard system designed for advanced English learners. Features PWA support, custom CSV imports, and a precise SRS (Spaced Repetition System) mechanism.

## 📲 Access & Installation

### 1. Web Version (Fastest)
This is a pure frontend application. You can use it directly via the deployed URL.
*   **Offline Support**: Once loaded, it works without an internet connection.
*   **Data Privacy**: All flashcards and progress are stored locally in your browser's IndexedDB. No data is uploaded to any server.

### 2. Mobile Installation (PWA Recommended)
For the best experience (full screen, smoother voice playback), it is highly recommended to install it as a **PWA**:
*   **iOS (Safari)**: Tap the "Share" button -> Select **"Add to Home Screen"**.
*   **Android (Chrome)**: Tap the menu icon -> Select **"Install App"**.

### 3. Local Development
1. `git clone https://github.com/your-repo/wordforge.git`
2. `npm install`
3. `npm run dev`

---

## 🛠️ User Guide

### Step 1: Prepare & Import
1.  **Generate Cards**: Follow the [Card Specifications & AI Prompts](./prompts/SPEC.md) to generate high-quality CSV files.
2.  **Import**: Click the **"Upload"** icon on the home screen and select your CSV files.

### Step 2: Settings
1.  **Global Daily Limit**: Click "Settings" to set the maximum number of new cards across all decks per day.
2.  **Per-Deck Limit**: You can set individual new card limits for each deck (e.g., 20 for Tech, 10 for Daily).

### Step 3: Learning (SRS Mechanism)
The system schedules the next review based on your feedback:
*   **Again (1)**: Completely forgot. The card enters the re-learning phase and will reappear soon.
*   **Hard (2)**: Known but slow recall. Shortens the next review interval.
*   **Good (3)**: Clear recall. Uses standard interval growth.
*   **Easy (4)**: Effortless recall. Significantly extends the next review interval.

### Step 4: Re-practice Today's Cards
If you've finished your daily tasks but want to review more:
*   The start button will change to **"Re-practice Today's Cards"**. This allows you to consolidate what you learned today without affecting the long-term SRS schedule.

---

## 📂 Project Structure
*   `src/components/`: UI components (Dashboard, LearningView).
*   `src/lib/`: Core logic (SRS algorithm, DB operations).
*   `prompts/`: AI prompts and CSV format specifications.

---

## 🛡️ Privacy
WordForge is a **"Privacy-First"** tool. Your data never leaves your browser. Please remember to back up your data by exporting your CSVs regularly.
