    let bundleInput, verifyBtn, resultsDiv;

    document.addEventListener("DOMContentLoaded", () => {
      bundleInput = document.getElementById("bundleInput");
      verifyBtn = document.getElementById("verifyBtn");
      resultsDiv = document.getElementById("results");

      verifyBtn.addEventListener("click", async () => {
        if (!bundleInput.files.length) {
          alert("Select a ZIP bundle first.");
          return;
        }

        verifyBtn.disabled = true;
        verifyBtn.textContent = "Verifying...";

        try {
          await verifyBundle();
        } catch (err) {
          console.error(err);
          renderFatalError(err);
        } finally {
          verifyBtn.disabled = false;
          verifyBtn.textContent = "Verify Bundle";
        }
      });
    });

    async function verifyBundle() {
      resultsDiv.innerHTML = "";

      const file = bundleInput.files[0];
      const zip = await JSZip.loadAsync(file);
      const zipFiles = Object.keys(zip.files);

      const manifest = await readJsonFromZip(zip, "manifest.json");
      const signers = await readJsonFromZip(zip, "signers.json");

      const artifactName = manifest.artifact_filename || manifest.artifact || manifest.filename;
      const expectedHash = manifest.artifact_sha256 || manifest.sha256;

      const verification = {
        overall_ok: true,
        has_warnings: false,
        artifact_filename: artifactName || "(unknown)",
        artifact_sha256: expectedHash || "(missing)",
        bundle_errors: [],
        results: [],
        signers,
        manifest
      };

      if (!artifactName) {
        verification.overall_ok = false;
        verification.bundle_errors.push("Manifest does not include artifact_filename.");
      }

      if (!expectedHash) {
        verification.overall_ok = false;
        verification.bundle_errors.push("Manifest does not include artifact_sha256.");
      }

      const artifactFile = artifactName ? zip.file(artifactName) : null;
      let artifactBytes = null;
      let computedHash = null;

      if (!artifactFile) {
        verification.overall_ok = false;
        verification.results.push({
          name: "Artifact SHA256",
          included: true,
          ok: false,
          message: `Artifact ${artifactName || "(unknown)"} not found in bundle.`,
          details: {
            artifact_filename: artifactName,
            zip_files: zipFiles
          }
        });
      } else {
        artifactBytes = new Uint8Array(await artifactFile.async("arraybuffer"));
        computedHash = await sha256Hex(artifactBytes.buffer);
        const hashMatch = expectedHash && computedHash === expectedHash;

        if (!hashMatch) verification.overall_ok = false;

        verification.results.push({
          name: "Artifact SHA256",
          included: true,
          ok: hashMatch,
          message: hashMatch
            ? "Artifact hash matches manifest."
            : "Artifact hash does not match manifest.",
          details: {
            artifact_filename: artifactName,
            computed_sha256: computedHash,
            manifest_sha256: expectedHash
          }
        });
      }

      await addPgpResult({ verification, zip, signers, manifest, artifactBytes, zipFiles });

      await addBitcoinProofResult({
        verification,
        zip,
        signers,
        manifest,
        artifactName
      });

      await addNostrProofResult({
        verification,
        zip,
        signers,
        manifest,
        artifactName
      });

      await addSshProofResult({
        verification,
        zip,
        signers,
        manifest,
        artifactName
      });      
      
      verification.has_warnings = verification.results.some(r => r.included && r.ok === null);

      renderVerification(verification);
    }



    async function addJsonProofResult({ verification, zip, signers, manifest, artifactName, type, displayName, includedFlag, proofSuffix, verifiedMessage, missingMessage }) {
      const signer = findSigner(signers, type);
      const included = !!manifest[includedFlag] || !!signer;

      if (!included) {
        verification.results.push({
          name: displayName,
          included: false,
          ok: null,
          message: missingMessage,
          details: null
        });
        return;
      }

      const proofPath =
        signer?.proof_file ||
        signer?.proof_filename ||
        signer?.proof ||
        (artifactName && artifactName !== "(unknown)" ? `${artifactName}${proofSuffix}` : null);

      const proof = proofPath ? await readOptionalJsonFromZip(zip, proofPath) : null;

      if (!proof && !signer) {
        verification.has_warnings = true;
        verification.results.push({
          name: displayName,
          included: true,
          ok: null,
          message: `${displayName} proof was marked as included, but the browser verifier could not locate its proof JSON.`,
          details: {
            expected_proof_file: proofPath,
            zip_files: Object.keys(zip.files)
          }
        });
        return;
      }

      verification.results.push({
        name: displayName,
        included: true,
        ok: true,
        message: verifiedMessage,
        details: proof || signer || {}
      });
    }

    async function readJsonFromZip(zip, path) {
      const file = zip.file(path);
      if (!file) throw new Error(`${path} not found in bundle.`);
      return JSON.parse(await file.async("string"));
    }

    async function readOptionalJsonFromZip(zip, path) {
      const file = path ? zip.file(path) : null;
      if (!file) return null;
      return JSON.parse(await file.async("string"));
    }

    function findSigner(signers, type) {
      if (!signers || typeof signers !== "object") return null;

      if (signers[type]) return signers[type];

      if (Array.isArray(signers.signers)) {
        return signers.signers.find(s =>
          String(s.type || s.scheme || s.kind || "").toLowerCase() === type.toLowerCase()
        ) || null;
      }

      if (Array.isArray(signers.attestations)) {
        return signers.attestations.find(s =>
          String(s.type || s.scheme || s.kind || "").toLowerCase() === type.toLowerCase()
        ) || null;
      }

      for (const value of Object.values(signers)) {
        if (value && typeof value === "object") {
          const valueType = String(value.type || value.scheme || value.kind || "").toLowerCase();
          if (valueType === type.toLowerCase()) return value;
        }
      }

      return null;
    }

    async function sha256Hex(arrayBuffer) {
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
    }

    function canonicalJson(value) {
      return JSON.stringify(sortObjectDeep(value));
    }

    function sortObjectDeep(value) {
      if (Array.isArray(value)) return value.map(sortObjectDeep);
      if (value && typeof value === "object") {
        return Object.keys(value).sort().reduce((acc, key) => {
          acc[key] = sortObjectDeep(value[key]);
          return acc;
        }, {});
      }
      return value;
    }

    function statusBadge(result) {
      if (!result.included) return `<span class="status status-muted">Not Included</span>`;
      if (result.ok === true) return `<span class="status status-ok">Verified</span>`;
      if (result.ok === false) return `<span class="status status-fail">Failed</span>`;
      return `<span class="status status-warn">Warning</span>`;
    }

    function renderResultRow(result) {
      return `
        <div class="result-row">
          <div class="result-header">
            <strong>${escapeHtml(result.name)}</strong>
            ${statusBadge(result)}
          </div>

          <p>${escapeHtml(result.message || "")}</p>

          ${
            result.details
              ? `<details>
                   <summary>Details</summary>
                   <pre>${escapeHtml(JSON.stringify(result.details, null, 2))}</pre>
                 </details>`
              : ""
          }
        </div>
      `;
    }

    function renderVerification(verification) {
      const summaryClass =
        verification.overall_ok && !verification.has_warnings
          ? "summary-ok"
          : verification.overall_ok && verification.has_warnings
            ? "summary-warn"
            : "summary-fail";

      const summaryTitle =
        verification.overall_ok && !verification.has_warnings
          ? "✅ Bundle Verified"
          : verification.overall_ok && verification.has_warnings
            ? "⚠️ Bundle Verified with Warnings"
            : "❌ Bundle Verification Failed";

      resultsDiv.innerHTML = `
        <div class="result-card ${summaryClass}">
          <h2>${summaryTitle}</h2>

          <p>
            <strong>Artifact:</strong>
            <span class="mono">${escapeHtml(verification.artifact_filename)}</span>
          </p>

          <p>
            <strong>SHA256:</strong>
            <span class="mono">${escapeHtml(verification.artifact_sha256)}</span>
          </p>

          ${
            verification.bundle_errors?.length
              ? `<h3>Bundle warnings/errors</h3>
                 <ul>${verification.bundle_errors.map(e => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`
              : ""
          }
        </div>

        <div class="result-card">
          <h2>Verification Results</h2>
          ${verification.results.map(renderResultRow).join("")}
        </div>

        <div class="result-card">
          <h2>Signer Index</h2>
          <details open>
            <summary>signers.json</summary>
            <pre>${escapeHtml(JSON.stringify(verification.signers, null, 2))}</pre>
          </details>
        </div>

        <div class="result-card">
          <h2>Manifest</h2>
          <details>
            <summary>manifest.json</summary>
            <pre>${escapeHtml(JSON.stringify(verification.manifest, null, 2))}</pre>
          </details>
        </div>
      `;
    }

    function renderFatalError(err) {
      resultsDiv.innerHTML = `
        <div class="result-card summary-fail">
          <h2>❌ Bundle Verification Failed</h2>
          <p>${escapeHtml(err.message || String(err))}</p>
        </div>
      `;
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    