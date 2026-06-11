let continuumBaseUrl = null;

function extensionFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();

    function handler(event) {
      if (
        event.source !== window ||
        event.data?.source !== "continuum-signer-response" ||
        event.data?.id !== id
      ) {
        return;
      }

      window.removeEventListener("message", handler);

      if (event.data.error) {
        reject(new Error(event.data.error));
        return;
      }

      resolve(event.data.result);
    }

    window.addEventListener("message", handler);

    window.postMessage(
      {
        source: "continuum-signer-request",
        id,
        payload: {
          url,
          options
        }
      },
      "*"
    );
  });
}

async function findContinuumBaseUrl() {
  if (continuumBaseUrl) {
    return continuumBaseUrl;
  }

  const hosts = [
    "127.0.0.1",
    "localhost"
  ];

  for (const host of hosts) {
    for (let port = 5000; port <= 5010; port++) {
      const baseUrl = `http://${host}:${port}`;

      try {
        await extensionFetch(
          `${baseUrl}/api/signer/public-key`,
          {
            method: "GET"
          }
        );

        continuumBaseUrl = baseUrl;

        console.log(
          `[Continuum Signer] Connected: ${baseUrl}`
        );

        return continuumBaseUrl;
      } catch (_) {
        // ignore unavailable ports
      }
    }
  }

  throw new Error(
    "Continuum signer not found (ports 5000–5010)"
  );
}

async function continuumFetch(path, options = {}) {
  const baseUrl = await findContinuumBaseUrl();

  return extensionFetch(
    `${baseUrl}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    }
  );
}

window.nostr = {
  async getPublicKey() {
    const data = await continuumFetch(
      "/api/signer/public-key",
      {
        method: "GET"
      }
    );

    console.log(
      "[Continuum Signer] getPublicKey returned",
      data.pubkey
    );

    return data.pubkey;
  },

  async signEvent(event) {
    const data = await continuumFetch(
      "/api/signer/sign-event",
      {
        method: "POST",
        body: JSON.stringify({
          event
        })
      }
    );

    console.log(
      "[Continuum Signer] signEvent returned",
      data.event
    );

    return data.event;
  },

  async getRelays() {
    console.log("[Continuum Signer] getRelays");

    return {};
  }
};

console.log(
  "[Continuum Signer] window.nostr installed"
);