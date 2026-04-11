# WordForge (Vocabulary SRS) 🧠

WordForge is a fully localized, privacy-first Spaced Repetition System (SRS) designed for vocabulary mastery, built with the power of the legendary SM-2 algorithm. 
It boasts an **"Accountless, Serverless, 100% Local Hardware Storage"** extreme privacy experience. You can seamlessly enjoy native-app-like flashcard reviews on any modern browser, including your mobile devices.

## 🌟 Core Features

- **Powerful Algorithmic Engine (SM-2)**: The system calculates the exact optimal future review date based on the difficulty and review history of each individual card, effectively flattening your brain's forgetting curve.
- **Full Local Persistence (IndexedDB)**: Your data is entirely stored within your local browser (supporting hundreds of MBs of storage), immune to network outages and data leaks.
- **Flexible Default Limits**: Supports intersecting constraints such as "Global Daily Limits" alongside specific deck allocation parsing.
- **Perfect Interruption Memory**: If you close the app mid-session, any cards you struggled with (Learning Cards) will strictly remain in your queue, bypassing global limits, until you truly master them.
- **Defensive Bulk Import**: Capable of concurrently importing massive CSV files. The system validates cards in an isolated environment, ensuring bad data never slows down or corrupts your precious database.
- **Mobile-First RWD**: Dynamically compiled through Tailwind CSS v3, the layout adapts flawlessly to any screen size (even the iPhone SE), delivering pristine UI/UX operational fluidity.

## 🚀 Modern Tech Stack

After countless hardcore iterations, WordForge has fully detached from its vanilla prototype script, evolving into a modernized engineering matrix:
*   **Frontend Framework**: React 19 + TypeScript + Vite
*   **UI/Styling**: Tailwind CSS v3
*   **Icons**: Lucide-React
*   **Local Database**: Native IndexedDB API Wrappers (No ORM overhead)
*   **Parsing Engine**: PapaParse

## ✅ Deployment (Mobile Access)

WordForge is equipped for **serverless hosting on GitHub Pages**!
Simply configure your GitHub repo and let the included `deploy.yml` auto-trigger GitHub Actions to build and deploy everything for you.

Once deployed, simply open `https://[your_username].github.io/wordcards/` on your mobile Safari/Chrome, tap "Add to Home Screen", and it instantly transforms into your personal PWA vocabulary-mastering artifact!

## 📜 Version History
Please read our [CHANGELOG.en.md](./CHANGELOG.en.md) to understand how this system evolved from a fragile logic script into the flawless, industrial-grade fortress it is today, through extreme edge-case pressure testing.
