    async function addNostrProofResult({ verification, zip, signers, manifest, artifactName }) {
      const signer = findSigner(signers, "nostr");
      const included = !!manifest.includes_nostr_proof || !!signer;

      if (!included) {
        verification.results.push({
          name: "Nostr",
          included: false,
          ok: null,
          message: "Nostr proof was not included.",
          details: null
        });
        return;
      }

      const proofPath =
        signer?.proof_file ||
        signer?.proof_filename ||
        signer?.proof ||
        `${artifactName}.nostr-proof.json`;

      const proof = await readOptionalJsonFromZip(zip, proofPath);

      if (!proof) {
        verification.overall_ok = false;
        verification.results.push({
          name: "Nostr",
          included: true,
          ok: false,
          message: "Nostr proof JSON was not found.",
          details: { expected_proof_file: proofPath }
        });
        return;
      }

      try {
        const expectedHash = manifest.artifact_sha256 || manifest.sha256;

        const computedMessageHash = await sha256Hex(
          new TextEncoder().encode(proof.message).buffer
        );

        const messageHashMatches = computedMessageHash === proof.message_sha256;
        const artifactFilenameMatches = proof.artifact_filename === artifactName;
        const artifactHashMatches = proof.artifact_sha256 === expectedHash;

        const messageContainsFilename = proof.message.includes(`artifact_filename: ${proof.artifact_filename}`);
        const messageContainsHash = proof.message.includes(`sha256: ${proof.artifact_sha256}`);
        const messageContainsPubkey = proof.message.includes(`pubkey: ${proof.pubkey}`);

        const signatureValid = window.nostrSchnorr.verify(
          proof.signature,
          proof.message_sha256,
          proof.pubkey
        );        

        const checks = {
          message_sha256_matches: messageHashMatches,
          artifact_filename_matches_manifest: artifactFilenameMatches,
          artifact_sha256_matches_manifest: artifactHashMatches,
          message_contains_artifact_filename: messageContainsFilename,
          message_contains_artifact_sha256: messageContainsHash,
          message_contains_pubkey: messageContainsPubkey,
          schnorr_signature_valid: signatureValid
        };

        const failedChecks = Object.entries(checks)
          .filter(([_, passed]) => !passed)
          .map(([name]) => name);
                  
        const ok =
          messageHashMatches &&
          artifactFilenameMatches &&
          artifactHashMatches &&
          messageContainsFilename &&
          messageContainsHash &&
          messageContainsPubkey &&
          signatureValid;

        if (!ok) verification.overall_ok = false;

        verification.results.push({
          name: "Nostr",
          included: true,
          ok,
          message: ok
            ? "Nostr key attestation verified."
            : `Nostr key attestation verification failed: ${failedChecks.join(", ")}.`,
          details: {
            proof_file: proofPath,
            signature_scheme: proof.signature_scheme,
            signature_encoding: proof.signature_encoding,

            failed_checks: failedChecks,

            checks: {
              message_sha256_matches: messageHashMatches,
              artifact_filename_matches_manifest: artifactFilenameMatches,
              artifact_sha256_matches_manifest: artifactHashMatches,
              message_contains_artifact_filename: messageContainsFilename,
              message_contains_artifact_sha256: messageContainsHash,
              message_contains_pubkey: messageContainsPubkey,
              schnorr_signature_valid: signatureValid
            },

            proof
          }
        });
      } catch (err) {
        verification.overall_ok = false;
        verification.results.push({
          name: "Nostr",
          included: true,
          ok: false,
          message: "Nostr key attestation verification failed.",
          details: {
            proof_file: proofPath,
            proof,
            error: err.message || String(err)
          }
        });
      }
    }
