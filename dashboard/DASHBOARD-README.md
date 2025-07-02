# 🧭 MyContinuum Dashboard (v1.0.0)

This is a self-hosted Nostr dashboard for reading, writing, and managing your content across relays. You can post notes, publish articles, edit locally, and view your profile metadata — all from a sovereign, Dockerized local environment.

> ⚠️ This `dashboard/` directory contains the full MyContinuum v1.0.0 app.  

---

## 🚀 Features in v1.0.0

- ✅ View, create, and edit **notes** (kind 1) and **articles** (kind 30023)
- ✅ Support for **multiple relays**
- ✅ Local-first setup using `identity/local_identity.json`
- ✅ Markdown previews for articles and notes
- ✅ Timezone-aware timestamps, customizable via config
- ✅ Clean link previews for articles (e.g., “View on Primal”)
- ✅ Modals for editing, styled via shared `modal.css`
- ✅ Dockerized and cross-platform (macOS, Windows, Linux)

---

## 📦 Requirements

- [Docker](https://www.docker.com/products/docker-desktop/)
- Optional: [WSL](https://learn.microsoft.com/en-us/windows/wsl/) if on Windows

---

## 🔧 Setup Instructions

1. **Clone this repo** and `cd dashboard/`

2. **Copy the sample identity file**  
   This is required for app configuration.

   ```bash
   mkdir -p data
   cd data
   mkdir -p identity
   cp ../local_identity.json-sample identity/local_identity.json
   ```
3. **Edit your identity file**

- Open data/identity/local_identity.json and set:

```
{
  "npub": "your_npub_here",
  "nsec": "your_nsec_here_or_blank",
  "timezone": "America/Los_Angeles",
  "relays": [
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.primal.net"
  ]
}
```
- Leave nsec blank if you only want read access.
- Timezones must be IANA format (America/New_York, UTC, etc.).
- If you want to express everything in UTC, remove the timezone or set it to "UTC"

4.**Build and run the app**

- set the helper shell scripts executable 

```
cd dashboard
chmod +x *.sh
```
- clear out any stale containers

```
./clean.sh
```

- build the docker image

```
./build.sh
```

- run the app

```
./run.sh
```
5.**Access the dashboard**

- navigate to the dashboard

Open http://localhost:5000

---

## 🖥 Verified Browsers

- ✅ Chrome
- ✅ Firefox
- ✅ Safari
- ✅ Brave
- ✅ Edge (Windows only)

(Tested on macOS and Windows)

---

## 📁 File Structure

```
dashboard/
├── app.py
├── Dockerfile
├── static/
│   ├── style.css
│   └── modal.css
├── templates/
│   ├── index.html
│   ├── timeline.html
│   ├── edit_article.html
│   └── ...
├── utils/
│   └── utils.py
├── data/identity/
│        └── local_identity.json  # (not checked in)
├── local_identity.json-sample
└── README.md  ← you are here
```

---

## ⚠️ Known Limitations

- No built-in media/image upload support (planned for post-1.0.0)
- No relay rebroadcasting or backup checking (future paid tier)
- Basic styling — design polish is ongoing
- Only one user (single npub) supported at a time
- Relays must be manually specified in local_identity.json

---

## 📘 Next Steps (Post 1.0.0)

- Multi-npub support
- Relay rebroadcast/restore tools
- Zaps, reactions, and replies
- Embedded media manager
- Article drafts and scheduled publishing
- Hosted dashboard (optional SaaS tier)

## 🙌 Credits

- Built with love and conviction by Andrew G. Stanton
- With AI-assisted design, iteration, and QA from ChatGPT

