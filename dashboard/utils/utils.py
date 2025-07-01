# utils.py
import urllib.parse
import requests
import bech32
import json
import os
import re
import markdown2
from zoneinfo import ZoneInfo
import datetime


def decode_npub(npub):
    """Decodes a bech32-encoded npub string to a raw hex pubkey"""
    hrp, data = bech32.bech32_decode(npub)
    if data is None:
        raise ValueError("Invalid bech32 string")
    decoded = bech32.convertbits(data, 5, 8, False)
    return bytes(decoded).hex()

def generate_link(event_id):
    return f"https://primal.net/e/{event_id}"    

def shorten_url(url):
    try:
        res = requests.get(f"https://tinyurl.com/api-create.php?url={urllib.parse.quote(url)}")
        if res.status_code == 200:
            return res.text
    except:
        pass
    return url

def load_identity():
    try:
        with open("data/identity/local_identity.json") as f:
            data = json.load(f)
            npub = data.get("npub")
            nsec = data.get("nsec")
            relays_raw = data.get("relays", [])
            pubkey = decode_npub(npub) if npub else None

            relays = []
            for entry in relays_raw:
                parts = entry.split()
                url = parts[0]
                perms = parts[1].split(',') if len(parts) > 1 else ['read', 'write']
                relays.append({
                    "url": url,
                    "read": 'read' in perms,
                    "write": 'write' in perms
                })

            return {
                "npub": npub,
                "nsec": nsec,
                "pubkey": pubkey,
                "relays": relays
            }
    except Exception as e:
        print(f"[IDENTITY] Error loading identity: {e}")
        return None

def get_active_pubkey():
    identity = load_identity()
    return identity["pubkey"] if identity else None


def get_npub_data_path(alt_npub=None):
    try:
        if alt_npub:
            pubkey = decode_npub(alt_npub)
        else:
            pubkey = get_active_pubkey()

        if not pubkey:
            return "data"

        path = f"data/npub_{pubkey}"
        os.makedirs(path, exist_ok=True)
        return path

    except Exception as e:
        print(f"[get_npub_data_path] Error resolving path: {e}")
        return "data"


def save_state(npub, path="data/session"):
    currpath = path
    # save current npub to local_state.jspn
    os.makedirs(currpath, exist_ok=True)

    pubkey = decode_npub(npub) if npub else None

    data = {"current_npub" : npub, "current_pubkey" : pubkey }

    with open(f"{currpath}/local_state.json", "w") as f:
        json.dump(data, f)

def parse_read_relay_urls(relays_from_identity):
    relay_urls = [r["url"] for r in relays_from_identity if r.get("read")]
    return relay_urls

def parse_write_relay_urls(relays_from_identity):
    relay_urls = [r["url"] for r in relays_from_identity if r.get("write")]
    return relay_urls    

# generating title from content (for both notes and articles)
# strip out any instances of image links and use markdown to view title

def generate_title(content, word_limit=10):
    # Remove image markdown ![](url)
    content = re.sub(r'!\[.*?\]\(.*?\)', '', content)
    # Remove raw image links ending in image filetypes
    content = re.sub(r'https?://\S+\.(png|jpg|jpeg|gif|webp)', '', content)
    # Strip markdown headers like # Title
    content = re.sub(r'^#+\s*', '', content, flags=re.MULTILINE)
    # Extract words
    words = content.strip().split()
    meaningful_words = words[:word_limit]
    title = ' '.join(meaningful_words)
    if len(words) > word_limit:
        title += '…'
    return title.strip()

def render_markdown(content):
    return markdown2.markdown(content)

# for handling date timestamps shown in localtime zone

def get_user_timezone():
    try:
        with open("data/identity/local_identity.json") as f:
            identity = json.load(f)
            tz = identity.get("timezone", "UTC")
            return ZoneInfo(tz)
    except Exception:
        return ZoneInfo("UTC")