# WordForge SRS

A local-first Spaced Repetition System (SRS) client powered by the SM-2 algorithm, built with a modern React architecture.

## 📌 Technical Specifications

- **Architecture**: Single Page Application (SPA), Mobile-First UI
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v3, Lucide-React
- **Storage Layer**: IndexedDB (Native API wrapper) for zero-dependency local persistence
- **Data Parsing**: PapaParse (Client-side CSV parsing)
- **Offline Support**: Progressive Web App (PWA) with installable home screen icon and offline functionality
- **Deployment**: GitHub Actions CI/CD → GitHub Pages

## ✨ Core Functionality

- **SM-2 Algorithm Integration**: Dynamically calculates spaced intervals based on cognitive interaction histories (`hard`, `good`, `easy`, `again`).
- **Zero-Backend Architecture**: All CRUD operations resolve inside the browser storage constraint without establishing backend communication endpoints.
- **Defensive Data Input Layer**: Features a robust formatting validation system processing bulk CSV uploads without compromising state structure or runtime stability.
- **Bulk Selection Controls**: Added "Select All", "Deselect All", and "Invert Selection" for rapid study plan adjustments.
- **Dual quota control**: Global daily new card limits and individual deck quotas.
- **PWA Offline Mode**: Built-in Service Worker for asset caching, enabling stable operation in offline environments.
- **Learning Queue Isolation**: Cards in 'Learning' state are retained until mastered, bypassing daily limits.

## 🚀 Setup & Build

Install dependencies:
```bash
npm install
```

Start the Vite development server:
```bash
npm run dev
```

Run test suite:
```bash
npx playwright test
```

## 🏗️ CI/CD Deployment

The repository utilizes `.github/workflows/deploy.yml` triggered upon pushes to the `main` branch.
Assets will be bundled with standard paths built off the `/wordcards/` endpoint.

## 📜 Documentation

- Version history: [CHANGELOG.en.md](./CHANGELOG.en.md)
- 中文版: [README.md](./README.md)
