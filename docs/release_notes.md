# Continuum — What's New

## v1.6.7.6 - May 11, 2026

### Highlights

- Added **PGP, Bitcoin, SSH, and Nostr Signing Controls**

Continuum can now manage multiple signing identity types directly from within the local workspace.

This includes support for:

- PGP signing identities
- Bitcoin signing identities
- SSH signing identities
- Nostr signing identities

These signing controls make Continuum a more complete sovereign authoring and signing workspace that:

- Works offline
- Is platform independent
- Is protocol independent
- Separates authorship from distribution
- Allows locally signed artifacts to exist before publication

- Added support for **Signed Artifact Bundles**

Users can now package signed artifacts together with their associated proofs and metadata into portable verification bundles.

This includes:

- Signing and packaging artifacts locally
- Verifying bundles directly in the browser
- JavaScript-only verification tools
- Offline-capable verification
- No server-side verification required

Bundle verification currently supports:

- Nostr verification
- PGP verification
- SSH verification
- Bitcoin verification

- Added **Vault** support

Users can now create, unlock, lock, and delete password-protected local vaults used for storing sensitive information.

Vault support currently includes:

- Creating and deleting encrypted vault databases
- Password-protected vault unlocking
- Full CRUD operations while unlocked
- Secure local storage for sensitive information
- Workspace backup and restore support
- Vault-aware workspace clearing/reset behavior

The vault is intended for sensitive local information such as:

- Secure notes
- Passwords
- Credentials
- Recovery information
- Sensitive workspace metadata

- Better handling of detecting **offline** status

Continuum now handles offline detection more reliably across different environments and unstable network conditions.

### Coming Next

- Relay list editing for identities

---

## v1.6.7.5 - April 16, 2026

### Highlights

- Added **export workspace** (creates a full backup zip)
- Added **import workspace** (`continuum-backup.zip`)
- Added **clear workspace** (reset your environment completely)

These make it possible to move your full Continuum workspace between machines and environments.

- Improved Mac install experience:
  - DMG now includes an Applications shortcut for drag-and-drop install
- Simplified downloads page:
  - Direct download links for Mac (.dmg) and Windows (.exe)
  - Reduced confusion around release folders and file selection

---

## v1.6.7.4 - April 13, 2026

### Highlights
- Add NSEC + validate to existing identities as part of edit flow.
- timezone editing in idendity edit flow
- on creating new identities select local timezone if available

---

## v1.6.7.3 - April 12, 2026

### Highlights
- Adjusted UI language in dashboard slightly.
- Fixed typos in last release docs.
- Identiy edit flow supported -- you can now rename or delete an identity.

---

## v1.6.7.2 - April 11, 2026

### Highlights
- Added a new **Concepts & FAQs** page to explain core Continuum terms and identity flows more clearly.
- Improved UI language across the app to better reflect Continuum’s local-first model of identities, authoring, and publishing.

---

## v1.6.7.1 - April 10, 2026

### Highlights
- added release notes from v1.5.
- added script to run app in python virtual environment (./run_local.sh) for linux/posix environments (also works in MacOS).
- added package script to create a local version that uses ./run_local , in addition to native mac, windows and docker releases.

---

## v1.6.7 - April 9, 2026

### Highlights
- Native Mac app (.app zipped and .dmg) signed + notarized.
- Native Windows build updated in sync with mac builds.
- Docker build aligned with unified code base.
- packaging improvements.
- build script cleanup.
- unix timestamp formatting issue resolved (causing an error in Windows pyInstaller).
- reliably launch windows.exe when opening, killing prior process if used.



---

## v1.6.6 - April 8, 2026

### Highlights
- Native Mac app (.app zipped and .dmg) signed + notarized.

---

## v1.6.5 - April 7, 2026

### Highlights
- Native Mac app will kill prior continuum process if running.
- auto launch to browser (127.0.0.1:5000).

---

## v1.6.4 - April 7, 2026

### Highlights
- Native Mac app (.app zipped and .dmg) supported.

---

## v1.6.3 - April 7, 2026

### Highlights
- explicit docker and mac packaging.

---

## v1.6.2 - April 6, 2026

### Highlights
- fix stale websocket connections in relay manager.

---

## v1.6.1 - April 1, 2026

### Highlights
- initial mac and windows native builds.

---

## v1.6.0 - March 18, 2026

### Highlights
- added event scheduling.
- added relay manager.
- checks for when internet is unavailable -- publishing buttons and actions disabled (signing is still enabled).

---

## v1.5.0 - Feb. 14, 2026

### Highlights
- first docker build deployed for download.
