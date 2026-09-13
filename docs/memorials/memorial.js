function hexToUtf8(hex) {
  if (!hex || hex.length % 2 !== 0) {
    throw new Error("Invalid OP_RETURN data.");
  }

  const bytes = new Uint8Array(
    hex.match(/.{2}/g).map(byte => parseInt(byte, 16))
  );

  return new TextDecoder("utf-8").decode(bytes);
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


async function loadMemorial() {
  const status = document.getElementById("status");
  const memorial = document.getElementById("memorial");
  const message = document.getElementById("message");
  const verifyLink = document.getElementById("verify-link");

  const params = new URLSearchParams(window.location.search);

  const txid = params.get("txid");

  if (!txid) {
    status.textContent = "No Bitcoin transaction ID was provided.";
    status.classList.add("error");
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