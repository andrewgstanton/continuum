    async function addPgpResult({ verification, zip, signers, manifest, artifactBytes, zipFiles }) {
      const artifactName = verification.artifact_filename;
      const signer = findSigner(signers, "pgp");
      const included = !!manifest.includes_pgp_proof || !!manifest.includes_pgp_signature || !!signer;

      if (!included) {
        verification.results.push({
          name: "PGP",
          included: false,
          ok: null,
          message: "PGP proof was not included.",
          details: null
        });
        return;
      }

      if (!artifactBytes) {
        verification.overall_ok = false;
        verification.results.push({
          name: "PGP",
          included: true,
          ok: false,
          message: "PGP verification skipped because artifact was not available.",
          details: signer || null
        });
        return;
      }

      const signaturePath =
        signer?.signature_file ||
        signer?.signature_filename ||
        signer?.signature ||
        (artifactName && artifactName !== "(unknown)" ? `${artifactName}.asc` : null);

      const publicKeyPath =
        signer?.public_key_file ||
        signer?.public_key_filename ||
        signer?.public_key ||
        signer?.pubkey ||
        "pgp-public-key.asc";

      const proofPath =
        signer?.proof_file ||
        signer?.proof_filename ||
        signer?.proof ||
        (artifactName && artifactName !== "(unknown)" ? `${artifactName}.pgp-proof.json` : null);

      const sigFile = signaturePath ? zip.file(signaturePath) : null;
      const pubFile = publicKeyPath ? zip.file(publicKeyPath) : null;
      const proof = proofPath ? await readOptionalJsonFromZip(zip, proofPath) : null;

      if (!sigFile || !pubFile) {
        verification.has_warnings = true;
        verification.results.push({
          name: "PGP",
          included: true,
          ok: null,
          message: "PGP proof included, but browser verifier could not locate the detached signature and/or public key file.",
          details: {
            signer,
            expected_signature_file: signaturePath,
            expected_public_key_file: publicKeyPath,
            expected_proof_file: proofPath,
            zip_files: zipFiles
          }
        });
        return;
      }

      try {
        const armoredSignature = await sigFile.async("text");
        const armoredKey = await pubFile.async("text");
        const signature = await openpgp.readSignature({ armoredSignature });
        const verificationKeys = await openpgp.readKey({ armoredKey });

        const candidates = await buildPgpCandidateMessages({
          artifactBytes,
          manifest,
          signers,
          proof,
          artifactName
        });

        let matched = null;
        let lastError = null;
        const attempted = [];

        for (const candidate of candidates) {
          attempted.push(candidate.label);
          try {
            const result = await openpgp.verify({
              message: candidate.message,
              signature,
              verificationKeys
            });

            await result.signatures[0].verified;
            matched = candidate.label;
            break;
          } catch (err) {
            lastError = err;
          }
        }

        if (!matched) {
          throw new Error(`No PGP candidate matched. Last error: ${lastError?.message || lastError}`);
        }

        verification.results.push({
          name: "PGP",
          included: true,
          ok: true,
          message: "PGP detached signature verified.",
          details: {
            ...(proof || {}),
            signature_file: signaturePath,
            public_key_file: publicKeyPath,
            proof_file: proofPath,
            matched_payload: matched
          }
        });
      } catch (err) {
        verification.overall_ok = false;
        verification.results.push({
          name: "PGP",
          included: true,
          ok: false,
          message: "PGP detached signature verification failed.",
          details: {
            signer,
            signature_file: signaturePath,
            public_key_file: publicKeyPath,
            proof_file: proofPath,
            proof,
            error: err.message || String(err)
          }
        });
      }
    }

 
    async function buildPgpCandidateMessages({ artifactBytes, manifest, signers, proof, artifactName }) {
      const candidates = [];
      const addText = async (label, text) => {
        if (text === undefined || text === null) return;
        candidates.push({ label, message: await openpgp.createMessage({ text: String(text) }) });
      };
      const addBinary = async (label, bytes) => {
        if (!bytes) return;
        candidates.push({ label, message: await openpgp.createMessage({ binary: bytes }) });
      };

      await addBinary("raw artifact bytes", artifactBytes);
      await addText("artifact sha256", manifest.artifact_sha256 || manifest.sha256);
      await addText("artifact sha256 newline", `${manifest.artifact_sha256 || manifest.sha256 || ""}\n`);
      await addText("artifact filename + sha256", `${artifactName}\n${manifest.artifact_sha256 || manifest.sha256 || ""}`);
      await addText("artifact filename + sha256 newline", `${artifactName}\n${manifest.artifact_sha256 || manifest.sha256 || ""}\n`);
      await addText("manifest json compact", JSON.stringify(manifest));
      await addText("manifest json pretty", JSON.stringify(manifest, null, 2));
      await addText("manifest json canonical", canonicalJson(manifest));
      await addText("signers json compact", JSON.stringify(signers));
      await addText("signers json pretty", JSON.stringify(signers, null, 2));
      await addText("signers json canonical", canonicalJson(signers));

      if (proof) {
        await addText("pgp proof json compact", JSON.stringify(proof));
        await addText("pgp proof json pretty", JSON.stringify(proof, null, 2));
        await addText("pgp proof json canonical", canonicalJson(proof));

        for (const key of [
          "message",
          "signed_message",
          "signed_payload",
          "payload",
          "canonical_payload",
          "artifact_sha256",
          "sha256",
          "digest",
          "text"
        ]) {
          if (proof[key] !== undefined && proof[key] !== null) {
            await addText(`pgp proof field: ${key}`, proof[key]);
            await addText(`pgp proof field newline: ${key}`, `${proof[key]}\n`);
          }
        }
      }

      return candidates;
    }
    