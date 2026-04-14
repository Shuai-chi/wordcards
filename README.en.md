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

## 📲 PWA Installation Guide (Web App)
For the best user experience (full-screen mode, faster startup), it is recommended to install this application as a Web App.

### 🍎 iPhone / iPad (iOS)
- **Safari Browser**: 
    1. Tap the **"Share"** button 📤 at the bottom.
    2. Scroll up in the menu and select **"Add to Home Screen"**.
    3. Tap "Add" in the top right to complete the setup.
- **Chrome Browser**:
    1. Tap the **"Share"** icon on the right side of the address bar.
    2. Select **"Add to Home Screen"** and follow the prompts.

### 🤖 Android
- **Google Chrome**:
    1. Tap the three-dot menu **(⋮)** in the top right.
    2. Select **"Install app"** or **"Add to Home screen"**.
    3. Follow the dialog instructions to complete the installation.

### 💻 Desktop
- **Chrome / Edge**: 
    1. In the address bar, click the **"Install"** icon (monitor and arrow icon).
    2. Click "Install" in the popup window.

## 📤 How to Import Vocabulary
WordForge is local-first. Due to the minimalist design, the import button is located in the top-right corner of the dashboard.

![UI Guide](./public/docs/ui-guide.png)
*The highlighted area shows the **Import CSV** button location.*

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
