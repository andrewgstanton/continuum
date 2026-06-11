const CONTINUUM_BROWSER_SIGNING_TOKEN =
  "REPLACE_WITH_YOUR_LOCAL_CONTINUUM_BROWSER_SIGNING_TOKEN";

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    (async () => {
      try {
        const response = await fetch(
          message.url,
          {
            ...(message.options || {}),
            headers: {
              "Content-Type": "application/json",
              "X-Continuum-Signer-Token": CONTINUUM_BROWSER_SIGNING_TOKEN,
              "X-Continuum-Origin": message.origin || "",
              ...((message.options || {}).headers || {})
            }
          }
        );

        if (!response.ok) {
          const text = await response.text();

          sendResponse({
            error: `HTTP ${response.status}: ${text}`
          });

          return;
        }

        const data = await response.json();

        sendResponse({
          result: data
        });
      } catch (error) {
        sendResponse({
          error: error.message || String(error)
        });
      }
    })();

    return true;
  }
);