# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
