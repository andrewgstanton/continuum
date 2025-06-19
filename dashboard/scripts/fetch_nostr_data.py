import os
import gzip
import json
import asyncio
import uuid
import websockets
from utils import decode_npub, generate_link, shorten_url
from dotenv import dotenv_values

def load_env(path="environment.txt"):
    return dotenv_values(path)



def load_relays(path="relays.txt", mode="read"):
    relays = []
    with open(path) as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            parts = line.strip().split()
            if len(parts) == 2 and mode in parts[1]:
                relays.append(parts[0])
    return relays

def load_backup(path="data/nostr-content.txt.gz"):
    events = []
    if os.path.exists(path):
        with gzip.open(path, 'rt', encoding='utf-8') as f:
            for line in f:
                try:
                    event = json.loads(line)
                    event["_source"] = ["primal backup"]
                    events.append(event)
                except:
                    pass
    return events

async def fetch_from_relay(url, pubkey_hex):
    events = []
    try:
        print("fetching from relay:", url)
        async with websockets.connect(url) as ws:
            sub_id = str(uuid.uuid4())
            await ws.send(json.dumps(["REQ", sub_id, {
                "kinds": [1, 3, 4, 7, 30023],
                "authors": [pubkey_hex]
            }]))
            while True:
                try:
                    msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
                    if msg[0] == "EVENT" and msg[1] == sub_id:
                        event = msg[2]
                        event.setdefault("_source", []).append(url)
                        events.append(event)
                    elif msg[0] == "EOSE":
                        break
                except asyncio.TimeoutError:
                    break
    except Exception as e:
        print(f"[{url}] Failed: {e}")
    return events

async def fetch_all_relays(relay_urls, pubkey_hex):
    tasks = [fetch_from_relay(url, pubkey_hex) for url in relay_urls]
    results = await asyncio.gather(*tasks)
    events = []
    seen_ids = set()
    for result in results:
        for event in result:
            eid = event.get("id")
            if eid and eid not in seen_ids:
                seen_ids.add(eid)
                events.append(event)
            elif eid:
                for existing in events:
                    if existing.get("id") == eid:
                        existing_sources = set(existing.get("_source", []))
                        new_sources = set(event.get("_source", []))
                        existing["_source"] = list(existing_sources.union(new_sources))
                        break
    return events    

def summarize_events(events, output_dir="data"):
    os.makedirs(output_dir, exist_ok=True)

    summary = {
        "notes": 0,
        "replies": 0,
        "reposts": 0,
        "likes": 0,
        "dms": 0,
        "articles": {"total": 0, "published": 0, "drafts": 0, "deleted": 0},
        "other": {},
        "total": 0
    }

    categorized = {
        "kind_1_notes": [],
        "kind_1_replies": [],
        "kind_3_reposts": [],
        "kind_4_dms": [],
        "kind_7_likes": [],
        "kind_30023_published": [],
        "kind_30023_drafts": [],
        "kind_30023_deleted": [],
        "other": []
    }

    for event in events:
        kind = event.get("kind")
        
        if kind == 1:
            is_reply = any(
                tag[0] == "e" and len(tag) > 3 and tag[3] == "reply"
                for tag in event.get("tags", [])
            )
            if is_reply:
                summary["replies"] += 1
                categorized["kind_1_replies"].append(event)
            else:
                summary["notes"] += 1
                categorized["kind_1_notes"].append(event)

        elif kind == 3:
            summary["reposts"] += 1
            categorized["kind_3_reposts"].append(event)

        elif kind == 4:
            summary["dms"] += 1
            categorized["kind_4_dms"].append(event)

        elif kind == 7:
            summary["likes"] += 1
            categorized["kind_7_likes"].append(event)

        elif kind == 30023:
            summary["articles"]["total"] += 1
            content = event.get("content", "")
            if "#draft" in content:
                summary["articles"]["drafts"] += 1
                categorized["kind_30023_drafts"].append(event)
            elif "#deleted" in content or not content.strip():
                summary["articles"]["deleted"] += 1
                categorized["kind_30023_deleted"].append(event)
            else:
                summary["articles"]["published"] += 1
                categorized["kind_30023_published"].append(event)

        else:
            kind_str = f"kind_{kind}"
            summary["other"].setdefault(kind_str, 0)
            summary["other"][kind_str] += 1
            event["kind_str"] = kind_str
            categorized["other"].append(event)

    summary["total"] = len(events)

    # Write categorized events to files
    for name, data in categorized.items():
        with open(os.path.join(output_dir, f"{name}.json"), "w") as f:
            json.dump(data, f, indent=2)

    # Write summary
    with open(os.path.join(output_dir, "summary.json"), "w") as f:
        json.dump(summary, f, indent=2)

    return summary   

def merge_events(backup_events, relay_events):
    # Merge events by ID, preserving all unique _source values
    event_map = {}

    for event in backup_events + relay_events:
        eid = event.get("id")
        if not eid:
            continue
        if eid not in event_map:
            event_map[eid] = event
        else:
            # Merge _source lists
            existing_sources = set(event_map[eid].get("_source", []))
            new_sources = set(event.get("_source", []))
            event_map[eid]["_source"] = list(existing_sources.union(new_sources))

    events = list(event_map.values())     

    return events


if __name__ == "__main__":
    print("running fetch_nostr_data")

    env = load_env()
    
    pubkey = env.get("NPUB")
    print("Current PUBKEY :", pubkey)

    try:
        pubkey_hex = decode_npub(pubkey) if pubkey.startswith("npub") else pubkey
    except Exception as e:
        print(f"Invalid PUBKEY: {e}", file=sys.stderr)
        sys.exit(1)

    print("Current PUBKEY (hex):", pubkey_hex)

    backup_events = load_backup()
    print(f"Loaded {len(backup_events)} events from backup")


    relays = load_relays()
    relay_events = asyncio.run(fetch_all_relays(relays, pubkey_hex))
    print(f"Loaded {len(relay_events)} events from relays")


    events = merge_events(backup_events, relay_events)
    summary = summarize_events(events)
    print(f"Loaded {len(events)} events, merging duplicates in backup and relay events, wrote summary.json and kind*.json files")
