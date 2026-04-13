# WordForge SRS

A local-first Spaced Repetition System (SRS) client powered by the SM-2 algorithm, built with a modern React architecture.

## 📌 Technical Specifications

- **Architecture**: Single Page Application (SPA), Mobile-First UI
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v3, Lucide-React
- **Storage Layer**: IndexedDB (Native API wrapper) for zero-dependency local persistence
- **Data Parsing**: PapaParse for local client-side CSV processing
- **Deployment**: Automated CI/CD to GitHub Pages via GitHub Actions

## ✨ Core Functionality

- **SM-2 Algorithm Integration**: Dynamically calculates spaced intervals based on cognitive interaction histories (`hard`, `good`, `easy`, `again`).
- **Zero-Backend Architecture**: All CRUD operations resolve inside the browser storage constraint without establishing backend communication endpoints.
- **Defensive Data Input Layer**: Features a robust formatting validation system processing bulk CSV uploads without compromising state structure or runtime stability.
- **Granular Quota Control Systems**: Embeds configurations to enforce global unique daily thresholds separately from individual deck-specific deployment parameters.
- **Unresolved Queue Isolation**: Prevents daily session completion validation until the `Learning Cards` strict queue clears.

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
Full version history configuration is available under the [CHANGELOG.md](./CHANGELOG.md).
