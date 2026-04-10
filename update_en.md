# WordForge SRS Upgrade History (Changelog)

This is not just an update log—it's an epic tale of how this system evolved **from a fragile script into an impregnable, industrial-grade fortress under extreme pressure testing.** This record follows the standard Changelog format, documenting every architectural refinement and defense network upgrade.

---

## [v24.1.0] - Ultimate Defense Hotfix

### Fixed
- **Rollback Phantom Voice Vulnerability**: Fixed an issue where the `rateCard` function failed to intercept the precalculated TTS audio placed in the queue when a database write failure triggered a rollback. Added `stopGhostVoice()` inside the Catch block to implement true silent protection.
- **Prompt Data Destruction Vulnerability**: Fixed the over-restrictive double-quote rule inside the AI prompt. Changed to "Mandatory Outer Wrapping, Absolute Internal Ban" to prevent an overly compliant AI from stripping the outer double-quotes necessary for wrapping multi-line CSV cells, which previously caused the State Machine to crash and discard 100% of generated cards.

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
