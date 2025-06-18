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
        event["_source"] = ["primal backup"]
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

if __name__ == "__main__":
    print("running fetch_nostr_data")
    relays = load_relays()
    env = load_env()
    events = load_backup()
    summary = summarize_events(events)
    print(f"Loaded {len(events)} events, wrote summary.json and kind*.json files")
