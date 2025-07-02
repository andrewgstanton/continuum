import sys
import os, json, uuid, time
import asyncio
import websockets
import re
import markdown2

from flask import Flask, request, redirect, render_template, send_from_directory, jsonify

from utils.utils import load_identity, get_npub_data_path, decode_npub, save_state, parse_write_relay_urls, generate_title, render_markdown
from utils.signing import sign_event

import subprocess
import sqlite3

app = Flask(__name__, static_folder="static", template_folder="templates")

DB_PATH = "mycontinuum.db"

ARTICLE_PATH = os.path.join("data", "drafts", "articles_local")
os.makedirs(ARTICLE_PATH, exist_ok=True)

NOTE_PATH = os.path.join("data", "drafts", "notes_local")
os.makedirs(NOTE_PATH, exist_ok=True)

STATE_FILE = "data/session/local_state.json"
os.makedirs("data/session", exist_ok=True)


# template filters

from datetime import datetime

@app.template_filter('datetimeformat')
def datetimeformat(value):
    try:
        return datetime.utcfromtimestamp(int(value)).strftime('%Y-%m-%d %H:%M:%S UTC')
    except Exception:
        return value

# top level index

@app.route("/")
def index():
    return render_template("index.html")

# twitter routes
@app.route("/twitter/")
def twitter_dashboard():
    return render_template("twitter/dashboard.html")

# linkedIn Routes
@app.route("/linkedin/")
def linkedin_dashboard():
    return render_template("linkedin/dashboard.html")

# nostr routes

@app.route("/nostr/dashboard/")
def nostr_dashboard():
    return render_template("nostr/dashboard.html")

@app.route('/nostr/notes/')
def nostr_posts():
    return render_template('nostr/notes.html')

@app.route('/nostr/replies/')
def nostr_replies():
    return render_template('nostr/replies.html')

@app.route('/nostr/articles/')
def nostr_articles():
    return render_template('nostr/articles.html')

@app.route('/nostr/timeline/')
def nostr_timeline():
    return render_template('nostr/timeline.html')    


@app.route('/update')
def update_dashboard():
    npub = request.args.get('npub')
    print("npub from request: ", npub)
    if not npub:
        # redirect to the dashboard with prompt if no npub provided
        return redirect("/nostr/dashboard/?prompt=true")

    try:
        if not npub.startswith("npub1") or len(npub) < 20:
            raise ValueError("Invalid npub format")
    except Exception as e:
        print(f"Invalid npub: {npub} — {e}")
        # Don't change the identity file; just redirect back
        return redirect("/nostr/dashboard")

    try:   

        # save current state
        save_state(npub)

        # optional: convert npub to hex here if needed
        subprocess.run(["python", "scripts/fetch_nostr_data.py", "--npub", npub])
        subprocess.run(["python", "scripts/migrate_json_to_sqlite.py"])

    except Exception:
       return redirect("/nostr/dashboard/") 
    
    return redirect("/nostr/dashboard/")

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)
    
@app.route('/data/<path:filename>')
def serve_data(filename):
    return send_from_directory('data', filename)

# routes for loading the articles, notes and replies data

def query_db(query, args=(), one=False):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.execute(query, args)
        rows = cur.fetchall()
        return (dict(rows[0]) if rows else None) if one else [dict(row) for row in rows]

@app.route("/api/articles/<pubkey>")
def get_articles_from_db(pubkey):
    query = "SELECT id, content, created_at, tags FROM articles WHERE pubkey = ? ORDER BY created_at DESC"
    rows = query_db(query, (pubkey,))
    return jsonify(rows)
    
@app.route("/api/notes/<pubkey>")
def get_notes_from_db(pubkey):
    query = "SELECT id, content, created_at FROM notes WHERE pubkey = ? ORDER BY created_at DESC"
    rows = query_db(query, (pubkey,))

    enriched_notes = []
    for note in rows:
        enriched_notes.append({
            **note,
            "generated_title" : generate_title(note["content"])
        })    
    return jsonify(enriched_notes)

@app.route("/api/replies/<pubkey>")
def get_replies_from_db(pubkey):
    query = "SELECT id, content, created_at, root_id, reply_to FROM replies WHERE pubkey = ? ORDER BY created_at DESC"
    rows = query_db(query, (pubkey,))

    enriched_notes = []
    for note in rows:
        enriched_notes.append({
            **note,
            "generated_title" : generate_title(note["content"])
        })    
    return jsonify(enriched_notes)    

# routes for loading the dashboard.html (summary section + profile)

@app.route("/api/profile/<pubkey>")
def get_profile_from_db(pubkey):
    row = query_db(
        "SELECT npub, name, about, picture, banner, website, nip05, lud16 FROM profiles WHERE pubkey = ? ORDER BY created_at DESC LIMIT 1",
        (pubkey,),
        one=True
    )
    return jsonify(dict(row)) if row else jsonify({})


@app.route("/api/summary/<pubkey>")
def get_summary_from_db(pubkey):
    def count(table):
        return query_db(f"SELECT COUNT(*) as count FROM {table} WHERE pubkey = ?", (pubkey,), one=True)["count"]

    summary = {
        "notes": count("notes"),
        "replies": count("replies"),
        "reposts": count("reposts") if "reposts" in get_tables() else 0,
        "likes": count("likes") if "likes" in get_tables() else 0,
        "dms": count("dms") if "dms" in get_tables() else 0,
        "zaps": {"sent": 0, "received": 0, "total": 0},  # placeholder
        "articles": {
            "total": count("articles"),
            "published": count("articles"),
            "drafts": 0,
            "deleted": 0
        },
        "other": {
            "total": 0
        }
    }
    included_tables = ["notes", "replies", "reposts", "likes", "dms", "articles"]
    summary["total"] = sum(count(tbl) for tbl in included_tables)
   
    return jsonify(summary)

def get_tables():
    tables = query_db("SELECT name FROM sqlite_master WHERE type='table'")
    return [row["name"] for row in tables]

# for timeline

@app.route("/api/timeline/<pubkey>")
def get_timeline_from_db(pubkey):
    import json

    tables = [
        ("notes", 1),
        ("replies", 1),
        ("articles", 30023),
        ("profiles", 0),
        ("reposts", 3),
        ("dms", 4),
        ("likes", 7)
    ]
    all_events = []

    for table, kind in tables:
        # profiles table has no 'id' column
        if table == "profiles":
            rows = query_db(f"""
                SELECT pubkey, created_at
                FROM profiles
                WHERE pubkey = ?
            """, (pubkey,))
            for row in rows:
                row["kind"] = kind
                row["id"] = f"profile-{row['created_at']}"
                row["content"] = "Profile updated"
                row["tags"] = []
                all_events.append(row)
        else:
            rows = query_db(f"""
                SELECT id, pubkey, content, created_at, tags
                FROM {table}
                WHERE pubkey = ?
            """, (pubkey,))
            for row in rows:
                row["kind"] = kind
                try:
                    row["tags"] = json.loads(row["tags"]) if isinstance(row["tags"], str) else row["tags"]
                except:
                    row["tags"] = []
                all_events.append(row)

    all_events.sort(key=lambda e: e["created_at"], reverse=True)

    # notes, replies (kind = 1), generate title from the content,
    enriched_events = []
    for event in all_events:
        if event.get("kind") == 1 and "content" in event:
            enriched_events.append({
                **event,
                "generated_title": generate_title(event["content"])
            })
        else:
            enriched_events.append(event)

    return jsonify(enriched_events)

# previewing an article saved in sql lite (retreived as an event) in nostr NOT previwing an unpublished draft artcle I'm editing)

@app.route("/nostr/view/article/<id>")
def view_article_from_db(id):
    row = query_db("SELECT * FROM articles WHERE id = ?", (id,), one=True)
    if not row:
        return "Article not found", 404

    try:
        row["tags"] = json.loads(row["tags"]) if isinstance(row["tags"], str) else row["tags"]
    except:
        row["tags"] = []

    return render_template("nostr/view_article.html", article=row)

 # previewing a note saved in sql ite (retreieved as an event in NOSTR NOT previewing an unpublished draft note)   

# generate hero image for note if there is one in the note take the first one
import re

def extract_first_image(content):
    # Match URLs ending with image extensions
    match = re.search(r'(https?://\S+\.(?:png|jpg|jpeg|gif))', content)
    return match.group(1) if match else None

@app.route("/nostr/view/note/<id>")
def view_note_from_db(id):
    row = query_db("SELECT * FROM notes WHERE id = ?", (id,), one=True)
    if not row:
        return "Note not found", 404

    content = row.get("content", "")
    hero_image = extract_first_image(content)

    if hero_image:
        # Remove first image URL line from content (if it's the first line)
        lines = content.splitlines()
        if lines and lines[0].strip().startswith(hero_image):
            row["content"] = "\n".join(lines[1:])
        else:
            row["content"] = content
    else:
        row["content"] = content

    row["hero_image"] = hero_image

     # Optionally parse tags
    try:
        row["tags"] = json.loads(row["tags"]) if isinstance(row["tags"], str) else row["tags"]
    except:
        row["tags"] = []   

    return render_template("nostr/view_note.html", note=row, hero_image=hero_image)

@app.route("/nostr/view/reply/<id>")
def view_reply_from_db(id):
    row = query_db("SELECT * FROM replies WHERE id = ?", (id,), one=True)
    if not row:
        return "Note not found", 404

    content = row.get("content", "")
    hero_image = extract_first_image(content)

    if hero_image:
        # Remove first image URL line from content (if it's the first line)
        lines = content.splitlines()
        if lines and lines[0].strip().startswith(hero_image):
            row["content"] = "\n".join(lines[1:])
        else:
            row["content"] = content
    else:
        row["content"] = content

    row["hero_image"] = hero_image

     # Optionally parse tags
    try:
        row["tags"] = json.loads(row["tags"]) if isinstance(row["tags"], str) else row["tags"]
    except:
        row["tags"] = []   

    return render_template("nostr/view_reply.html", note=row, hero_image=hero_image)

# editing articles locally (draft) before publishing
# articles draft

# edit view

@app.route("/nostr/articles/edit/")
def edit_article_view():
    identity = load_identity()
    nsec = identity.get("nsec")
    has_valid_nsec = bool(nsec and len(nsec) > 10)
    return render_template("nostr/edit_article.html", has_valid_nsec=has_valid_nsec)

# api routes (local data only not syncing with remote relays or calling sql db

@app.route("/api/articles")
def get_draft_articles():
    articles = []

    for fname in os.listdir(ARTICLE_PATH):
        if not fname.endswith(".json"):
            continue

        path = os.path.join(ARTICLE_PATH, fname)
        with open(path) as f:
            try:
                data = json.load(f)
                preview = data.get("title") or data.get("summary") or data.get("content", "")[:40]
                articles.append({
                    "id": fname.replace(".json", ""),
                    "preview": preview.strip() + ("…" if len(preview) > 40 else "")
                })
            except Exception as e:
                print(f"[ERROR] Failed to read {fname}: {e}")

    # Sort by modified time (newest first)
    articles.sort(key=lambda x: os.path.getmtime(os.path.join(ARTICLE_PATH, x["id"] + ".json")), reverse=True)

    return jsonify(articles)


@app.route("/api/article/<id>")
def get_draft_article(id):
    path = os.path.join(ARTICLE_PATH, id + ".json")
    if not os.path.exists(path):
        return jsonify({"error": "Not found"}), 404
    with open(path) as f:
        return jsonify(json.load(f))

@app.route("/api/article", methods=["POST"])
def create_draft_article():
    data = request.json
    content = data.get("content", "").strip()
    published = data.get("published", False)
    title = data.get("title", "").strip()
    summary = data.get("summary", "").strip()
    tags = data.get("tags", [])
    article_id = data.get("id") or str(uuid.uuid4())[:8]
        
    if not content:
        return jsonify({"error": "Content required"}), 400

    article_id = str(uuid.uuid4())[:8]
    article = {
        "id": article_id,
        "title": title,
        "summary": summary,
        "tags": tags,        
        "content": content,
        "published": published,
        "created_at": int(time.time())
    }

    with open(os.path.join(ARTICLE_PATH, article_id + ".json"), "w") as f:
        json.dump(article, f)

    return jsonify({"status": "saved", "id": article_id})

@app.route("/api/article/<id>", methods=["PUT"])
def update_draft_article(id):
    path = os.path.join(ARTICLE_PATH, f"{id}.json")
    if not os.path.exists(path):
        return jsonify({"error": "Article not found"}), 404

    data = request.json
    content = data.get("content", "").strip()
    if not content:
        return jsonify({"error": "Content required"}), 400

    article = {
        "id": id,
        "title": data.get("title", ""),
        "summary": data.get("summary", ""),
        "tags": data.get("tags", []),
        "content": content,
        "published": data.get("published", False),
        "created_at": int(time.time())
    }

    with open(path, "w") as f:
        json.dump(article, f)

    return jsonify({"status": "updated", "id": id})    

@app.route("/api/article/<id>", methods=["DELETE"])
def delete_draft_article(id):
    path = os.path.join(ARTICLE_PATH, f"{id}.json")
    if not os.path.exists(path):
        return jsonify({"error": "Article not found"}), 404

    os.remove(path)
    return jsonify({"status": "deleted", "id": id})

# editing notes
# notes draft


@app.route("/nostr/notes/edit/")
def edit_note_view():
    identity = load_identity()
    nsec = identity.get("nsec")
    has_valid_nsec = bool(nsec and len(nsec) > 10)
    return render_template("nostr/edit_note.html", has_valid_nsec=has_valid_nsec)


@app.route("/api/note", methods=["POST"])
def create_draft_note():
    data = request.json
    content = data.get("content", "").strip()
    if not content:
        return jsonify({"error": "Content required"}), 400

    note_id = str(uuid.uuid4())[:8]
    note = {
        "id": note_id,
        "title": data.get("title", "").strip(),
        "tags": data.get("tags", []),
        "content": content,
        "created_at": int(time.time())
    }

    with open(os.path.join(NOTE_PATH, f"{note_id}.json"), "w") as f:
        json.dump(note, f)

    return jsonify({"status": "created", "id": note_id})


@app.route("/api/note/<id>", methods=["PUT"])
def update_draft_note(id):
    path = os.path.join(NOTE_PATH, f"{id}.json")
    if not os.path.exists(path):
        return jsonify({"error": "Note not found"}), 404

    data = request.json
    content = data.get("content", "").strip()
    if not content:
        return jsonify({"error": "Content required"}), 400

    note = {
        "id": id,
        "title": data.get("title", "").strip(),
        "tags": data.get("tags", []),
        "content": content,
        "created_at": int(time.time())
    }

    with open(path, "w") as f:
        json.dump(note, f)

    return jsonify({"status": "updated", "id": id})


@app.route("/api/note/<id>", methods=["DELETE"])
def delete_draft_note(id):
    path = os.path.join(NOTE_PATH, f"{id}.json")
    if not os.path.exists(path):
        return jsonify({"error": "Note not found"}), 404

    os.remove(path)
    return jsonify({"status": "deleted", "id": id})


@app.route("/api/note/<id>")
def get_draft_note(id):
    path = os.path.join(NOTE_PATH, f"{id}.json")
    if not os.path.exists(path):
        return jsonify({"error": "Note not found"}), 404
    with open(path) as f:
        return jsonify(json.load(f))


@app.route("/api/notes")
def get_draft_notes():
    notes = []

    for fname in os.listdir(NOTE_PATH):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(NOTE_PATH, fname)
        with open(path) as f:
            try:
                data = json.load(f)
                preview = data.get("title") or " ".join(data.get("content", "").split()[:10])
                notes.append({
                    "id": fname.replace(".json", ""),
                    "preview": preview.strip() + ("…" if len(preview) > 40 else "")
                })
            except Exception as e:
                print(f"[ERROR] Failed to read {fname}: {e}")

    notes.sort(key=lambda x: os.path.getmtime(os.path.join(NOTE_PATH, x["id"] + ".json")), reverse=True)


    return jsonify(notes)


# local identity management

@app.route("/api/identity")
def get_identity():
    identity = load_identity()
    if not identity:
        return jsonify({"error": "No local identity found"}), 404

    return jsonify({
        "npub": identity.get("npub"),
        "pubkey": identity.get("pubkey"),
        "has_nsec": bool(identity.get("nsec")),
        "relays": identity.get("relays")
    })    

# current state management

@app.route("/api/state", methods=["GET", "POST"])
def state():
    if request.method == "POST":
        try:
            data = request.get_json()
            with open(STATE_FILE, "w") as f:
                json.dump(data, f)
            return jsonify({"status": "ok", "current_npub": data.get("current_npub")})
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return jsonify(json.load(f))
    else:
        return jsonify({"current_npub": None})

# for signing and publishing        

@app.route("/api/sign", methods=["POST"])
def sign_event_api():
    event = request.get_json()
    if not event:
        return jsonify({"error": "Invalid event data"}), 400

    try:
        signed = sign_event(event)
        return jsonify(signed)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

async def publish_event_to_relays(event, relays):
    successes = []
    event_json = json.dumps(["EVENT", event])

    for relay in relays:
        try:
            async with websockets.connect(relay) as ws:
                await ws.send(event_json)
                await asyncio.sleep(0.5)
                successes.append(relay)
        except Exception as e:
            print(f"❌ Failed to publish to {relay}: {e}")
            continue

    return successes
    
@app.route("/api/publish", methods=["POST"])
def publish_event_api():
    event_data = request.get_json()
    if not event_data:
        return jsonify({"error": "No event provided"}), 400

    try:
        identity = load_identity()
        print("")
        relays = identity["relays"]  # list of dicts with read/write perms, using set selected in identity
        print("relays from identity:", relays) 
        relay_urls = parse_write_relay_urls(relays)
        print("write relays configured:", relay_urls)
        if not relays:
            return jsonify({"error": "No write relays configured in identity"}), 400

        result = asyncio.run(publish_event_to_relays(event_data, relay_urls))

        print("refreshing data from relays after publishing artile ...")
        subprocess.run(["python", "scripts/fetch_nostr_data.py"])
        subprocess.run(["python", "scripts/migrate_json_to_sqlite.py"])

        return jsonify({"status": "ok", "relays": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# filters for showing time in localtimezone
from utils.utils import get_user_timezone
from datetime import datetime

@app.template_filter('localtime')
def localtime_filter(timestamp):
    try:
        tz = get_user_timezone()
        dt = datetime.fromtimestamp(timestamp, tz)
        return dt.strftime('%Y-%m-%d %I:%M:%S %p')
    except Exception:
        return datetime.utcfromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S UTC')       

@app.context_processor
def inject_timezone():
    return dict(user_timezone=str(get_user_timezone()))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)