# Continuum (Testing Release)

Continuum is a local-first publishing and identity environment built around
self-custody, durable authorship, and Nostr-native workflows.

This package contains a Dockerized runtime environment so the system can be
started quickly without requiring source installation.

---

## Quick Start

1. Install **Docker Desktop** and make sure it is running.
2. Extract the Continuum package.
3. Run the startup script for your platform:

### Mac / Linux:

```
./run.sh
```

### Windows

Start a **WSL terminal**, then run:

```
./run.sh
```

(See `README_WINDOWS.md` for the full setup instructions.)

---

### Access the dashboard

Open your browser and navigate to:

```
http://127.0.0.1:5000

```

---

### Running on a different port

You can run Continuum on a different port by setting the `PORT` variable.

Example:

```
PORT=8000 ./run.sh
```

Then open:

```
http://127.0.0.1:8000
```

Note: Some browsers block certain ports (for example `6000`).  
If a port does not work in the browser, choose another such as `5050`, `8000`, or `8080`.

---

## Installation

Choose your platform:

- Mac → README_MAC.md
- Windows → README_WINDOWS.md

---

## Security

Continuum is **local-first**.

Your keys remain under your control. Do not share private keys.

---

## Verify download integrity

Before extracting, verify the SHA256 checksum included with the download.

---

## Status

This is a testing release shared with early users and collaborators.

---

## Open Source Roadmap

Continuum is currently distributed as a packaged release while the project is still evolving.

The long-term plan is to open source the platform once it reaches a sustainable stage of development.

In the meantime, early users are helping shape the architecture and workflow.

---

## Contact

Andrew G. Stanton  
Email: andrewgstanton@gmail.com  

Nostr:
npub19wvckp8z58lxs4djuz43pwujka6tthaq77yjd3axttsgppnj0ersgdguvd

Lightning / NIP-05:
andrewgstanton@primal.net
