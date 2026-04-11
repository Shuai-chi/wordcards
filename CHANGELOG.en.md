# WordForge SRS Upgrade History (Changelog)

This is not just an update log—it's an epic tale of how this system evolved **from a fragile script into an impregnable, industrial-grade fortress under extreme pressure testing.** This record follows the standard Changelog format, documenting every architectural refinement and defense network upgrade.

---

## [v25.0.0] - Era VII: The React Renaissance & RWD Expansion

### Added
- **Full React Modularization**: Completely abandoned the colossal single-file HTML structure. Introduced a modern React + Vite + TypeScript architecture, decoupling all UI into highly maintainable `Dashboard`, `LearningView`, and respective Modals.
- **Tailwind v3 Visual System**: Replaced the primitive CSS variable system with Tailwind CSS v3, achieving the ultimate responsive design (RWD) for mobile-first fluid adaptability.
- **Serverless Deployment Ready**: Added `deploy.yml` to realize one-click CI/CD automated builds and cloud publishing via GitHub Actions to GitHub Pages.
- **Local State Persistence**: Introduced `localStorage` to memorize the user's "checked deck" interactions, ensuring deck selections do not mysteriously vanish when returning to the dashboard after a session.

### Changed
- **Algorithm Quota Refactoring**: Completely rewrote the judging logic for "Daily New Card Quotas". The system now strictly tracks `introducedDate`, permanently closing the loophole where exiting mid-session and returning caused an endless distribution of new cards.
- **Unfinished Card Enforcement**: Even if you leave mid-session, any card deemed "Urgent/Learning" today will implicitly bypass daily limits and return in your next session. You can no longer escape difficult vocabulary hurdles.
- **Free-Will Imports**: Completely decoupled the rigorous old CSV formatting verifications (e.g., forcing phonetic prefixes). As long as PapaParse can cleanly severe a front and back string pair, the system unconditionally imports the flashcard, establishing 100% backward compatibility for all legacy word libraries.

---

## [v24.1.2] - Bulk Import

### Added
- **Multi-File Bulk Upload**: Added `multiple` support to the CSV upload zone. Refactored the drag-and-drop and the file selection event listeners by introducing sequential asynchronous loops. The system now allows the drag or selection of multiple CSV files simultaneously, seamlessly importing multiple decks at once and exponentially increasing the efficiency of building your vocabulary library.

---

## [v24.1.1] - UX Polish

### Added
- **Visual Bound Cues**: Added a permanent UX hint underneath the deck list explaining the localized "Daily New Card Limit" per deck. Also refined the global limit's label to eliminate confusion between global total quotas and deck-specific injection limits.

### Fixed
- **Zero-Value Protection**: Fixed a logical flaw where users setting a deck's "New Card Limit" to `0` would falsely trigger the fallback parser value of `5`, fully restoring the freedom to choose "review-only (0 new cards)" mode for chosen decks.

---

## [v24.1.0] - Ultimate Defense Hotfix

### Fixed
- **Rollback Phantom Voice Vulnerability**: Fixed an issue where the `rateCard` function failed to intercept the precalculated TTS audio placed in the queue when a database write failure triggered a rollback. Added `stopGhostVoice()` inside the Catch block to implement true silent protection.
- **Prompt Data Destruction Vulnerability**: Fixed the over-restrictive double-quote rule inside the `english-cards` AI prompt. Changed to "Mandatory Outer Wrapping, Absolute Internal Ban" to prevent an overly compliant AI from stripping the outer double-quotes necessary for wrapping multi-line CSV cells, which previously caused the State Machine to crash and discard 100% of generated cards.

---

## [v24.0.0] - Era VI: The Final Shift

### Added
- **Global Consumption Metric (Single Source of Truth)**: Redesigned the DB Schema by adding `uniqueCards` (unique cards touched today) to `dailyReport` as the unified system-wide budget benchmark.

### Fixed
- **Asynchronous I/O Tsunami**: Obsoleted the brute-force method of tallying consumption limit inside frontend loops. Utilizing the global `uniqueCards`, we completely resolved the issue where selecting multiple decks and altering the budget triggered massive full-table DB scans, causing low-end mobile devices to freeze or crash.
- **Parallel Budget Temporal Rift**: Fixed an issue where users switching decks would bypass global budget checks, unintentionally flooding their day with an unmanageable amount of flashcards above their physical limit.

---

## [v15.0 - v22.1] - Era V: Modular Convergence & Atomization

### Added
- **Pure Function State Machine**: Introduced the `appState.currentView` workspace, severing the highly dangerous tight coupling between business logic and the DOM (`document.getElementById`).
- **Single Exception Outlet**: Consolidated `tx._manualError` as the singular exception-catching exit point for all local database transactions.

### Changed
- **Historic Database Migration**: Completely removed `dailyReport` from LocalStorage, merging it into the `reports` store of IndexedDB.
- **Hardware Audio Awakening Mechanism**: Removed the `volume = 0` zero-volume trap. Replaced it by playing an empty string during the unlock phase to cleanly awaken iOS hardware audio tracks.

### Fixed
- **LocalStorage Race Condition Extreme**: Solved the "Temporal Rift" issue that occurred even with locks in place. Bound the report stats and flashcard updates into the exact same transaction, achieving **100% Absolute Atomic Writes**.
- **Double Reject Anti-Pattern**: Fixed an architectural flaw where `onerror` and `onabort` in IndexedDB transactions would fight for Reject privileges, triggering V8 engine warnings.

---

## [v10.0 - v14.0] - Era IV: Extreme Physical Blind Tests

### Added
- **Fisher-Yates Cryptographic Shuffling**: Replaced the natively weak `Math.random() - 0.5` sorting with a proprietary shuffling mechanism, ensuring absolute true randomness and eliminating context-dependent memory caused by word clustering.

### Fixed
- **Echoes of the Dead**: Implemented `beforeunload` to forcibly kill the iOS audio thread that would otherwise continue screaming in the background when the app was closed or switched.
- **Cross-Tab Deadlock**: Bound `db.onversionchange` to automatically sever connections, resolving issues where old tabs would deadlock the entire system during database version upgrades.
- **Toxic NaN Spreading**: Introduced `(Number(val) || 0) + 1` for forced type purification, fixing the permanent `NaN` click-count error caused by memory cache corruption.

---

## [v7.0 - v9.0] - Era III: Environment Showdowns & Persistence

### Added
- **Optimistic UI**: Renders the screen and triggers voice instantly upon clicking, pushing the sluggish database writes into the background to accomplish zero-millisecond operational latency.
- **Real-time Sync Lock**: Implemented `visibilitychange` event listeners across tabs to seamlessly update multi-tab states in real-time.

### Fixed
- **Orphaned Card Leakage**: Implemented unified atomic operations covering `transaction(['decks','cards'])` to ensure life-and-death synchrony, resolving ghost database junk created when deck deletions were interrupted mid-way.
- **iOS Silent Curse**: Bypassed iPhone OS's underlying physical restrictions which forcibly stripped audio rights by interpreting audio following a database `await` as "not a direct user click".

---

## [v6.0 - v6.5] - Era II: Algorithms & Defense Grids

### Added
- **Validation Layer**: Built an absolutely sealed database moat where all non-compliant dirty CSV data is instantly discarded upon import.
- **Timezone Calibration**: Introduced a `04:00 AM` logical date-rollover line (calibrated globally with a 4-hour offset).

### Fixed
- **Poison Card Injection**: Resolved a critical vulnerability where importing poorly formatted data while defenseless would paralyze the entire core database.
- **Stagnation Black Hole**: Implemented `Math.max(interval + 1)`, destroying the interval stagnation infinite loop caused by `Math.round(2 * 1.2) = 2` when repeatedly clicking Hard.

---

## [v1.0 - v5.0] - Era I: Chaos & Formation

### Added
- **Proprietary CSV State Machine**: Abandoned native string splitting and hand-coded a "State Machine" double-quote parsing logic, establishing absolute separation of responsibilities between frontend and backend.

### Fixed
- **BOM Contamination**: Introduced `charCodeAt(0) === 0xFEFF` to forcibly strip invisible characters generated by Excel, fixing the issue where the first card could never be parsed correctly.
- **RFC 4180 Disintegration**: Defended against spontaneous line breaks and internal commas generated by AI, fixing the early disaster of flashcards being shredded by basic `split(',')` functions.

---

> **The Architect's Note:**
> From v1.0 to the current version, this system has shed all remnants of naivety and reliance on luck or third-party packages. These 24 iterations and records stand as a testament to hardcore software engineering frontline battles. Without the extreme demands and destructive testing of the early phases, most of the disasters mentioned here would have become unsolvable cold cases, silently driving away users in a production environment.
