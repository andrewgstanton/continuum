#!/usr/bin/env python3
"""Generate unsigned kind-1 Nostr events; no dependencies or network access."""
import argparse
import json
import re
import sys
import time
from pathlib import Path

DEFAULT_PUBKEY = '08a49a4b8a13142a8e52ac551c9bb444581bc7c4e490efe6cbc9a16c63a625ab'


def generate(source, pubkey, timestamp):
    if not re.fullmatch(r'[0-9a-f]{64}', pubkey):
        raise ValueError('pubkey must be 64 lowercase hexadecimal characters')
    if timestamp < 0:
        raise ValueError('created_at must be nonnegative')
    records = source if isinstance(source, list) else source['records']
    output, seen = [], set()
    for record in records:
        rid = record['id']
        if not isinstance(rid, str) or not re.fullmatch(r'[A-Za-z0-9_-]+', rid) or rid in seen:
            raise ValueError('Invalid or duplicate record id: %r' % rid)
        seen.add(rid)
        if record.get('visibility') != 'public' or record.get('status') != 'published':
            raise ValueError('%s: expected a public, published record' % rid)
        txid = record['bitcoin']['txid']
        if not isinstance(txid, str) or not re.fullmatch(r'[0-9a-fA-F]{64}', txid):
            raise ValueError('%s: invalid Bitcoin txid' % rid)
        txid = txid.lower()
        title = record['title']
        inscription = record['bitcoin']['inscription']
        if not isinstance(title, str) or not title.strip() or not isinstance(inscription, str) or not inscription.strip():
            raise ValueError('%s: title and inscription are required' % rid)
        record_type = record['type']
        if record_type not in ('memorial', 'milestone'):
            raise ValueError('%s: unsupported record type' % rid)
        parts = [title]
        for key in ('description', 'image'):
            value = record.get(key)
            if value is not None:
                if not isinstance(value, str):
                    raise ValueError('%s: %s must be a string or null' % (rid, key))
                if value.strip():
                    parts.append(value)
        parts += [
            'Recorded on Bitcoin',
            inscription,
            'Permanently recorded on the Bitcoin network',
            'View this %s:\nhttps://mycontinuum.xyz/memorials/?txid=%s' % (record_type, txid),
            'Verify on Bitcoin:\nmempool.space:\nhttps://mempool.space/tx/%s\n\nBlockstream:\nhttps://blockstream.info/tx/%s' % (txid, txid),
        ]
        event = {
            'pubkey': pubkey,
            'created_at': timestamp,
            'kind': 1,
            'tags': [['client', 'Continuum']],
            'content': '\n\n'.join(parts),
        }
        output.append((rid, event))
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path, nargs='?', default=Path(__file__).resolve().parent / 'index_changed_json')
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parent / 'unsigned-events')
    parser.add_argument('--pubkey', default=DEFAULT_PUBKEY, help='Signing identity hex public key')
    parser.add_argument('--created-at', type=int, default=None, help='Unix seconds; defaults to generation time')
    args = parser.parse_args()
    try:
        source = json.loads(args.input.read_text(encoding='utf-8'))
        events = generate(source, args.pubkey, int(time.time()) if args.created_at is None else args.created_at)
        # Refuse existing destinations so reruns cannot accidentally replace edited drafts.
        if args.output.exists():
            raise ValueError('Output already exists; choose a new --output directory')
        args.output.mkdir(parents=True)
        for rid, event in events:
            (args.output / (rid + '.json')).write_text(json.dumps(event, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (args.output / 'all-events.json').write_text(json.dumps([e for _, e in events], ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (args.output / 'preview.txt').write_text('\n\n'.join('=== %s ===\n\n%s' % (rid, e['content']) for rid, e in events) + '\n', encoding='utf-8')
        print('Generated %d unsigned events in %s' % (len(events), args.output))
    except (OSError, ValueError, KeyError, TypeError) as exc:
        parser.exit(1, 'Error: %s\n' % exc)


if __name__ == '__main__':
    main()
