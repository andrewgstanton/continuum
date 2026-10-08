async function loadCatalog() {
  const status = document.getElementById("status");
  const catalog = document.getElementById("catalog");
  const collectionList = document.getElementById("collections");
  const memorialList = document.getElementById("memorial-records");
  const milestoneList = document.getElementById("milestone-records");
  try {
    const response = await fetch("index.json", {cache: "no-store"});
    if (!response.ok) throw new Error("Cannot load memorial catalog (HTTP " + response.status + ")");
    const data = await response.json();
    const all = Array.isArray(data.records) ? data.records : [];
    const visible = all.filter(r => r.status === "published" && r.visibility === "public");
    const params = new URLSearchParams(location.search);
    const requestedCollection = params.get("collection");
    const requestedId = params.get("id");
    const collections = Array.isArray(data.collections) ? data.collections : [];
    if (requestedId) {
      const selected = all.find(r => r.id === requestedId);
      if (!selected) throw new Error("Memorial or milestone not found.");
      if (selected.bitcoin?.txid) {
        await showBitcoinMemorial(selected.bitcoin.txid, selected);
        return;
      }
      throw new Error("This record has not been published to Bitcoin yet.");
    }
    const list = requestedCollection ? visible.filter(r => (r.collections || []).includes(requestedCollection)) : visible;
    if (!requestedCollection) {
      for (const c of collections.filter(c => c.visibility === "public")) {
        if (!visible.some(r => (r.collections || []).includes(c.id))) continue;
        const a = document.createElement("a");
        a.href = "?collection=" + encodeURIComponent(c.id);
        a.textContent = c.title || c.id;
        const item = document.createElement("p"); item.append(a); collectionList.append(item);
      }
    }
    function renderRecords(type, container) {
      const records = list.filter(r => r.type === type);
      if (!records.length) {
        const empty = document.createElement("p");
        empty.className = "catalog-empty";
        empty.textContent = type === "memorial" ? "No public memorials listed yet." : "No public milestones listed yet.";
        container.append(empty);
        return;
      }
      for (const record of records) {
        const a = document.createElement("a");
        a.className = "catalog-card";
        // Published Bitcoin transactions get canonical, shareable TXID links.
        // Keep the record ID as a fallback for previews or missing TXIDs.
        const recordTxid = record.bitcoin?.txid;
        a.href = typeof recordTxid === "string" && /^[0-9a-fA-F]{64}$/.test(recordTxid)
          ? "?txid=" + encodeURIComponent(recordTxid)
          : "?id=" + encodeURIComponent(record.id);
        if (record.image) {
          const img = document.createElement("img");
          img.className = "catalog-thumbnail";
          img.src = record.image;
          img.alt = "";
          img.loading = "lazy";
          a.append(img);
        } else {
          const placeholder = document.createElement("span");
          placeholder.className = "catalog-thumbnail catalog-placeholder";
          placeholder.textContent = type === "memorial" ? "♡" : "★";
          placeholder.setAttribute("aria-hidden", "true");
          a.append(placeholder);
        }
        const info = document.createElement("span");
        info.className = "catalog-card-content";
        const title = document.createElement("span");
        title.className = "catalog-card-title";
        title.textContent = record.title || record.id;
        const action = document.createElement("span");
        action.className = "catalog-card-action";
        action.textContent = type === "memorial" ? "View memorial →" : "View milestone →";
        info.append(title, action);
        a.append(info);
        container.append(a);
      }
    }
    renderRecords("memorial", memorialList);
    renderRecords("milestone", milestoneList);
    status.hidden = true; catalog.hidden = false;
  } catch (e) { status.textContent = e.message; status.hidden = false; status.classList.add("error"); }
}

function hexToUtf8(hex) {
  if (!hex || hex.length % 2 !== 0) {
    throw new Error("Invalid OP_RETURN data.");
  }

  const bytes = new Uint8Array(
    hex.match(/.{2}/g).map(byte => parseInt(byte, 16))
  );

  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}


function getOpReturnHex(output) {
  const asm = output.scriptpubkey_asm;

  if (!asm || !asm.startsWith("OP_RETURN")) {
    return null;
  }

  /*
   * mempool.space typically returns something like:
   *
   * OP_RETURN OP_PUSHBYTES_42 48656c6c6f...
   *
   * For our memorial transactions the final token is
   * the actual payload.
   */

  const parts = asm.trim().split(/\s+/);

  if (parts.length < 2) {
    return null;
  }

  const possibleHex = parts[parts.length - 1];

  if (!/^[0-9a-fA-F]+$/.test(possibleHex)) {
    return null;
  }

  return possibleHex;
}


function base64ToBytes(base64) {
  const cleaned = base64.replace(/\s+/g, "");

  if (!cleaned) {
    throw new Error("Paste a PSBT to preview.");
  }

  let binary;

  try {
    binary = atob(cleaned);
  } catch {
    throw new Error("The PSBT is not valid base64.");
  }

  return Uint8Array.from(binary, character => character.charCodeAt(0));
}


function bytesToHex(bytes) {
  return Array.from(bytes, byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}


function readCompactSize(bytes, offset) {
  if (offset >= bytes.length) {
    throw new Error("Unexpected end of transaction.");
  }

  const first = bytes[offset];

  if (first < 0xfd) {
    return { value: first, size: 1 };
  }

  if (first === 0xfd) {
    if (offset + 2 >= bytes.length) {
      throw new Error("Unexpected end of transaction.");
    }

    return {
      value: bytes[offset + 1] | (bytes[offset + 2] << 8),
      size: 3
    };
  }

  /*
   * Continuum transactions are tiny. Refuse unexpectedly large CompactSize
   * values rather than silently losing precision in browser JavaScript.
   */
  throw new Error("Unexpectedly large transaction field.");
}


function readPsbtKeyValue(bytes, offset) {
  const keyLength = readCompactSize(bytes, offset);
  offset += keyLength.size;

  if (keyLength.value === 0) {
    return { separator: true, offset };
  }

  const keyEnd = offset + keyLength.value;

  if (keyEnd > bytes.length) {
    throw new Error("Malformed PSBT key.");
  }

  const key = bytes.slice(offset, keyEnd);
  offset = keyEnd;

  const valueLength = readCompactSize(bytes, offset);
  offset += valueLength.size;

  const valueEnd = offset + valueLength.value;

  if (valueEnd > bytes.length) {
    throw new Error("Malformed PSBT value.");
  }

  const value = bytes.slice(offset, valueEnd);

  return {
    separator: false,
    key,
    value,
    offset: valueEnd
  };
}


function extractUnsignedTransactionFromPsbt(psbtText) {
  const bytes = base64ToBytes(psbtText);

  const magic = [0x70, 0x73, 0x62, 0x74, 0xff];

  if (
    bytes.length < magic.length ||
    !magic.every((byte, index) => bytes[index] === byte)
  ) {
    throw new Error("This is not a valid PSBT.");
  }

  let offset = magic.length;
  let unsignedTransaction = null;

  /*
   * Parse only the PSBT global map. In PSBT v0 the unsigned transaction
   * is global key type 0x00 with a one-byte key.
   */
  while (offset < bytes.length) {
    const entry = readPsbtKeyValue(bytes, offset);
    offset = entry.offset;

    if (entry.separator) {
      break;
    }

    if (
      entry.key.length === 1 &&
      entry.key[0] === 0x00
    ) {
      unsignedTransaction = entry.value;
    }
  }

  if (!unsignedTransaction) {
    throw new Error(
      "No unsigned transaction was found. This preview currently expects a PSBT v0 such as Bitcoin Knots createpsbt produces."
    );
  }

  return unsignedTransaction;
}


function extractOpReturnHexFromRawTransaction(transaction) {
  let offset = 0;

  function requireBytes(count) {
    if (offset + count > transaction.length) {
      throw new Error("Malformed unsigned transaction.");
    }
  }

  // version
  requireBytes(4);
  offset += 4;

  const inputCount = readCompactSize(transaction, offset);
  offset += inputCount.size;

  for (let i = 0; i < inputCount.value; i++) {
    // previous txid + vout
    requireBytes(36);
    offset += 36;

    const scriptLength = readCompactSize(transaction, offset);
    offset += scriptLength.size;

    requireBytes(scriptLength.value + 4); // scriptSig + sequence
    offset += scriptLength.value + 4;
  }

  const outputCount = readCompactSize(transaction, offset);
  offset += outputCount.size;

  const opReturns = [];

  for (let i = 0; i < outputCount.value; i++) {
    // amount
    requireBytes(8);
    offset += 8;

    const scriptLength = readCompactSize(transaction, offset);
    offset += scriptLength.size;

    requireBytes(scriptLength.value);
    const script = transaction.slice(offset, offset + scriptLength.value);
    offset += scriptLength.value;

    if (script.length > 0 && script[0] === 0x6a) {
      opReturns.push(script);
    }
  }

  if (opReturns.length === 0) {
    throw new Error("This PSBT does not contain an OP_RETURN output.");
  }

  if (opReturns.length > 1) {
    throw new Error(
      "This PSBT contains more than one OP_RETURN output. Preview refused."
    );
  }

  const script = opReturns[0];

  /*
   * Continuum inscriptions use one direct data push after OP_RETURN.
   * Support direct pushes (1-75 bytes) and OP_PUSHDATA1.
   */
  if (script.length < 2) {
    throw new Error("The OP_RETURN output contains no message.");
  }

  let payloadLength;
  let payloadOffset;

  if (script[1] >= 0x01 && script[1] <= 0x4b) {
    payloadLength = script[1];
    payloadOffset = 2;
  } else if (script[1] === 0x4c) {
    if (script.length < 3) {
      throw new Error("Malformed OP_RETURN output.");
    }

    payloadLength = script[2];
    payloadOffset = 3;
  } else {
    throw new Error(
      "The OP_RETURN output does not use a supported single data push."
    );
  }

  if (payloadOffset + payloadLength !== script.length) {
    throw new Error(
      "The OP_RETURN output contains unexpected script data. Preview refused."
    );
  }

  return bytesToHex(
    script.slice(payloadOffset, payloadOffset + payloadLength)
  );
}


// The catalog metadata is intentionally separate from the on-chain inscription.
// textContent prevents user-authored descriptions/titles from becoming HTML.
function renderRecordMetadata(record) {
  const section = document.getElementById("record-details");
  const image = document.getElementById("milestone-image");
  const descWrap = document.getElementById("record-description-wrap");
  const brand = document.getElementById("site-brand");
  const defaultBrand = "Continuum Memorials And Milestones";
  brand.textContent = defaultBrand;
  section.hidden = true;
  image.hidden = true;
  image.removeAttribute("src");
  descWrap.hidden = true;
  document.getElementById("record-details-heading").textContent = "";
  document.getElementById("milestone-description").textContent = "";
  if (!record || typeof record !== "object") return;

  if (record.type === "memorial") brand.textContent = "Continuum Memorial";
  else if (record.type === "milestone") brand.textContent = "Continuum Milestone";

  const title = typeof record.title === "string" ? record.title.trim() : "";
  const description = typeof record.description === "string" ? record.description.trim() : "";
  const imageUrl = typeof record.image === "string" ? record.image.trim() : "";
  if (!title && !description && !imageUrl) return;

  document.getElementById("record-details-heading").textContent = title ||
    (record.type === "memorial" ? "About this memorial" : "About this milestone");
  if (imageUrl) {
    image.src = imageUrl;
    image.alt = title ? `Image for ${title}` : "Memorial or milestone image";
    image.hidden = false;
  }
  if (description) {
    document.getElementById("milestone-description").textContent = description;
    descWrap.hidden = false;
  }
  section.hidden = false;
}

async function findRecordByTxid(txid) {
  // A direct ?txid= URL must work even when the catalog is absent or offline.
  try {
    const response = await fetch("index.json", {cache: "no-store"});
    if (!response.ok) return null;
    const data = await response.json();
    return (Array.isArray(data.records) ? data.records : []).find(
      r => r.bitcoin?.txid?.toLowerCase() === txid.toLowerCase()
    ) || null;
  } catch (error) {
    console.warn("Optional catalog metadata unavailable:", error);
    return null;
  }
}

async function loadMemorial() {
  const params = new URLSearchParams(window.location.search);
  const txid = params.get("txid");
  if (!txid) {
    await loadCatalog();
    return;
  }
  await showBitcoinMemorial(txid, await findRecordByTxid(txid));
}

async function showBitcoinMemorial(txid, record = null) {
  const status = document.getElementById("status");
  const memorial = document.getElementById("memorial");
  const message = document.getElementById("message");
  const permanence = document.getElementById("permanence");
  const verification = document.getElementById("verification");
  const previewMeta = document.getElementById("preview-meta");
  if (!/^[0-9a-fA-F]{64}$/.test(txid)) {
    status.textContent = "The Bitcoin transaction ID is invalid.";
    status.classList.add("error");
    return;
  }
  try {
    const explorers = [
      {name: "mempool.space", api: `https://mempool.space/api/tx/${txid}`, page: `https://mempool.space/tx/${txid}`},
      {name: "Blockstream", api: `https://blockstream.info/api/tx/${txid}`, page: `https://blockstream.info/tx/${txid}`},
      {name: "mempool.space (onion mirror not supported in browser)", api: null, page: null}
    ];
    let transaction, source, lastError;
    for (const explorer of explorers.filter(x => x.api)) {
      try {
        const response = await fetch(explorer.api, {signal: AbortSignal.timeout(8000)});
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const candidate = await response.json();
        if (!Array.isArray(candidate.vout)) throw new Error("Unexpected transaction data");
        transaction = candidate; source = explorer; break;
      } catch (e) { lastError = e; }
    }
    if (!transaction) throw new Error("No explorer could provide the transaction: " + (lastError?.message || "unknown error"));

    const opReturnOutput = transaction.vout.find(output =>
      output.scriptpubkey_type === "op_return"
    );

    if (!opReturnOutput) {
      throw new Error(
        "This transaction does not contain an OP_RETURN memorial."
      );
    }

    const hex = getOpReturnHex(opReturnOutput);

    if (!hex) {
      throw new Error(
        "Unable to read the OP_RETURN memorial."
      );
    }

    const memorialText = hexToUtf8(hex);

    message.textContent = memorialText;
    renderRecordMetadata(record);

    permanence.hidden = false;
    previewMeta.hidden = true;
    const sourceLabel = document.getElementById("explorer-source");
    sourceLabel.textContent = `Inscription retrieved from ${source.name}`;
    const links = document.getElementById("explorer-links");
    links.replaceChildren();
    for (const explorer of explorers.filter(x => x.page)) {
      const a = document.createElement("a");
      a.href = explorer.page;
      a.textContent = explorer.name + " ↗";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      links.append(a);
    }
    verification.hidden = false;
    document.getElementById("catalog").hidden = true;
    status.hidden = true;
    memorial.hidden = false;

  } catch (error) {

    console.error(error);

    status.textContent =
      error.message || "Unable to load memorial.";

    status.classList.add("error");
  }
}


if (document.getElementById("catalog")) loadMemorial();
