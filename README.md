# Management App

A personal productivity desktop app built with **Tauri 2**, **React**, **TypeScript**, and **SQLite**. Manage tasks, projects, goals, and ideas all in one place which is stored locally on your machine.

---

## Features

### 🏠 Home
- Overview of all your tasks with priority and due date
- Favourited projects shown as quick-access cards
- Add tasks with priority, due date, description, and project assignment
- Collapsible sections for pending and completed tasks

### 📥 Capture
- Frictionless brain dump capture anything instantly
- Triage items into tasks or goals with inline forms
- Keep or dismiss items to clear your inbox
- Processed items archived in a collapsible section

### 📁 Portfolios
- Grid view of all your projects
- Per-project task lists with full task management
- Favourite projects for quick sidebar access
- Colour-coded project cards

### 🎯 Goals
Three goal types, each with their own tracking mechanic:

- **Long Term** — milestone checklist, progress auto-calculates from completed milestones
- **Financial** — savings progress bar with current/target amounts, click to update saved amount
- **Personal** — date-driven progress bar that auto-fills based on time elapsed between start and end date

Each goal has a detail page with a full notes/updates log so you can track your journey over time.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 |
| Frontend | React 18 + TypeScript |
| Styling | CSS custom properties (no framework) |
| Database | SQLite via sqlx (direct, no plugin) |
| Routing | React Router (HashRouter) |
| Build tool | Vite |

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (stable)
- [Tauri CLI prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites) for your platform

### Run locally

```bash
# Install frontend dependencies
npm install

# Start dev server (hot reload)
npm run tauri dev
```

### Build for production

```bash
npm run tauri build
```

Output is in `src-tauri/target/release/bundle/`.