# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-16

First public release.

### Features
- **SRS engine**: A modified SM-2 algorithm with four-button grading (Again / Hard / Good / Easy) and per-day deduplicated statistics.
- **Multilingual architecture**: 8 instantly switchable UI languages (Traditional Chinese, English, Japanese, Korean, German, Spanish, French, Thai), with language-specific card layouts (kana/kanji, grammatical gender, tone, etc.).
- **Automatic language detection**: On CSV import, the deck language is detected from Unicode characters and the header row, with language filters in the Learning Center.
- **Design system & dark/light mode**: A warm stone-gray base with a deep ochre-amber accent, set in DM Sans / DM Mono, with system-preference and manual toggling.
- **Text-to-speech (TTS)**: Reads both the word and the example sentence; shows a hint for unsupported languages.
- **PWA offline support**: Installable on mobile/desktop, with a service worker caching core assets for offline use.
- **Local storage (IndexedDB)**: All decks and progress are kept locally in the browser.

### Data Specification
- Established the 9-column CSV standard (`word, ipa, pos, inflections, derivatives, definition, example, collocations, context_type`), with `context_type` using CEFR levels. See [docs/SPEC.md](../SPEC.md).
- Bundled sample decks in `sample-decks/` (GRE, TOEFL, High-School CEFR levels).

### Documentation
- Reorganized the Chinese and English READMEs and the data specification, and removed internal development files.
