#!/usr/bin/env python3
"""Add Bitcoin OP_RETURN text to index records using public explorer APIs."""
import argparse
import json
import os
from pathlib import Path
import re
import ssl
import subprocess
import sys
import tempfile
from urllib.request import Request, urlopen
from urllib.error import URLError

ADMIN = Path(__file__).resolve().parent
EXPLORERS = ("https://mempool.space/api", "https://blockstream.info/api")


def decode_inscription(transaction, txid):
    if transaction.get("txid", "").lower() != txid.lower():
        raise ValueError("Explorer returned a different transaction ID")
    outputs = transaction.get("vout")
    if not isinstance(outputs, list):
        raise ValueError("Transaction has no output list")
    scripts = [bytes.fromhex(output["scriptpubkey"]) for output in outputs
               if output.get("scriptpubkey", "").lower().startswith("6a")]
    if len(scripts) != 1:
        raise ValueError("Expected exactly one OP_RETURN output")
    script = scripts[0]
    position = 1
    chunks = []
    while position < len(script):
        opcode = script[position]
        position += 1
        if opcode <= 75:
            size = opcode
        elif opcode in (76, 77, 78):
            width = {76: 1, 77: 2, 78: 4}[opcode]
            if position + width > len(script):
                raise ValueError("Truncated OP_RETURN push length")
            size = int.from_bytes(script[position:position + width], "little")
            position += width
        else:
            raise ValueError("OP_RETURN contains a non-data-push opcode")
        if position + size > len(script):
            raise ValueError("Truncated OP_RETURN payload")
        chunks.append(script[position:position + size])
        position += size
    payload = b"".join(chunks)
    if not payload:
        raise ValueError("OP_RETURN contains no inscription")
    return payload.decode("utf-8", errors="strict")


def fetch_transaction(url, timeout):
    request = Request(url, headers={"User-Agent": "Continuum-Index-Updater/1.1"})
    try:
        with urlopen(request, timeout=timeout) as response:
            return json.load(response)
    except URLError as error:
        if not isinstance(error.reason, ssl.SSLCertVerificationError):
            raise
        # macOS curl can use its system trust configuration when Python's
        # separate CA bundle is missing. Never disable TLS verification.
        print("Python certificate verification failed; trying verified curl HTTPS",
              file=sys.stderr)
        try:
            result = subprocess.run(
                ["curl", "--disable", "--fail", "--silent", "--show-error",
                 "--proto", "=https", "--connect-timeout", str(timeout),
                 "--max-time", str(timeout), "--user-agent",
                 "Continuum-Index-Updater/1.1", url],
                check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                timeout=timeout + 5)
        except FileNotFoundError:
            raise ValueError("Python's CA certificates need repair; curl is unavailable") from error
        except subprocess.CalledProcessError as failure:
            raise ValueError("Verified curl request failed: " +
                             failure.stderr.decode("utf-8", errors="replace").strip()) from failure
        return json.loads(result.stdout)


def fetch_inscription(txid, timeout):
    errors = []
    for base in EXPLORERS:
        try:
            transaction = fetch_transaction(base + "/tx/" + txid, timeout)
            return decode_inscription(transaction, txid)
        except Exception as error:
            errors.append(base + ": " + str(error))
    raise ValueError("; ".join(errors))


def update_records(data, fetch):
    records = data if isinstance(data, list) else data.get("records") if isinstance(data, dict) else None
    if not isinstance(records, list):
        raise ValueError("Index must be an array or an object with a records array")
    cache = {}
    errors = []
    for number, record in enumerate(records, 1):
        label = record.get("id", str(number)) if isinstance(record, dict) else str(number)
        bitcoin = record.get("bitcoin") if isinstance(record, dict) else None
        txid = bitcoin.get("txid") if isinstance(bitcoin, dict) else None
        if txid is None or txid == "":
            print("SKIP " + label + ": no Bitcoin transaction ID", file=sys.stderr)
            continue
        try:
            if not isinstance(txid, str) or not re.fullmatch(r"[0-9a-fA-F]{64}", txid):
                raise ValueError("Invalid Bitcoin transaction ID")
            key = txid.lower()
            if key not in cache:
                cache[key] = fetch(key)
            bitcoin["extracted_inscription"] = cache[key]
            bitcoin.pop("inscription", None)
            print("OK   " + label, file=sys.stderr)
        except Exception as error:
            errors.append(label + ": " + str(error))
            print("FAIL " + errors[-1], file=sys.stderr)
    if errors:
        raise ValueError(str(len(errors)) + " record(s) failed; output was not written")
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=ADMIN.parent / "index.json")
    parser.add_argument("--output", type=Path, default=ADMIN / "index_changed_json")
    parser.add_argument("--timeout", type=float, default=15,
                        help="Seconds per explorer request (default: 15)")
    args = parser.parse_args()
    if args.timeout <= 0:
        parser.error("--timeout must be greater than zero")
    temporary = None
    try:
        if args.input.resolve() == args.output.resolve():
            raise ValueError("Input and output must be different files")
        with args.input.open(encoding="utf-8") as source:
            data = json.load(source)
        update_records(data, lambda txid: fetch_inscription(txid, args.timeout))
        # Replace the output atomically only after all records succeed.
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8",
                                         dir=args.output.parent, delete=False) as target:
            temporary = Path(target.name)
            json.dump(data, target, ensure_ascii=False, indent=2)
            target.write("\n")
        os.replace(temporary, args.output)
        temporary = None
        print("Written: " + str(args.output))
        return 0
    except Exception as error:
        print("ERROR: " + str(error), file=sys.stderr)
        return 1
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    sys.exit(main())
