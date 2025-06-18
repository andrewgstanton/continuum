import os
import gzip
import json
from dotenv import dotenv_values

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

def load_env(path="environment.txt"):
    return dotenv_values(path)

def load_backup(path="data/nostr-content.txt.gz"):
    events = []
    if os.path.exists(path):
        with gzip.open(path, 'rt', encoding='utf-8') as f:
            for line in f:
                try:
                    events.append(json.loads(line))
                except:
                    pass
    return events

def summarize_events(events):
    summary = {
        "notes": 0,
        "replies": 0,
        "reposts": 0,
        "likes": 0,
        "dms": 0,
        "articles": {"total": 0, "published": 0, "drafts": 0, "deleted": 0},
        "other": 0,
        "total": 0
    }
    for event in events:
        kind = event.get("kind")
        if kind == 1:
            is_reply = any(tag[0] == "e" and len(tag) > 3 and tag[3] == "reply" for tag in event.get("tags", []))
            if is_reply:
                summary["replies"] += 1
            else:
                summary["notes"] += 1
        elif kind == 7:
            summary["likes"] += 1
        elif kind == 3:
            summary["reposts"] += 1
        elif kind == 4:
            summary["dms"] += 1
        elif kind == 30023:
            summary["articles"]["total"] += 1
            content = event.get("content", "")
            if "#draft" in content:
                summary["articles"]["drafts"] += 1
            elif "#deleted" in content or not content.strip():
                summary["articles"]["deleted"] += 1
            else:
                summary["articles"]["published"] += 1
        else:
            summary["other"] += 1

    summary["total"] = len(events)
    return summary

if __name__ == "__main__":
    print("running fetch_nostr_data")
    relays = load_relays()
    env = load_env()
    events = load_backup()
    summary = summarize_events(events)
    with open("data/summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    print(f"Loaded {len(events)} events and wrote summary.json")