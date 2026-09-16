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


function renderPreview(psbtText) {
  const status = document.getElementById("status");
  const previewPanel = document.getElementById("preview-panel");
  const memorial = document.getElementById("memorial");
  const message = document.getElementById("message");
  const permanence = document.getElementById("permanence");
  const verifyLink = document.getElementById("verify-link");
  const previewMeta = document.getElementById("preview-meta");

  const unsignedTransaction =
    extractUnsignedTransactionFromPsbt(psbtText);

  const opReturnHex =
    extractOpReturnHexFromRawTransaction(unsignedTransaction);

  const memorialText = hexToUtf8(opReturnHex);

  message.textContent = memorialText;

  permanence.hidden = true;
  verifyLink.hidden = true;
  previewMeta.hidden = false;

  status.hidden = true;
  previewPanel.hidden = true;
  memorial.hidden = false;
}


function showPreviewForm() {
  const status = document.getElementById("status");
  const previewPanel = document.getElementById("preview-panel");
  const previewButton = document.getElementById("preview-button");
  const psbtInput = document.getElementById("psbt-input");

  status.hidden = true;
  previewPanel.hidden = false;

  previewButton.addEventListener("click", () => {
    try {
      status.classList.remove("error");
      renderPreview(psbtInput.value);
    } catch (error) {
      console.error(error);

      status.textContent =
        error.message || "Unable to preview inscription.";

      status.classList.add("error");
      status.hidden = false;
    }
  });
}


async function loadMemorial() {
  const status = document.getElementById("status");
  const memorial = document.getElementById("memorial");
  const message = document.getElementById("message");
  const permanence = document.getElementById("permanence");
  const verifyLink = document.getElementById("verify-link");
  const previewMeta = document.getElementById("preview-meta");

  const params = new URLSearchParams(window.location.search);

  const txid = params.get("txid");

  /*
   * No TXID now means preview mode rather than an error.
   */
  if (!txid) {
    showPreviewForm();
    return;
  }

  if (!/^[0-9a-fA-F]{64}$/.test(txid)) {
    status.textContent = "The Bitcoin transaction ID is invalid.";
    status.classList.add("error");
    return;
  }

  try {

    const response = await fetch(
      `https://mempool.space/api/tx/${txid}`
    );

    if (!response.ok) {
      throw new Error("Bitcoin transaction not found.");
    }

    const transaction = await response.json();

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

    permanence.hidden = false;
    previewMeta.hidden = true;
    verifyLink.hidden = false;
    verifyLink.href =
      `https://mempool.space/tx/${txid}`;

    status.hidden = true;
    memorial.hidden = false;

  } catch (error) {

    console.error(error);

    status.textContent =
      error.message || "Unable to load memorial.";

    status.classList.add("error");
  }
}


loadMemorial();
