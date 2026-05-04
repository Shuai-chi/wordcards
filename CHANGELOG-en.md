# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v25.6.0] - 2026-05-04

### [New Features & Visual Upgrades]
- **Premium Design System**: Completely revamped color system with a warm stone gray base and deep ochre amber accent (`oklch(52% 0.12 42)`), moving away from the cold tech feel. Upgraded fonts to DM Sans and DM Mono, and fully implemented a 3-layer Dark/Light mode (system preference, manual toggle, `data-theme` attribute).
- **Multilingual Architecture**: Added 8 UI languages (Traditional Chinese, English, Japanese, Korean, German, Spanish, French, Thai) with instant switching.
- **Smart Language Detection**: Automatically identifies the language of a deck upon CSV import based on Unicode characters and headers, adding language-specific filter chips to the Dashboard.
- **Dynamic Flashcard Adaptation**: Implemented exclusive card rendering logic for different languages (e.g., Kana & Kanji for Japanese, grammar gender for German, specific tones for Thai).

### [Documentation & Specification Updates]
- **README Overhaul**: Updated documentation to highlight the new multilingual architecture and design system upgrades.
- **Upgraded Card Specifications (v13.0 Ultimate)**: Synchronized `prompts/SPEC.md` and all AI prompt templates (`*-cards_*.txt`) with the latest `srs-expert` standard.
  - Implemented **Micro-Batching** limits (max 30 words per batch).
  - Added exclusive formatting and anti-regression rules for all supported languages.
  - Introduced **System-level Double-Track** rules to enhance zero-derivation guards and ensure example sentence uniqueness.
- **TTS Fallback Mechanism**: Added a fallback hint in Global Settings for languages like Thai that may lack browser speech synthesis support.

## [v25.5.0] - 2026-04-25

### [Added]
- **WordForge v10.0 Data Standardization**: Implemented new POS format (lowercase with dots, space-separated).
- **Context-Aware UI**: Replaced the "Learning" label on card backs with a beautifully styled "Context Tag" (Academic / Tech, Campus Life, General / Daily).
- **Purple Tag Engine**: Upgraded visual styling for POS tags with automatic splitting and capitalization for multi-POS words.

### [Optimized]
- **Academic Language Policy**: Enforced "No Contractions" rule for `Academic / Tech` context, restoring full forms like `do not` for academic rigor.
- **Workspace Hygiene**: Cleaned up `test-results` and optimized `.gitignore` rules.

## [v25.4.0] - 2026-04-14

### [Added]
- **Deck Selection Optimization**: Added "Select All", "Deselect All", and "Invert Selection" buttons to the Learning Center.
- **State Persistence**: Bulk selection actions are now correctly synced with local storage and persist across app restarts.

## [v25.3.0] - 2026-04-14

### [Added]
- **PWA Support**: Implemented Progressive Web App features, enabling installation on mobile/desktop and providing a fully offline study experience.
- **App Icons**: Added high-quality PWA-specific icons (192px, 512px, apple-touch-icon).
- **Service Worker**: Added service worker for core asset caching and offline navigation fallback.

## [v25.2.0] - 2026-04-14

### [Added]
- **Deck Progress Tracking**: Added per-deck "introduced / total" card counts with a gradient-animated progress bar. Bar color transitions automatically (purple → blue → green) based on completion percentage.

## [v25.1.0] - 2026-04-14

### [Added]
- **Error Diagnostics**: Implemented row-level diagnostic messaging in `csv.ts` that specifies exact line numbers and constraints (length, spacing) when parsing fails.
- **Storage Monitoring**: Enhanced IndexedDB error handling in `App.tsx` and `db.ts` to capture and unpack stringified DOM `Event` objects to expose core reasons (e.g., storage quota exceeded, Private Browsing blocks).

### [Fixed]
- **UI Interaction**: Removed `e.stopPropagation()` on `LearningView` text elements that previously blocked card-flip toggle events.
- **Test Stability**: Resolved flaky Playwright end-to-end tests in `wordforge.spec.ts` by replacing implicit timeouts with explicit `waitFor` UI state resolution.

## [v25.0.0] - 2026-04-12

### [Added]
- **Framework Migration**: Refactored the core application from vanilla JavaScript to a React 19 + TypeScript + Vite SPA architecture.
- **Routing & State Management**: Abstracted UI into independent components (`Dashboard`, `LearningView`, `Modals`) controlled by a top-level state machine.
- **Styling Architecture**: Replaced custom CSS variables with Tailwind CSS v3 for programmatic RWD styling.
- **Build Pipeline**: Configured `.github/workflows/deploy.yml` for automated CI/CD deployments to GitHub Pages.

### [Changed]
- **Storage Layer**: Migrated from `localStorage` to `IndexedDB` to support unconstrained storage size limits and scalable deck management.
- **Algorithm State Initialization**: Updated the SM-2 initialization routine to track `introducedDate` logically, preventing state resets on early session exits.
- **CSV Parser Constraints**: Relaxed legacy custom header validation rules, standardizing to PapaParse default configurations for raw front/back text mapping.

## [v24.1.2] - 2026-04-10

### [Added]
- **File System API**: Expanded CSV import capabilities to accept multiple `File` inputs iteratively via asynchronous batch processing.

## [v24.1.1] - 2026-04-10

### [Added]
- **UX State Indicators**: Embedded configuration limit labels (`Global` vs `Deck`) natively inside the Dashboard component tree.

### [Fixed]
- **State Mutation Leak**: Stopped empty integer strings from coercing logic variables to null properties when customizing card rate limits.

## [v24.1.0] - 2026-04-10

### [Fixed]
- **Audio Thread Leak**: Registered `stopGhostVoice()` execution within transaction `catch` blocks to intercept un-awaited DOM Audio components.
- **AI Prompt Formatting Rules**: Fixed prompt definitions instructing AI to escape double-quotation constraints that corrupted state machine evaluations.
