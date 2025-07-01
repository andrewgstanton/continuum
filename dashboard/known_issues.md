# Known Issues – MyContinuum Dashboard

## 1. Missing Articles (Kind:30023) – Primal-Only Storage

**Description:**
Some users post long-form articles through Primal’s UI, but these events are **not broadcast to open relays**. Instead, they are only stored in Primal’s proprietary infrastructure or a closed relay.

**Impact:**

- Articles are **invisible to MyContinuum** and all other Nostr clients.
- Published content is **not truly decentralized**.
- Misleads users into thinking their content is on-chain/on-protocol.

**Example:**

- User `sooly@NostrArabia.com` has 22 articles on Primal.
- Only **1** article is visible through open relay queries.

**Proposed Solution:**

- Implement a ghost article detection feature that compares relay data with Primal UI count.
- Offer optional rebroadcast tool in paid tier to reclaim and republish missing content.
- Add UI warnings: *"Some articles may be stored only on Primal. Click to verify or rebroadcast."*

---

## 2. Profiles (Kind:0) Not Found on Relays

**Description:**
Some users have Primal profiles with avatars, names, and bios, but **no kind:0 event is found** on open relays.

**Impact:**

- Profile does not load in MyContinuum dashboard.
- Fallback to NPUB-only view without profile metadata.
- Causes confusion for dashboard users expecting profile summary.

**Example:**

- `npub18ams6ewn5aj2n3wt2qawzglx9mr4nzksxhvrdc4gzrecw7n5tvjqctp424` (Derek Ross) shows full profile on Primal but **no kind:0** from public relays.

**Proposed Solution:**

- Show alert if no profile (kind:0) is found: *"No profile data found on open relays. This user may have only published to Primal."*
- Optionally: allow manual profile import or rebroadcast (advanced/premium feature)

**Known Bug:**
When a user has **no kind:0 profile**, the NPUB (Bech32) may not be displayed correctly. Only the HEX pubkey is shown. This happens because `npub` is often extracted from the decoded kind:0 event.

**Fix:** JavaScript now includes a fallback that calculates `npub` from the current state even if the profile event is missing.

---

*This document tracks known gaps between visible Primal data and actual Nostr relay data. It serves as a foundation for both user awareness and future development prioritization.*