// returns pubkey und npub sed for current session

export async function getPubkey() {
  try {
    const response = await fetch('/api/state');
    const data = await response.json();
    return data.current_pubkey || null;
  } catch (err) {
    console.error('Error fetching pubkey:', err);
    return null;
  }
}

export async function getNpub() {
  try {
    const response = await fetch('/api/state');
    const data = await response.json();
    return data.current_npub || null;
  } catch (err) {
    console.error('Error fetching npub:', err);
    return null;
  }
}

// returns pubkey and npub of user identity

export async function getIdentityPubkey() {
  try {
    const res = await fetch('/api/identity');
    const data = await res.json();
    return data?.pubkey || null;
  } catch (err) {
    console.error("Failed to fetch identity pubkey:", err);
    return null;
  }
}

export async function getIdentityNpub() {
  try {
    const res = await fetch('/api/identity');
    const data = await res.json();
    return data?.npub || null;
  } catch (err) {
    console.error("Failed to fetch identity npub:", err);
    return null;
  }
}