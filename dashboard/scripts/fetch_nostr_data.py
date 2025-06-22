import os
import gzip
import json
import asyncio
import uuid
import websockets
import argparse
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
                # get everything 
                # "kinds": [1, 3, 4, 7, 9735, 30023],
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

def get_profile_meta_data(events, npub, output_dir="data"):
    os.makedirs(output_dir, exist_ok=True)

    categorized = {
        "kind_0_profile_metadata" : []
    }

    latest_profiles = {}  # key: pubkey, value: latest event

    for event in events:
        kind = event.get("kind")
        if kind == 0:
            pubkey = event.get("pubkey")
            ts = event.get("created_at", 0)
            event["npub"] = npub
            existing = latest_profiles.get(pubkey)
            if not existing or ts > existing["created_at"]:
                latest_profiles[pubkey] = event

    categorized["kind_0_profile_metadata"].extend(latest_profiles.values())
    
    for name, data in categorized.items():
        with open(os.path.join(output_dir, f"{name}.json"), "w") as f:
            json.dump(data, f, indent=2)

def deduplicate_articles(events):
    latest_articles = {}
    for event in events:
        if event.get("kind") == 30023:
            d_tag = None
            for tag in event.get("tags", []):
                if tag[0] == "d":
                    d_tag = tag[1]
                    break
            if d_tag:
                existing = latest_articles.get(d_tag)
                if not existing or event["created_at"] > existing["created_at"]:
                    latest_articles[d_tag] = event
            else:
                # fallback: use event id as unique if no d-tag
                latest_articles[event["id"]] = event
        else:
            continue  # skip non-article events
    return list(latest_articles.values())            

def summarize_events(events, pubkey_hex, output_dir="data"):
    os.makedirs(output_dir, exist_ok=True)

    summary = {
        "notes": 0,
        "replies": 0,
        "reposts": 0,
        "likes": 0,
        "dms": 0,
        "zaps": {"sent": 0, "received" : 0, "total" : 0},
        "articles": {"total": 0, "published": 0, "drafts": 0, "deleted": 0},
        "other": {"total" : 0},
        "total": 0
    }

    categorized = {
        "kind_1_posts": [],
        "kind_1_replies": [],
        "kind_3_reposts": [],
        "kind_4_dms": [],
        "kind_7_likes": [],
        "kind_9735_zaps_received" : [],
        "kind_9735_zaps_sent" : [],
        "kind_30023_published": [],
        "kind_30023_drafts": [],
        "kind_30023_deleted": [],
        "other": []
    }

    for event in events:
        kind = event.get("kind")

        if kind == 1:

            is_reply = any(tag and tag[0] == "e" for tag in event.get("tags", []))
            
            if is_reply:
                summary["replies"] += 1
                categorized["kind_1_replies"].append(event)
            else:
                summary["notes"] += 1
                categorized["kind_1_posts"].append(event)

        elif kind == 3:
            summary["reposts"] += 1
            categorized["kind_3_reposts"].append(event)

        elif kind == 4:
            summary["dms"] += 1
            categorized["kind_4_dms"].append(event)

        elif kind == 7:
            summary["likes"] += 1
            categorized["kind_7_likes"].append(event)

        elif kind == 9735:
            summary["zaps"]["total"] += 1
            
            tags = event.get("tags", [])
            zap_from = next((tag[1] for tag in tags if tag[0] == "p"), None)
            zap_to = next((tag[1] for tag in tags if tag[0] == "e"), None)

            if zap_from == pubkey_hex:
                summary["zaps"]["sent"] += 1
                categorized["kind_9735_zaps_sent"].append(event)
            elif zap_to == pubkey_hex:
                summary["zaps"]["received"] += 1
                categorized["kind_9735_zaps_received"].append(event)

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
            summary["other"]["total"] += 1
            categorized["other"].append(event)

    summary["total"] = len(events)

    # Write categorized events to files
    for name, data in categorized.items():
        with open(os.path.join(output_dir, f"{name}.json"), "w") as f:
            json.dump(data, f, indent=2)

    # Write summary
    with open(os.path.join(output_dir, "summary.json"), "w") as f:
        json.dump(summary, f, indent=2)

    # write all events
    with open(os.path.join(output_dir, "all_events.json"), "w") as f:
        json.dump(events, f, indent=2)

    return summary   

def merge_sources_in_events(events):
    # Merge events by ID, preserving all unique _source values
    event_map = {}

    for event in events:
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

def get_npub_hex_from_backup_source(events):
    if (len(events)) > 0:
        pubkey = events[0].get("pubkey")
        return pubkey

async def fetch_zaps_from_relay(url, pubkey_hex):
    zaps = []
    try:
        print("fetching zaps from relay:", url)
        async with websockets.connect(url) as ws:
            sub_id = str(uuid.uuid4())
            await ws.send(json.dumps(["REQ", sub_id, {
                "kinds": [9735]
            }]))
            while True:
                try:
                    msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
                    if msg[0] == "EVENT" and msg[1] == sub_id:
                        event = msg[2]
                        tags = event.get("tags", [])
                        p_tag = next((tag for tag in tags if tag[0] == "p"), None)
                        if p_tag and p_tag[1] == pubkey_hex:
                            event.setdefault("_source", []).append(url)
                            zaps.append(event)
                    elif msg[0] == "EOSE":
                        break
                except asyncio.TimeoutError:
                    break
    except Exception as e:
        print(f"[{url}] Failed: {e}")
    return zaps

async def fetch_all_zaps(relays, pubkey_hex):
    tasks = [fetch_zaps_from_relay(url, pubkey_hex) for url in relays]
    results = await asyncio.gather(*tasks)
    zaps = []
    for batch in results:
        zaps.extend(batch)
    return zaps    

def get_npub_from_argument():
    parser = argparse.ArgumentParser(description="Optional npub argument")
    parser.add_argument('--npub', type=str,help="npub argument (optional)")
    args = parser.parse_args()
    npub = args.npub
    return npub

if __name__ == "__main__":

    print("running fetch_nostr_data")

    npub_in_arg = get_npub_from_argument()
    
    print("npub in arg", npub_in_arg)

    if npub_in_arg is not None:
        print("npub in argument detected using as npub")
        pubkey = npub_in_arg
    else:                 
        print("no npub in argument detected using npub in environment.txt")
        env = load_env()
        pubkey = env.get("NPUB")

    print("Current PUBKEY :", pubkey)

    if pubkey:

        try:
            pubkey_hex = decode_npub(pubkey) if pubkey.startswith("npub") else pubkey
        except Exception as e:
            print(f"Invalid PUBKEY: {e}", file=sys.stderr)
            sys.exit(1)

        print("Current PUBKEY (hex):", pubkey_hex)

        relays = load_relays()
    
        # zaps = asyncio.run(fetch_all_zaps(relays, pubkey_hex))
        # print(f"✅ Retrieved {len(zaps)} zaps")

        backup_events = load_backup()

        npub_hex_from_backup = get_npub_hex_from_backup_source(backup_events)

        if npub_hex_from_backup == pubkey_hex:
            print("backup events match npub -- using as data source")
        else:
            print("backup events don't match npub -- excluding as data source")
            backup_events = []

        print(f"Loaded {len(backup_events)} events from backup")

        relay_events = asyncio.run(fetch_all_relays(relays, pubkey_hex))
        print(f"Loaded {len(relay_events)} events from relays")

        combined_events = backup_events + relay_events

        merged_events = merge_sources_in_events(combined_events)

        # dedup artciles in backup + relay events -- take only latest version of articles in the set
        deduped_articles = deduplicate_articles(merged_events)
        # Now combine deduped articles with other events (notes, replies, etc.)
        non_articles = [e for e in merged_events if e.get("kind") != 30023]
        final_events = non_articles + deduped_articles

        get_profile_meta_data(final_events,pubkey) 
        print("generated profile meta data in kind_0_profile_metadata.json")
        summary = summarize_events(final_events, pubkey_hex)
        print(f"Loaded {len(final_events)} events, merging duplicates in backup and relay events, wrote summary.json and kind*.json files")

    else:
        print("no npub key")
        