// Inject injected.js into the page context
const script = document.createElement("script");

script.src = chrome.runtime.getURL("injected.js");

script.onload = function () {
  this.remove();
};

(document.head || document.documentElement)
  .appendChild(script);


// Relay requests from injected.js to background.js.
// background.js performs the localhost fetch.
window.addEventListener("message", async (event) => {
  if (
    event.source !== window ||
    event.data?.source !== "continuum-signer-request"
  ) {
    return;
  }

  const { id, payload } = event.data;

  try {
    const response = await chrome.runtime.sendMessage({
      url: payload.url,
      options: payload.options || {},
      origin: window.location.origin
    });

    if (response?.error) {
      window.postMessage(
        {
          source: "continuum-signer-response",
          id,
          error: response.error
        },
        "*"
      );

      return;
    }

    window.postMessage(
      {
        source: "continuum-signer-response",
        id,
        result: response.result
      },
      "*"
    );
  } catch (error) {
    window.postMessage(
      {
        source: "continuum-signer-response",
        id,
        error: error.message || String(error)
      },
      "*"
    );
  }
});