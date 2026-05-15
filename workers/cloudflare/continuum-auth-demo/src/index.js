import { schnorr } from "@noble/curves/secp256k1.js";

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
        endpoints: ["/api/challenge", "/api/verify", "/api/me", "/api/logout"]
      });
    }

    if (url.pathname === "/api/challenge" && request.method === "POST") {
      return handleChallenge(request);
    }

    if (url.pathname === "/api/verify" && request.method === "POST") {
      return handleVerify(request, env);
    }

    if (url.pathname === "/api/me" && request.method === "GET") {
      return handleMe(request, env);
    }

    if (url.pathname === "/api/logout" && request.method === "POST") {
      return handleLogout();
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

function hexToBytes(hex) {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

function bytesToHex(bytes) {
  return [...bytes]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function handleVerify(request, env) {
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
    verified = await schnorr.verify(
      hexToBytes(signature),
      challengeHash,
      hexToBytes(pubkey)
    );
  } catch (err) {
    return jsonResponse({
      verified: false,
      error: "Signature verification failed",
      detail: String(err)
    }, 400);
  }

  if (!verified) {
    return jsonResponse({
      verified: false,
      method: "nostr",
      pubkey,
      challenge_sha256: bytesToHex(challengeHash),
      signature_length: signature.length,
      pubkey_length: pubkey.length
    }, 401);
  }

  if (!env.SESSION_SECRET) {
    return jsonResponse({
      verified: true,
      authenticated: false,
      error: "SESSION_SECRET is not configured"
    }, 500);
  }

  const sessionToken = await createSessionToken({
    pubkey,
    method: "nostr"
  }, env.SESSION_SECRET);

  return jsonResponse({
    verified: true,
    authenticated: true,
    method: "nostr",
    pubkey,
    expires_in: 3600,
    verified_at: new Date().toISOString()
  }, 200, {
    "Set-Cookie": makeSessionCookie(sessionToken)
  });
}

async function handleMe(request, env) {
  const token = getCookie(request, "continuum_session");

  if (!token) {
    return jsonResponse({
      authenticated: false
    }, 401);
  }

  if (!env.SESSION_SECRET) {
    return jsonResponse({
      authenticated: false,
      error: "SESSION_SECRET is not configured"
    }, 500);
  }

  const session = await verifySessionToken(token, env.SESSION_SECRET);

  if (!session) {
    return jsonResponse({
      authenticated: false,
      error: "Invalid or expired session"
    }, 401);
  }

  return jsonResponse({
    authenticated: true,
    pubkey: session.pubkey,
    method: session.method,
    issued_at: session.iat,
    expires_at: session.exp
  });
}

function handleLogout() {
  return jsonResponse({
    logged_out: true
  }, 200, {
    "Set-Cookie": clearSessionCookie()
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

function makeSessionCookie(token) {
  return [
    `continuum_session=${token}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=3600"
  ].join("; ");
}

function clearSessionCookie() {
  return [
    "continuum_session=",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0"
  ].join("; ");
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = cookieHeader.split(";").map((c) => c.trim());

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split("=");

    if (key === name) {
      return valueParts.join("=");
    }
  }

  return null;
}

async function createSessionToken(payload, secret) {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const body = {
    ...payload,
    iat: now,
    exp: now + 3600,
    iss: "api.mycontinuum.xyz",
    aud: "mycontinuum-auth-demo"
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));

  const signingInput = `${encodedHeader}.${encodedBody}`;
  const signature = await hmacSha256(signingInput, secret);

  return `${signingInput}.${signature}`;
}

async function verifySessionToken(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedBody, signature] = parts;
  const signingInput = `${encodedHeader}.${encodedBody}`;
  const expectedSignature = await hmacSha256(signingInput, secret);

  if (!timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  let body;

  try {
    body = JSON.parse(base64UrlDecode(encodedBody));
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);

  if (!body.exp || body.exp < now) {
    return null;
  }

  if (body.iss !== "api.mycontinuum.xyz") {
    return null;
  }

  if (body.aud !== "mycontinuum-auth-demo") {
    return null;
  }

  return body;
}

async function hmacSha256(message, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );

  return base64UrlEncodeBytes(new Uint8Array(sig));
}

function base64UrlEncode(value) {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlEncodeBytes(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - value.length % 4) % 4);

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new TextDecoder().decode(bytes);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: corsHeaders({
      "Content-Type": "application/json",
      ...extraHeaders
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
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    ...extra
  };
}