# Continuum Memorials & Milestones

**Version 14 — consolidated documentation**

A static memorials and milestones website that displays Bitcoin-anchored records, collections, and individual viewers, with an ordering page linked to Google Forms. Version 14 changes documentation only; site assets and application behavior are identical to Version 13.

## Site structure

| Path | Purpose |
| --- | --- |
| `/memorials/` | Compact landing directory with Collections, Memorials, and Milestones cards |
| `/memorials/?view=collections` | Collections directory |
| `/memorials/?view=memorials` | Memorials directory |
| `/memorials/?view=milestones` | Milestones directory |
| `/memorials/?collection=...` | Individual collection, with totals and category counts |
| `/memorials/?txid=...` | Bitcoin-linked individual memorial or milestone viewer |
| `/memorials/?id=...` | Existing ID-based viewer route |
| `/memorials/order/` | Customer information and Google Form order button |
| `/memorials/create_milestone/` | Administrative creation and PSBT preview workflow |

Records and counts are derived from `memorials/index.json`. Collection category counts reflect only that collection's records; empty categories are hidden. Existing transaction, QR, Nostr, and PSBT functionality is preserved.

## Local preview

From the directory **containing** `memorials/` run:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000/memorials/`, `http://localhost:8000/memorials/order/`, or `http://localhost:8000/memorials/create_milestone/`. Test the individual record, collection, and category routes before deploying.

## Deploy

Copy the `memorials/` folder into the existing static website root. Existing viewer URLs and `index.json` data should remain intact. Add links from the main Continuum site to `/memorials/` and `/memorials/order/` separately; the main Continuum site's source code is not included here.

## Ordering via Google Forms

The order page's **Continue to Order Form** button opens the public responder form in a new tab. Its URL is configured in:

`memorials/order/form-config.js`

Current form: `https://docs.google.com/forms/d/e/1FAIpQLSePlOsRDoaGSVPE9Ho20_6zjmbWCai_ZrOyHbUGDDoVwUmwmw/viewform?usp=header`

The workflow is: submit request → review/approve inscription → arrange payment → record on Bitcoin → provide shareable viewer link. Submitting a form does not itself create or pay for an inscription. An 80-character Google Forms response limit is not necessarily an 80-**byte** UTF-8 limit; validate the on-chain byte count before creating a Bitcoin transaction. Google Forms notifications and response-copy settings are configured in Google Forms, not in this site.

## Visual design and branding

The public index, order page, viewer, and admin creation page use a coordinated light theme with a typographic gold infinity symbol. The infinity glyph is a placeholder until the official Continuum logo asset is supplied. Print styling on the order page avoids large dark backgrounds.

## Version history

- **V3 — Integration:** Incorporated the order page into the existing memorials site without replacing catalog/viewer or admin workflows.
- **V4 — Admin header:** Updated `/memorials/create_milestone/` header and styling to match the rest of the site.
- **V5 — Viewer branding:** Preserved the infinity symbol in dynamically rendered memorial and milestone headers.
- **V6 — Directory:** Replaced the long homepage listing with three cards and added `?view=` category routes.
- **V7 — Category counts:** Displayed counts on category pages and removed redundant category headings.
- **V8 — Collection counts:** Added record counts to collection listings and collection views.
- **V9–V10 — Collection category counts:** Added collection-specific memorial/milestone counts and hid empty categories.
- **V11 — Collection total:** Used “N records total” alongside per-category counts.
- **V12 — Homepage cleanup:** Removed the redundant small branding subheader beneath the main header.
- **V13 — Form connected:** Set the live Google Forms responder URL in `order/form-config.js`.
- **V14 — Documentation:** Consolidated previous README documents into this single file. No functional changes.

## Administration: Bitcoin inscription updater and Nostr event generator

The following instructions are preserved from the original `memorials/scripts/README.md`.

# Update inscription text

Requires Python 3.8+ and internet access. No extra packages or API keys.

From the scripts folder:

```sh
sh update_json.sh
```

Or from the memorials folder:

```sh
sh scripts/update_json.sh
```

The default input is `memorials/index.json`. The output is
`memorials/scripts/index_changed_json` (JSON format, filename as requested).
Defaults are relative to the script, so it works from any working directory.

Each record with a Bitcoin transaction ID receives `bitcoin.inscription`:

```json
"bitcoin": {
  "txid": "existing transaction ID",
  "psbt": null,
  "inscription": "Exact decoded inscription text"
}
```

The text has no HTML or clickable-link markup. Capitalization, whitespace,
and line breaks are preserved; JSON represents line breaks as `\n`.
Other metadata and record order are preserved. Existing inscription fields
are refreshed from Bitcoin. Records without a transaction ID are skipped.
Repeated transaction IDs are fetched once per run.

The script tries mempool.space and then Blockstream. It validates the returned
transaction ID, requires exactly one OP_RETURN output, parses its data pushes,
and decodes strict UTF-8. Ambiguous outputs, binary hashes, malformed scripts,
invalid transaction IDs, and network failures are reported as errors.

If any record fails, the command exits with status 1 and leaves both the input
and any previous output untouched. After a successful run, review the output
before manually copying it over the original index.

Optional paths (relative to your current working directory):

```sh
sh update_json.sh --input ../index.json --output index_changed.json --timeout 20
```

If Python reports CERTIFICATE_VERIFY_FAILED, the updater automatically retries
with curl, keeping HTTPS certificate verification enabled. macOS includes curl.
If curl also fails, the command reports the error without writing the output.


# Generate unsigned Nostr events

Requires Python 3.8+ only. No network access or signing keys needed.

From the scripts folder:

```sh
sh generate_events.sh
```

Or from the memorials folder:

```sh
sh scripts/generate_events.sh
```

Defaults use `index_changed_json` beside the script and write to
`unsigned-events/` beside the script, regardless of your working directory.
Run `update_json.sh` first when inscription text needs refreshing.

Output: one unsigned kind-1 event per public, published record,
`all-events.json`, and `preview.txt`. Each note includes title, optional
description, image, inscription, viewer link, and both Bitcoin explorer links.
Existing event IDs and signatures are not reused; the input is unchanged.
The default public key is the ContinuumMilestones identity from your sample.
Sign and broadcast with that identity in Continuum.

Optional paths (relative to your current working directory):

```sh
sh generate_events.sh ../index.json --output unsigned-events-next
```

Use `--pubkey HEX_PUBLIC_KEY` to select another signing identity, or
`--created-at UNIX_SECONDS` to override the generation timestamp.
Existing output directories are refused; select a new directory for each run.
No signing or broadcasting occurs.
