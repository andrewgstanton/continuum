# Promote a pending photo to a permanent memorial or milestone

These instructions use the **Cloudflare Dashboard** (no Wrangler required).

## 1. Identify the order

Find the order ID in your order notification email, e.g. `CM-ABCDEF123456`.
The corresponding R2 object folder uses lowercase: `cm-abcdef123456`.

## 2. Copy the image in R2

1. Open Cloudflare Dashboard → R2 Object Storage → `continuum-memorial-images`.
2. Find `pending/cm-abcdef123456/photo.jpg` (substitute the actual order ID).
3. Download `photo.jpg` locally.
4. Upload the **same file** under `published/cm-abcdef123456/photo.jpg` in the **same bucket**. Create the `published/` prefix/folder if needed.
5. Confirm that the published object exists **before** relying on the temporary object being deleted.

The seven-day R2 lifecycle rule must target **only `pending/`**, not `published/` or the entire bucket. Leave the pending copy in place; R2 deletes it automatically.

## 3. Verify the permanent image

Open the **same image URL** from the emailed ready-to-copy `index.json` entry:

`https://continuum-memorials-api.andrewgstanton.workers.dev/api/orders/CM-ABCDEF123456/image`

The Worker first checks `published/cm-abcdef123456/photo.jpg`. If present, it serves that image regardless of whether the pending order JSON has expired or been deleted. Otherwise, it serves the pending image only while the order is valid.

**Do not change the image URL in `index.json`.** There is only one URL scheme for pending and published images.

## 4. Create the Bitcoin inscription

1. Confirm payment and customer approval of the **exact inscription text**.
2. Use your existing `memorials/create_milestone/` PSBT tool (`create_milestone`) to prepare the Bitcoin inscription transaction.
3. Follow your normal signing and broadcasting workflow; obtain the confirmed/broadcast transaction ID (TXID) from your wallet or explorer.
4. Update the ready-to-copy record in `memorials/index.json`: set `bitcoin.txid` to the real TXID and populate the other Bitcoin fields according to your existing workflow. Preserve the original `image` URL.
5. Set the desired publication visibility/collection and publish the updated index using your normal process.
6. Open the permanent viewer at `https://mycontinuum.xyz/memorials/?txid=YOUR_TXID` and confirm that the inscription and photo display correctly.

**Important:** A permanent image alone does not publish a milestone. The temporary `?order_id=...` viewer still expires after seven days; the permanent viewer uses the TXID and published `index.json` entry.

## Deployment of this change

In Cloudflare Dashboard → Workers & Pages → `continuum-memorials-api` → Edit Code, replace the existing Worker `index.js` with `memorials/worker/src/index.js` from this ZIP, then deploy. Keep the existing `MEMORIAL_IMAGES` and `MEMORIAL_PENDING` R2 bindings. No new bucket, binding, endpoint, or website changes are needed.
