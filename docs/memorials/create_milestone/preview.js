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



// Administrative page only: keep creation and preview off the public homepage.
document.getElementById("builder-panel").hidden = false;
showPreviewForm();
