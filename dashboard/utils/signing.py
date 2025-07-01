import json
import hashlib
from secp256k1 import PrivateKey
import bech32

IDENTITY_PATH = "data/identity/local_identity.json"

def decode_nsec(nsec_bech32):
    hrp, data = bech32.bech32_decode(nsec_bech32)
    if hrp != "nsec":
        raise ValueError("Invalid nsec prefix")
    decoded_bytes = bech32.convertbits(data, 5, 8, False)
    return bytes(decoded_bytes)

def get_event_id(event):
    event_fields = [
        0,
        event["pubkey"],
        event["created_at"],
        event["kind"],
        event.get("tags", []),
        event["content"]
    ]
    serialized = json.dumps(event_fields, separators=(',', ':'), ensure_ascii=False)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

def sign_event(event):
    with open(IDENTITY_PATH, "r") as f:
        identity = json.load(f)

    nsec = identity.get("nsec")
    if not nsec or nsec.startswith("***"):
        raise ValueError("Missing or redacted nsec")

    privkey = decode_nsec(nsec)
    if len(privkey) != 32:
        raise ValueError("Decoded private key is not 32 bytes")

    sk = PrivateKey(privkey, raw=True)

    event_id = get_event_id(event)
    sig = sk.schnorr_sign(bytes.fromhex(event_id), None, raw=True)

    event["id"] = event_id
    event["sig"] = sig.hex()
    return event
