# WordForge — Industrial-Grade Local SRS Learning System

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)
![IndexedDB](https://img.shields.io/badge/IndexedDB-007ACC?style=for-the-badge&logo=sqlite&logoColor=white)

WordForge is a **fully local, offline Spaced Repetition System (SRS)** built to withstand extreme edge-case environments. Forged through 24 versions of high-pressure blind testing and architectural refinement, it delivers an impeccable, zero-latency immersive learning experience. Features include a pure atomic write architecture, hardware audio constraint bypassing for iOS, and robust cross-tab sync capabilities.

---

## ✨ Core Features

- 🔒 **100% Offline & Local**: Pure Vanilla JS architecture. Absolutely no backend required. Leverages IndexedDB for high-capacity, concurrent, and atomic persistent storage.
- 🚀 **Optimistic UI (Zero Latency)**: Actions instantly update the UI and trigger text-to-speech audio, while database writes happen safely in the background. Zero-millisecond perception delay.
- 🤖 **Resilient CSV State Machine**: A proprietary HTML5 CSV state-machine parser handles the most chaotic AI-generated text files, safely isolating bad quotes, internal line breaks, and missing columns without breaking.
- 🛡️ **Deep Resource Protection**: Built-in cross-tab synchronization locks, iOS hardware audio silent-curse workarounds, Rollback silent-protection, and true Fisher-Yates cryptographic shuffling.
- 🧠 **Refined SM-2 Algorithm**: Strict subdivision of `New`, `Learning`, `Relearning`, and `Graduated` lifecycle states. Features human-centric "Hard" rating decay mitigations preventing infinite interval loops.

---

## 📖 User Guide

### 1. Preparing Flashcard Data (Via AI Generation)
To guarantee system stability, WordForge employs an aggressive "Validation Layer". Only perfectly formatted cards can enter your database.
1. Copy the instructions inside `prompts/english-cards_en.txt` and paste them into your favorite AI (ChatGPT, Claude, etc.).
2. The AI will strictly output standard CSVs with double-quote protection mapping directly to our frontend requirements (Part of Speech, Definition, Example, and Collocations).

### 2. Launching & Importing
1. Open **`wordforge.html`** in any modern web browser.
2. In the "Learning Center" dashboard, drag and drop your AI-generated `.csv` file into the upload zone (supports selecting or dropping multiple files at once for bulk import).
3. The system parses the file. Any corrupted rows are automatically isolated and discarded, and the valid words become a newly created "Deck".

### 3. Personalizing Your Study Rhythm
- **Global Daily Limits**: Click the ⚙️ gear icon in the top right to set your global threshold (the absolute maximum "energy" or words you can review in a single day across all decks).
- **Deck-Specific Flow**: Check the checkboxes next to the decks you want to review today. Click the ✏️ pencil icon next to a deck to throttle its daily "New Cards" injection limit (you can even set it to 0 for a review-only session).

### 4. Immersive Practice (Keyboard Shortcuts)
Once you've selected your decks, click "Start Practice" (開始練習) to enter distraction-free mode.

| Action | Shortcut Key | Description |
| :--- | :--- | :--- |
| **Flip Card** | <kbd>Spacebar</kbd> | Reveals the 4-line breakdown on the back and triggers the native TTS audio pronunciation. |
| **Replay Audio** | <kbd>Enter</kbd> | Re-reads the current word aloud. |
| **Example Audio** | `Mouse Click` | Click the 🔊 volume icon next to the example sentence on the back to read it aloud. |
| **Again** | <kbd>1</kbd> | Completely forgot. Interval resets, you will see this card again today until memorized. |
| **Hard** | <kbd>2</kbd> | Barely remembered. Lightly pushes the interval forward. |
| **Good** | <kbd>3</kbd> | Got it! Graduates the card (or progresses interval) multiplying interval by roughly 1.2x to 2.5x. |
| **Easy** | <kbd>4</kbd> | Too easy. Grants the maximum interval bonus to drastically reduce encounter frequency. |

> 💡 **Tip:** If a rare database write failure occurs mid-session, WordForge's "Rollback Silent Protection" immediately reverts the card state. No ghost audio or screen freezing will happen; it will safely wait for you to choose an action again.

---

## 🛠️ Architecture & Development Files

The system bundles all logic closely together across a minimal footprint:
- `wordforge.html`: The core standalone application (HTML/CSS/Vanilla JS, internal CSV state machine, and IndexedDB controller).
- `prompts/english-cards_en.txt`: The definitive prompt constraint guide ensuring AI models output 100% parseable standard CSVs.
- `CHANGELOG.en.md`: The Architect's Ledger—an epic changelog documenting the 24-version history of surviving hardware physics and software chaos.

---
*Created with extreme engineering rigor. Say goodbye to forgotten words.*
