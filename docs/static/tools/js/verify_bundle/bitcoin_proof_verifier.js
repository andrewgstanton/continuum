// helper functions

async function verifyBitcoinEcdsaSecp256k1Sha256(proof) {
  if (!window.nobleSecp) {
    throw new Error("noble secp256k1 verifier is not loaded.");
  }

  const derSignatureBytes = base64ToBytes(proof.signature);
  const compactSignatureHex = derToCompactEcdsaSignatureHex(derSignatureBytes);

  return window.nobleSecp.verify(
    compactSignatureHex,
    proof.message_sha256,
    proof.public_key_hex
  );
}

function derToCompactEcdsaSignatureHex(derBytes) {
  let offset = 0;

  if (derBytes[offset++] !== 0x30) {
    throw new Error("Invalid DER signature: expected sequence.");
  }

  const sequenceLength = derBytes[offset++];

  if (sequenceLength + 2 !== derBytes.length) {
    throw new Error("Invalid DER signature length.");
  }

  if (derBytes[offset++] !== 0x02) {
    throw new Error("Invalid DER signature: expected r integer.");
  }

  const rLength = derBytes[offset++];
  const r = derBytes.slice(offset, offset + rLength);
  offset += rLength;

  if (derBytes[offset++] !== 0x02) {
    throw new Error("Invalid DER signature: expected s integer.");
  }

  const sLength = derBytes[offset++];
  const s = derBytes.slice(offset, offset + sLength);

  const r32 = leftPad32(stripDerIntegerPadding(r));
  const s32 = leftPad32(stripDerIntegerPadding(s));

  return bytesToHex(concatBytes(r32, s32));
}

function stripDerIntegerPadding(bytes) {
  let i = 0;

  while (i < bytes.length - 1 && bytes[i] === 0x00) {
    i++;
  }

  return bytes.slice(i);
}

function leftPad32(bytes) {
  if (bytes.length > 32) {
    throw new Error("Invalid ECDSA integer longer than 32 bytes.");
  }

  const out = new Uint8Array(32);
  out.set(bytes, 32 - bytes.length);
  return out;
}

function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}


async function addBitcoinProofResult({ verification, zip, signers, manifest, artifactName }) {
  const signer = findSigner(signers, "bitcoin");
  const included = !!manifest.includes_bitcoin_proof || !!signer;

  if (!included) {
    verification.results.push({
      name: "Bitcoin",
      included: false,
      ok: null,
      message: "Bitcoin proof was not included.",
      details: null
    });
    return;
  }

  const proofPath =
    signer?.proof_file ||
    signer?.proof_filename ||
    signer?.proof ||
    `${artifactName}.bitcoin-proof.json`;

  const proof = proofPath
    ? await readOptionalJsonFromZip(zip, proofPath)
    : null;

  if (!proof) {
    verification.overall_ok = false;

    verification.results.push({
      name: "Bitcoin",
      included: true,
      ok: false,
      message: "Bitcoin proof JSON was not found.",
      details: {
        expected_proof_file: proofPath,
        zip_files: Object.keys(zip.files)
      }
    });

    return;
  }

  try {
    const expectedHash = manifest.artifact_sha256 || manifest.sha256;

    const computedMessageHash = await sha256Hex(
      new TextEncoder().encode(proof.message).buffer
    );

    const messageHashMatches =
      computedMessageHash === proof.message_sha256;

    const artifactFilenameMatches =
      proof.artifact_filename === artifactName;

    const artifactHashMatches =
      proof.artifact_sha256 === expectedHash;

    const messageContainsFilename =
      proof.message.includes(`artifact_filename: ${proof.artifact_filename}`);

    const messageContainsHash =
      proof.message.includes(`sha256: ${proof.artifact_sha256}`);

    const publicKeyMatches =
      proof.derived_public_key_hex
        ? proof.derived_public_key_hex === proof.public_key_hex
        : true;

    const bitcoinSignatureValid = await verifyBitcoinEcdsaSecp256k1Sha256(proof);

    const checks = {
      message_sha256_matches: messageHashMatches,
      artifact_filename_matches_manifest: artifactFilenameMatches,
      artifact_sha256_matches_manifest: artifactHashMatches,
      message_contains_artifact_filename: messageContainsFilename,
      message_contains_artifact_sha256: messageContainsHash,
      public_key_matches_derived_public_key: publicKeyMatches,
      bitcoin_signature_valid: bitcoinSignatureValid
    };

    const failedChecks = Object.entries(checks)
      .filter(([_, passed]) => !passed)
      .map(([name]) => name);

    const ok = failedChecks.length === 0;

    if (!ok) verification.overall_ok = false;

    verification.results.push({
      name: "Bitcoin",
      included: true,
      ok,
      message: ok
        ? "Bitcoin key attestation verified."
        : `Bitcoin key attestation verification failed: ${failedChecks.join(", ")}.`,
      details: {
        proof_file: proofPath,
        signature_scheme: proof.signature_scheme,
        signature_encoding: proof.signature_encoding,
        failed_checks: failedChecks,
        checks,
        proof
      }
    });

  } catch (err) {
    verification.overall_ok = false;

    verification.results.push({
      name: "Bitcoin",
      included: true,
      ok: false,
      message: "Bitcoin key attestation verification failed.",
      details: {
        proof_file: proofPath,
        proof,
        error: err.message || String(err)
      }
    });
  }
}