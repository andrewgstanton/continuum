
// helper functions

async function verifySshRsaPkcs1v15Sha256(proof) {
  const publicKey = await importOpenSshRsaPublicKey(proof.public_key_openssh);

  const signatureBytes = base64ToBytes(proof.signature);
  const messageBytes = new TextEncoder().encode(proof.message);

  return await crypto.subtle.verify(
    {
      name: "RSASSA-PKCS1-v1_5"
    },
    publicKey,
    signatureBytes,
    messageBytes
  );
}

async function importOpenSshRsaPublicKey(openSshKey) {
  const parts = openSshKey.trim().split(/\s+/);

  if (parts[0] !== "ssh-rsa") {
    throw new Error(`Unsupported SSH public key type: ${parts[0]}`);
  }

  const keyBytes = base64ToBytes(parts[1]);
  const reader = makeSshReader(keyBytes);

  const keyType = reader.readStringAsText();
  if (keyType !== "ssh-rsa") {
    throw new Error(`SSH key blob type mismatch: ${keyType}`);
  }

  const exponent = reader.readMpint();
  const modulus = reader.readMpint();

  const jwk = {
    kty: "RSA",
    e: bytesToBase64Url(stripLeadingZeros(exponent)),
    n: bytesToBase64Url(stripLeadingZeros(modulus)),
    alg: "RS256",
    ext: true
  };

  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["verify"]
  );
}

function makeSshReader(bytes) {
  let offset = 0;

  function readUint32() {
    if (offset + 4 > bytes.length) {
      throw new Error("Unexpected end of SSH key while reading uint32.");
    }

    const value =
      (bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3];

    offset += 4;
    return value >>> 0;
  }

  function readString() {
    const len = readUint32();

    if (offset + len > bytes.length) {
      throw new Error("Unexpected end of SSH key while reading string.");
    }

    const value = bytes.slice(offset, offset + len);
    offset += len;
    return value;
  }

  return {
    readString,
    readStringAsText() {
      return new TextDecoder().decode(readString());
    },
    readMpint() {
      return readString();
    }
  };
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function bytesToBase64Url(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function stripLeadingZeros(bytes) {
  let i = 0;

  while (i < bytes.length - 1 && bytes[i] === 0) {
    i++;
  }

  return bytes.slice(i);
}


async function addSshProofResult({ verification, zip, signers, manifest, artifactName }) {
  const signer = findSigner(signers, "ssh");
  const included = !!manifest.includes_ssh_proof || !!signer;

  if (!included) {
    verification.results.push({
      name: "SSH",
      included: false,
      ok: null,
      message: "SSH proof was not included.",
      details: null
    });
    return;
  }

  const proofPath =
    signer?.proof_file ||
    signer?.proof_filename ||
    signer?.proof ||
    `${artifactName}.ssh-proof.json`;

  const proof = proofPath
    ? await readOptionalJsonFromZip(zip, proofPath)
    : null;

  if (!proof) {
    verification.overall_ok = false;

    verification.results.push({
      name: "SSH",
      included: true,
      ok: false,
      message: "SSH proof JSON was not found.",
      details: {
        expected_proof_file: proofPath,
        zip_files: Object.keys(zip.files)
      }
    });

    return;
  }

  try {
    const expectedHash =
      manifest.artifact_sha256 || manifest.sha256;

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
      proof.message.includes(
        `artifact_filename: ${proof.artifact_filename}`
      );

    const messageContainsHash =
      proof.message.includes(
        `sha256: ${proof.artifact_sha256}`
      );

    const messageContainsFingerprint =
      proof.message.includes(
        `fingerprint: ${proof.identity_fingerprint}`
      );

    // TEMPORARY:
    // actual RSA signature verification not wired yet
    const sshSignatureValid =
        await verifySshRsaPkcs1v15Sha256(proof);

    const checks = {
      message_sha256_matches: messageHashMatches,
      artifact_filename_matches_manifest: artifactFilenameMatches,
      artifact_sha256_matches_manifest: artifactHashMatches,
      message_contains_artifact_filename: messageContainsFilename,
      message_contains_artifact_sha256: messageContainsHash,
      message_contains_fingerprint: messageContainsFingerprint,
      ssh_signature_vaid: sshSignatureValid
    };

    const failedChecks = Object.entries(checks)
      .filter(([_, passed]) => !passed)
      .map(([name]) => name);

    const ok = failedChecks.length === 0;

    if (!ok) verification.overall_ok = false;

    verification.results.push({
      name: "SSH",
      included: true,
      ok,
      message: ok
        ? "SSH key attestation verified."
        : `SSH key attestation verification failed: ${failedChecks.join(", ")}.`,
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
      name: "SSH",
      included: true,
      ok: false,
      message: "SSH key attestation verification failed.",
      details: {
        proof_file: proofPath,
        proof,
        error: err.message || String(err)
      }
    });
  }
}