# Continuum — What's New

## v1.6.8.0 - June 3, 2026

### Highlights

### Runtime Controls

Continuum now includes additional runtime controls directly from the dashboard.

Users can now:

- cleanly shut down the local Continuum runtime
- avoid manually terminating processes
- manage application lifecycle directly from the UI

A dedicated **Shutdown Application** action has been added to improve native and local deployment workflows.

This is particularly useful for:

- native macOS builds
- native Windows builds
- local Python environments
- long-running local sessions

---

### Application Console Window

A dedicated application console window has been added.

Users can now:

- open the application console directly from the dashboard
- inspect application output in real time
- monitor runtime activity without opening terminal windows

This improves visibility into local runtime behavior and makes debugging easier across build types.

---

### Logging Separation + Cleanup

Logging infrastructure has been reorganized for clearer separation of concerns.

Continuum now maintains dedicated logs for:

- `console.log`
  - application runtime output
  - runtime stdout output
  - application console activity

- `archive_sync.log`
  - archive synchronization activity only

- `restore_archive.log`
  - archive restore activity only

Runtime stdout output is no longer mixed into archive-specific logs.

This makes logs easier to inspect and reduces noise during archive and restore workflows.

---

### Dashboard Organization + Context Improvements

The dashboard received additional UI cleanup and organization to improve discoverability and reduce clutter.

This includes improvements across:

- Identity Controls
- Tools
- Author Card
- Runtime Controls

Changes include:

- reorganized buttons into clearer functional groupings
- moved related actions closer together
- reduced visual clutter across the dashboard
- added short explanatory help text beneath sections
- improved separation between identity actions, tooling, and runtime management
- improved visibility of common workflows
- cleaner layout for local-first application management

These changes aim to make Continuum easier to understand and navigate without requiring users to memorize where functionality lives.

---

## Why This Matters

Continuum continues evolving toward a local-first application experience where runtime management, authoring, publishing, and tooling exist together in one workspace.

This release improves:

- runtime visibility
- clean application shutdown
- operational debugging
- dashboard usability
- feature discoverability

The goal remains simple:

> Observe locally.  
> Control locally.  
> Organize clearly.

---

### Coming Next

- additional runtime management improvements
- continued dashboard simplification
- archive tooling refinements
- expanded local monitoring controls

---

## v1.6.7.9 - May 31, 2026

### Highlights

### Archive Sync Service + Queue Manager

Continuum now includes a dedicated archive synchronization service capable of processing events through a managed archive queue.

The archive system now supports:

- queue-based processing
- archive synchronization for notes (kind:1)
- archive synchronization for profiles (kind:0)
- archive synchronization for articles (kind:30023)
- queue management and inspection
- archive synchronization status tracking
- tombstone-aware processing

This provides a more reliable foundation for maintaining long-term event archives and synchronization workflows.

---

### Archive Runtime Refactoring

The internal archive and restore tooling was refactored to use direct Python function calls instead of launching bundled Continuum scripts through `sys.executable`.

This change improves reliability across:

- Docker deployments
- local Python development environments
- native macOS builds
- native Windows builds

Benefits include:

- improved native build compatibility
- fewer background process launches
- better real-time console log streaming
- simpler error handling and debugging
- more consistent behavior across all build types

This refactoring also removes an entire class of issues caused by native builds attempting to relaunch the Continuum executable when performing archive operations.

---

### Archive Runtime + Logging Improvements

Archive restore and synchronization workflows received additional runtime and infrastructure improvements.

This includes:

- added reusable logger utilities:
  - `ConsoleLogWriter` for runtime console logging
  - scoped `LogWriter` support for operation-specific logging
- improved separation between application console output and operation-specific logs
- improved visibility into long-running restore and synchronization operations

Archive restore performance was also significantly improved.

Continuum now:

- detects locally mounted archive repositories automatically
- reads archived event payloads directly from local archive files when available
- falls back to remote archive repositories only when local archives are unavailable

Archive infrastructure configuration was also improved.

Continuum now:

- checks environment settings for archive repository availability
- supports configurable remote archive endpoints through:
  - `ARCHIVE_REMOTE_BASE_URL`
  - `ARCHIVE_REMOTE_EVENT_BASE_URL`
- removes hardcoded references to remote archive URLs
- disables archive restore actions when required archive configuration is unavailable

These changes improve portability and consistency across Docker, native macOS, native Windows, and local development environments.

---

### Archive Queue Dashboard

A dedicated archive queue page has been added.

Users can now:

- view pending archive items
- monitor queue activity
- clear queue entries
- trigger archive operations
- inspect archive synchronization state

A live console log viewer was also added to make archive processing easier to observe while running.

---

### Import Existing Event

Continuum can now import an existing signed Nostr event directly into the local database.

Supported event kinds currently include:

- Profiles (kind:0)
- Notes (kind:1)
- Articles (kind:30023)

Imported events are:

- signature verified
- checked against tombstones
- checked for duplicates
- restored with local metadata preserved

This is particularly useful for recovering events that are no longer present in the local database, including unpublished content.

---

### Restore Events From Archive

Continuum can now restore archived events directly back into the local database.

Supported event kinds currently include:

- Profiles (kind:0)
- Notes (kind:1)
- Articles (kind:30023)

The restore operation:

- removes the selected identity's local copies of supported archived event types
- reloads those events from the archive repository
- rebuilds the local database state from archived content
- preserves the archive as the source of truth

This is useful when:

- recovering accidentally deleted events
- rebuilding a local workspace from archived content
- synchronizing the local database with archived event history
- restoring unpublished or previously archived content

The restore action is intentionally scoped to supported archivable event types and does not affect unrelated workspace data.

---

### Raw Event JSON Export + Viewing

Continuum now supports viewing and exporting the raw JSON representation of supported Nostr events.

Supported event kinds include:

- Profiles (kind:0)
- Notes (kind:1)
- Articles (kind:30023)

Users can now:

- view raw event JSON
- copy event JSON directly
- export event JSON as a file
- re-import exported events later

This complements the archive and recovery workflows introduced in this release.

---

### Article Search

The Articles page now supports full search capabilities.

Users can search article content directly from the top of the Articles page.

Search results include result counts and integrate with existing article browsing workflows.

---

### Relay List Management

Relay management has been expanded.

Users can now:

- add relays to an identity
- enable relays
- disable relays
- persist relay changes directly to the identity JSON file

This makes relay configuration easier to manage without editing identity files manually.

---

### UI Cleanup and Refactoring

Several interface improvements were made throughout the application.

This includes:

- minimizing Identity Controls by default
- minimizing Tools by default
- cleaner dashboard organization
- additional reusable templates and partials
- improved button visibility and enable/disable behavior
- reduced dashboard clutter

These changes help surface the most important actions while reducing visual noise.

---

## Why This Matters

This release continues to improve Continuum's ability to function as a long-term local-first workspace.

The most important change is the ability to move events more freely between:

- local databases
- archive storage
- exported JSON files
- future Continuum workspaces

The new archive queue system, event import/export capabilities, and relay management improvements make Continuum more resilient when working with long-lived content and multiple publishing environments.

---

## Philosophy Reminder

Continuum continues to build around a simple principle:

> The event belongs to the author.

Events can be:

- created locally
- signed locally
- archived locally
- exported locally
- restored locally

Publishing remains optional.

Authority remains local.

---

### Coming Next

- Additional archive tooling improvements
- Event metadata cleanup and normalization
- Continued dashboard and UI simplification
- Further relay management enhancements

----

## v1.6.7.8 - May 20, 2026

### Highlights

### PDF Export Support Across All Build Types

PDF export is now supported consistently across all Continuum build types.

This includes:

- native macOS builds
- native Windows builds
- local source installs
- Docker deployments

Docker builds continue to use `WeasyPrint` for HTML-to-PDF rendering.

Native and local builds now automatically fall back to a built-in `ReportLab` export pipeline when `WeasyPrint` is unavailable.

This removes the earlier limitation where PDF export was primarily tied to Docker-based environments.

---

### Environment Configuration Support Across All Build Types

Continuum now supports runtime environment configuration consistently across:

- native builds
- local source installs
- Docker deployments

Environment variables are now loaded from:

```
data/env/continuum.env
```

Environment configuration is intentionally kept outside of:

- workspace backup
- workspace restore
- workspace encryption
- workspace decryption

The environment configuration is treated as runtime-specific application configuration rather than portable workspace state.

This allows different installations, devices, or deployments to maintain independent runtime configuration without affecting encrypted workspace portability.


---

### Environment Settings Improvements

The environment settings page now supports viewing runtime environment configuration directly from within Continuum.

---

## Why This Matters

Continuum is continuing to separate:

- portable workspace state
- runtime-specific environment configuration
- optional deployment dependencies

The important distinction introduced in this release is simple:

> The workspace is portable.  
> The runtime environment is local.

This improves portability across:

- native builds
- Docker environments
- local source installs
- encrypted workspace transfers

while still allowing each runtime environment to maintain its own local configuration.

PDF export support is now also available consistently across all supported build types rather than depending on a specific deployment environment.

---

## Philosophy Reminder

Continuum continues to build around a simple principle:

> The workspace belongs to the user.

The workspace can move between environments.

The runtime environment remains local to the machine or deployment where Continuum runs.

Publishing remains optional.

Authority remains local.

---

### Coming Next

- Relay list editing for identities
- Archive sync service + dashboard export tooling improvements
- Runtime-managed archive synchronization flows

---

## v1.6.7.7 - May 18, 2026

### Highlights

### Full Encrypted Workspace Packaging

Continuum now supports full-folder encrypted workspace packaging.

The local `data/` workspace can be packaged into a single encrypted workspace file.

This includes:

- identities
- drafts
- tombstones
- nostr event db
- vault data

This makes it possible to export the Continuum workspace in encrypted form instead of creating a plaintext backup.

---

### Locked / Unlocked Workspace Flow

Continuum now has a clearer locked and unlocked workspace flow.

When the workspace is locked, the local data folder is encrypted.

When the workspace is unlocked, the encrypted workspace is restored back into the local data folder so Continuum can use it normally.

This gives Continuum a practical encrypted-at-rest workflow for the local workspace.

---

### Encrypted Workspace Import / Export

Continuum now supports importing and exporting encrypted workspace files.

This makes it easier to:

- back up an encrypted workspace
- restore an encrypted workspace
- move a workspace between machines or environments

---

### Auth Demo Flow

Continuum now includes a working authentication demo flow built around signed Nostr challenges.

This includes support for:

- requesting a challenge
- signing the challenge locally
- verifying the signed proof
- authenticating using signing authority tied to a public key

The goal of this demo is to illustrate a different authentication model based on cryptographic signing rather than traditional username/password systems.

---

### Manual Auth Signing Demo

A separate manual authentication signing demo was also added.

This flow allows users to:

- request a challenge manually
- copy the challenge payload
- sign it locally
- submit the signed proof for verification

The manual flow makes the authentication process more transparent and easier to inspect step-by-step. :contentReference[oaicite:1]{index=1}

---

### Workspace Management UI Improvements

The empty-state workspace controls have been reorganized and clarified.

Workspace actions are now grouped more clearly around:

- unlock
- export
- import
- clear

Identity actions remain separate:

- view an identity in read-only mode
- create a managed signing identity

This makes the startup flow easier to understand when no identity is loaded yet.

---

### Database + Path Handling Improvements

Continuum now handles missing workspace paths more safely.

This includes improvements around:

- creating missing data directories
- creating the nostr event database path when needed
- reset behavior when the database file does not already exist
- import behavior when the expected data directory or database path is missing

These changes make the workspace flows more reliable across local, portable, and mounted environments.

---

## Why This Matters

Continuum is becoming a more portable local-first workspace.

The important change in this release is simple:

> The workspace can now be exported, stored, and restored in encrypted form.

That matters because Continuum stores important local state, including signing identities, drafts, events, tombstones, and vault data.

This release also expands the practical authentication demonstrations around local signing authority and challenge-response verification.

The goal is to continue building toward workflows where:

- author locally
- store locally
- sign locally
- authenticate locally
- publish when ready

---

## Philosophy Reminder

Continuum continues to build around a simple principle:

> The workspace belongs to the user.

Publishing is optional.

Authority is local.

### Coming Next

- Relay list editing for identities

---

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
