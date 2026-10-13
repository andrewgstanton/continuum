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
