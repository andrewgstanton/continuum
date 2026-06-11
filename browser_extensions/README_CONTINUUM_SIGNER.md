# Continuum Browser Extension Setup

This extension allows websites that support NIP-07 browser signing to connect to a locally running Continuum desktop app.

The browser extension lives in:

browser_extensions/continuum_signer

Continuum itself is installed separately using the latest desktop binary release available from:

https://mycontinuum.xyz

---

## Verified working sites

I was able to successfully login using Continuum browser signing on:

- https://primal.net
- https://coracle.social
- https://iris.to

This suggests the localhost → browser extension → Continuum → NIP-07 flow is functioning.

Sites currently being tested:

- https://brainstorm.nosfabrica.com
- https://relayop.xyz

If these do not work, there may be site-specific restrictions or browser signing origin configuration issues.

---

## 1. Install Continuum

Download and install the latest Continuum desktop app.

Launch Continuum.

Create or import an identity.

---

## 2. Enable browser signing

Open the identity you want to use.

Enable:

Browser Signing

**Browser signing must be enabled for the identity.**

---

## 3. Add approved origin URLs

**Browser signing only works for approved origins.**

Open identity settings.

Add allowed origins for the sites you want to use.

Example:

https://brainstorm.nosfabrica.com
https://relayop.xyz
https://primal.net
https://coracle.social
https://iris.to

Save changes.

If the target URL is missing from approved origins, signing requests will be rejected.

---

## 4. Configure browser signing token

macOS:

~/Library/Application Support/Continuum/data/env/continuum.env

Add (or create) the environment file in the directory data/env -> continuum.env

#
# For browser signing (NIP-07 capability)
#

CONTINUUM_BROWSER_SIGNING_TOKEN=<SOME_RANDOM_STRING>

Example:

CONTINUUM_BROWSER_SIGNING_TOKEN=my_local_browser_token

Restart Continuum after making changes.

---

## 5. Clone the Continuum repo

git clone https://github.com/andrewgstanton/continuum.git
cd continuum

Browser extension location:

browser_extensions/continuum_signer

---

## 6. Configure extension token

Open:

browser_extensions/background.js

Find the token configuration.

Set it to the exact same value used in:

~/Library/Application Support/Continuum/data/env/continuum.env

**Extension token and Continuum token must match.**

Reload the extension after changes.

---

## 7. Load extension into Chrome / Brave

Open:

chrome://extensions

Enable:

Developer mode

Click:

Load unpacked

Select:

browser_extensions/continuum_signer

---

## 8. Test login

Verify:

- Continuum is running
- Browser signing is enabled
- Approved origins are configured
- Tokens match

Then attempt login using NIP-07.

---

## Troubleshooting

### Login works on Primal but not another site

- Verify origin URL is approved
- Reload extension
- Restart Continuum
- Refresh page
- Check Continuum console logs

### Login stops working after extension reload

Try:

1. Disable extension
2. Reload extension
3. Restart Continuum
4. Refresh browser

### Token mismatch

Verify:

CONTINUUM_BROWSER_SIGNING_TOKEN

matches EXACTLY in:

continuum.env

and

background.js

---

## License 


The Continuum browser extension is released under the MIT License.

This repository contains browser-side integration code intended to enable local browser signing with Continuum.

Continuum v1.0.0 is available in this repository under the MIT License.

The current Continuum release is v1.6.8.0, which is not open source at this time. 

The latest version is available separately as a downloadable desktop binary or Docker-based setup.

Copyright (c) 2025-2026 Andrew G. Stanton

See LICENSE for full details.

