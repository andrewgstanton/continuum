import { schnorr } from "@noble/secp256k1";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }

    if (url.pathname === "/" && request.method === "GET") {
      return jsonResponse({
        service: "Continuum Auth Demo API",
        status: "ok",
        endpoints: ["/api/challenge", "/api/verify"]
      });
    }

    if (url.pathname === "/api/challenge" && request.method === "POST") {
      return handleChallenge(request);
    }

    if (url.pathname === "/api/verify" && request.method === "POST") {
      return handleVerify(request);
    }

    return jsonResponse({ error: "Not found" }, 404);
  }
};

async function handleChallenge(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const pubkey = body.pubkey;

  if (!isHex(pubkey, 64)) {
    return jsonResponse({ error: "Invalid Nostr pubkey. Expected 64-char hex." }, 400);
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 60;

  const nonce = randomHex(32);

  const challenge = [
    "continuum-auth-demo",
    `method=nostr`,
    `pubkey=${pubkey}`,
    `nonce=${nonce}`,
    `iat=${now}`,
    `exp=${expiresAt}`,
    `origin=https://api.mycontinuum.xyz`
  ].join("\n");

  return jsonResponse({
    method: "nostr",
    pubkey,
    nonce,
    challenge,
    issued_at: now,
    expires_at: expiresAt
  });
}

async function handleVerify(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ verified: false, error: "Invalid JSON" }, 400);
  }

  const { pubkey, challenge, signature } = body;

  if (!isHex(pubkey, 64)) {
    return jsonResponse({ verified: false, error: "Invalid pubkey" }, 400);
  }

  if (!challenge || typeof challenge !== "string") {
    return jsonResponse({ verified: false, error: "Missing challenge" }, 400);
  }

  if (!isHex(signature, 128)) {
    return jsonResponse({ verified: false, error: "Invalid signature" }, 400);
  }

  const parsed = parseChallenge(challenge);

  if (parsed.method !== "nostr") {
    return jsonResponse({ verified: false, error: "Challenge method is not nostr" }, 400);
  }

  if (parsed.pubkey !== pubkey) {
    return jsonResponse({ verified: false, error: "Pubkey does not match challenge" }, 400);
  }

  const now = Math.floor(Date.now() / 1000);

  if (!parsed.exp || Number(parsed.exp) < now) {
    return jsonResponse({ verified: false, error: "Challenge expired" }, 400);
  }

  const challengeHash = await sha256Bytes(challenge);

  let verified = false;

  try {
    verified = await schnorr.verify(signature, challengeHash, pubkey);
  } catch (err) {
    return jsonResponse({
      verified: false,
      error: "Signature verification failed",
      detail: String(err)
    }, 400);
  }

  return jsonResponse({
    verified,
    method: "nostr",
    pubkey,
    verified_at: new Date().toISOString()
  });
}

function parseChallenge(challenge) {
  const result = {};

  for (const line of challenge.split("\n")) {
    const idx = line.indexOf("=");
    if (idx === -1) continue;

    const key = line.slice(0, idx);
    const value = line.slice(idx + 1);

    result[key] = value;
  }

  return result;
}

async function sha256Bytes(message) {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

function randomHex(byteLength) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);

  return [...bytes]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isHex(value, length) {
  return (
    typeof value === "string" &&
    value.length === length &&
    /^[0-9a-fA-F]+$/.test(value)
  );
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: corsHeaders({
      "Content-Type": "application/json"
    })
  });
}

function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "http://localhost:5000",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    ...extra
  };
}