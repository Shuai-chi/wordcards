# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v25.1.0] - 2026-04-14

### Added
- **Error Diagnostics**: Implemented row-level diagnostic messaging in `csv.ts` that specifies exact line numbers and constraints (length, spacing) when parsing fails.
- **Storage Monitoring**: Enhanced IndexedDB error handling in `App.tsx` and `db.ts` to capture and unpack stringified DOM `Event` objects to expose core reasons (e.g., storage quota exceeded, Private Browsing blocks).

### Fixed
- **UI Interaction**: Removed `e.stopPropagation()` on `LearningView` text elements that previously blocked card-flip toggle events.
- **Test Stability**: Resolved flaky Playwright end-to-end tests in `wordforge.spec.ts` by replacing implicit timeouts with explicit `waitFor` UI state resolution.

---

## [v25.0.0] - 2026-04-12

### Added
- **Framework Migration**: Refactored the core application from vanilla JavaScript to a React 19 + TypeScript + Vite SPA architecture.
- **Routing & State Management**: Abstracted UI into independent components (`Dashboard`, `LearningView`, `Modals`) controlled by a top-level state machine.
- **Styling Architecture**: Replaced custom CSS variables with Tailwind CSS v3 for programmatic RWD styling.
- **Build Pipeline**: Configured `.github/workflows/deploy.yml` for automated CI/CD deployments to GitHub Pages.

### Changed
- **Storage Layer**: Migrated from `localStorage` to `IndexedDB` to support unconstrained storage size limits and scalable deck management.
- **Algorithm State Initialization**: Updated the SM-2 initialization routine to track `introducedDate` logically, preventing state resets on early session exits.
- **CSV Parser Constraints**: Relaxed legacy custom header validation rules, standardizing to PapaParse default configurations for raw front/back text mapping.

---

## [v24.1.2] - 2026-04-10

### Added
- **File System API**: Expanded CSV import capabilities to accept multiple `File` inputs iteratively via asynchronous batch processing.

---

## [v24.1.1] - 2026-04-10

### Added
- **UX State Indicators**: Embedded configuration limit labels (`Global` vs `Deck`) natively inside the Dashboard component tree.

### Fixed
- **State Mutation Leak**: Stopped empty integer strings from coercing logic variables to null properties when customizing card rate limits.

---

## [v24.1.0] - 2026-04-10

### Fixed
- **Audio Thread Leak**: Registered `stopGhostVoice()` execution within transaction `catch` blocks to intercept un-awaited DOM Audio components.
- **AI Prompt Formatting Rules**: Fixed prompt definitions instructing AI to escape double-quotation constraints that corrupted state machine evaluations.

---

## [v24.0.0] - Prior Architectural Shifts

### Changed
- **Aggregate Logging Structure**: Shifted metric accumulation logic to single source of truth (`uniqueCards` per daily report block) to optimize asynchronous iteration counts.

### Fixed
- **Data Races**: Unified IndexedDB `transaction(['decks','cards'])` structures to execute atomic relational commits, addressing previous entity-relationship orphans.
- **Memory Addressing**: Implemented strict numeric typecasting implementations (`Number(val) || 0 + 1`) natively mitigating cascading `NaN` exceptions during object serialization.
- **iOS DOM Event Rules**: Migrated Audio initialization functions to fire implicitly alongside User Event Listeners (`touchstart`, `click`), bypassing explicit strict Audio blocking protocol.
- **Index Corruptions**: Inserted Byte Order Mark (`BOM 0xFEFF`) filters in the parsing layer neutralizing Microsoft Excel invisible string encodings.
