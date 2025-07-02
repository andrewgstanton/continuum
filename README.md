# 🌐 Continuum

> Reclaim your digital life. One post at a time.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![GitHub Pages](https://img.shields.io/website?down_color=lightgrey&down_message=offline&up_color=brightgreen&up_message=online&url=https%3A%2F%2Fandrewgstanton.github.io%2Fcontinuum)

**Continuum** is a self-hosted, Bitcoin-aligned dashboard that ingests, organizes, and visualizes your Nostr content locally — with full support for notes, articles, Markdown, and offline persistence.

Whether you're a writer, builder, or Bitcoiner, Continuum helps you **own your signal**, **trace your timeline**, and **future-proof your work** — without relying on a third-party client.

---

## ✨ What’s Working in v1.0.0

- ✅ Self-hosted Nostr dashboard (in `dashboard/`)
- ✅ Note and article editing with full Markdown support
- ✅ Auto-generated titles for notes
- ✅ SQLite persistence with relay fallback
- ✅ Timezone-aware rendering via `local_identity.json`
- ✅ Dockerized for macOS, Windows (via WSL2), and Linux
- ✅ Clean UI with mobile-friendly layout and relay-aware views

---

## 📂 Project Structure

- `dashboard/` – The complete Nostr dashboard app
  - See [`dashboard/DASHBOARD-README.md`](dashboard/DASHBOARD-README.md) for full setup
  - See [`dashboard/WINDOWS.md`](dashboard/WINDOWS.md) for Windows-specific setup
- `scripts/` – (Planned) content import/export tools
- `docs/` – Static HTML pages or GitHub Pages build (optional)

---

## 🚧 Future Vision

This repo is part of a broader vision to:

- 📥 Import data from:
  - Twitter/X, Facebook, LinkedIn, YouTube (via Takeout)
- 🧠 Normalize and classify across platforms
- ⚡ Export insights and content back to Nostr or anywhere
- 🪙 Integrate Bitcoin-native zaps, tips, and publishing tools

If you're building toward **self-sovereign content infrastructure**, you're in the right place.

---

## 🛠️ Getting Started

```bash
git clone https://github.com/andrewgstanton/continuum.git
cd continuum/dashboard
./run.sh
