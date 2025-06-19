# utils.py
import urllib.parse
import requests
import bech32

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
