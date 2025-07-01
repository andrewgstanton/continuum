import os
import json
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "../data")
DB_FILE = os.path.join(BASE_DIR, "../mycontinuum.db")

conn = sqlite3.connect(DB_FILE)
cur = conn.cursor()

# Create tables
cur.execute('''
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    pubkey TEXT,
    content TEXT,
    created_at INTEGER,
    tags TEXT
)
''')

cur.execute('''
CREATE TABLE IF NOT EXISTS replies (
    id TEXT PRIMARY KEY,
    pubkey TEXT,
    content TEXT,
    created_at INTEGER,
    root_id TEXT,
    reply_to TEXT,
    tags TEXT
)
''')

cur.execute('''
CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    pubkey TEXT,
    content TEXT,
    created_at INTEGER,
    title TEXT,
    summary TEXT,
    tags TEXT
)
''')

cur.execute('''
CREATE TABLE IF NOT EXISTS profiles (
    pubkey TEXT PRIMARY KEY,
    npub TEXT, 
    created_at INTEGER,
    name TEXT,
    about TEXT,
    picture TEXT,
    nip05 TEXT,
    lud16 TEXT,
    banner TEXT,
    website TEXT,
    raw_json TEXT
)
''')

cur.execute('''
CREATE TABLE IF NOT EXISTS reposts (
    id TEXT PRIMARY KEY,
    pubkey TEXT,
    content TEXT,
    created_at INTEGER,
    tags TEXT
)
''')

cur.execute('''
CREATE TABLE IF NOT EXISTS dms (
    id TEXT PRIMARY KEY,
    pubkey TEXT,
    content TEXT,
    created_at INTEGER,
    tags TEXT
)
''')

cur.execute('''
CREATE TABLE IF NOT EXISTS likes (
    id TEXT PRIMARY KEY,
    pubkey TEXT,
    content TEXT,
    created_at INTEGER,
    tags TEXT
)
''')

conn.commit()

def import_events(file_path, table, pubkey_field="pubkey"):
    records = load_json(file_path)
    for rec in records:
        cur.execute(f'''
            INSERT OR REPLACE INTO {table} (id, {pubkey_field}, content, created_at, tags)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            rec.get("id"),
            rec.get("pubkey"),
            rec.get("content", ""),
            rec.get("created_at", 0),
            json.dumps(rec.get("tags", []))
        ))
    return len(records)


def load_json(filepath):
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        return []

migrated = {"notes": 0, "replies": 0, "articles": 0, "profiles": 0, "dms": 0, "likes": 0, "reposts": 0}

for folder in os.listdir(DATA_DIR):
    if not folder.startswith("npub_"):
        continue
    npub_path = os.path.join(DATA_DIR, folder)

    # Notes
    notes_path = os.path.join(npub_path, "kind_1_posts.json")
    notes = load_json(notes_path)
    for note in notes:
        cur.execute('''
            INSERT OR IGNORE INTO notes (id, pubkey, content, created_at, tags)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            note.get("id"),
            note.get("pubkey"),
            note.get("content"),
            note.get("created_at"),
            json.dumps(note.get("tags", []))
        ))
        migrated["notes"] += 1

    # replies
    replies_path = os.path.join(npub_path, "kind_1_replies.json")
    replies = load_json(replies_path)
    for reply in replies:
        cur.execute('''
            INSERT OR IGNORE INTO replies (id, pubkey, content, created_at, root_id, reply_to, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            reply.get("id"),
            reply.get("pubkey"),
            reply.get("content"),
            reply.get("created_at"),
            reply.get("tags", [])[0][1] if reply.get("tags") else None,  # root_id
            reply.get("tags", [])[1][1] if len(reply.get("tags", [])) > 1 else None,  # reply_to
            json.dumps(reply.get("tags", []))
        ))
        migrated["replies"] = migrated.get("replies", 0) + 1    


    # Articles
    articles_path = os.path.join(npub_path, "kind_30023_published.json")
    articles = load_json(articles_path)
    for article in articles:
        cur.execute('''
            INSERT OR IGNORE INTO articles (id, pubkey, content, created_at, title, summary, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            article.get("id"),
            article.get("pubkey"),
            article.get("content"),
            article.get("created_at"),
            article.get("title", ""),
            article.get("summary", ""),
            json.dumps(article.get("tags", []))
        ))
        migrated["articles"] += 1

    # Profiles
    profile_path = os.path.join(npub_path, "kind_0_profile_metadata.json")
    profiles = load_json(profile_path)
    for profile in profiles:
        profile_data = json.loads(profile.get("content", "{}"))  # ← ✅ required

        cur.execute('''
            INSERT OR REPLACE INTO profiles (
                pubkey, npub, created_at, name, about, picture, nip05, lud16, banner, website, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            profile.get("pubkey"),
            profile.get("npub"),
            profile.get("created_at", 0),
            profile_data.get("name"),
            profile_data.get("about"),
            profile_data.get("picture"),
            profile_data.get("nip05"),
            profile_data.get("lud16"),
            profile_data.get("banner"),
            profile_data.get("website"),
            json.dumps(profile)  # raw original for fallback
        ))
        migrated["profiles"] += 1

    # additional events (likes, dms, reposts)
    reposts = import_events(os.path.join(npub_path, "kind_3_reposts.json"), "reposts")
    migrated["reposts"] += reposts

    dms = import_events(os.path.join(npub_path, "kind_4_dms.json"), "dms")
    migrated["dms"]  += dms

    likes = import_events(os.path.join(npub_path, "kind_7_likes.json"), "likes")
    migrated["likes"] += likes
    

conn.commit()
conn.close()

print(f"Migrated: {migrated}")
