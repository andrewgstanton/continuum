# Photo uploads — setup

## 1. Create the image bucket
Cloudflare Dashboard → R2 Object Storage → Create bucket:
`continuum-memorial-images`

The existing `continuum-memorial-pending` bucket remains unchanged.

## 2. Lifecycle rule for images
In the **new** `continuum-memorial-images` bucket → Settings → Object lifecycle rules:
- Rule: Delete temporary photos after 7 days
- Prefix: `pending/`
- Delete objects after: 7 days
- Enabled: yes

Do not set a blanket rule on the whole image bucket. A future `published/` prefix can retain approved photos.

## 3. Deploy Worker
From `memorials/worker/`, deploy with Wrangler as usual. `wrangler.toml` includes the new `MEMORIAL_IMAGES` binding. Preserve your existing Worker secrets and Resend settings.

## 4. Deploy site
Upload `memorials/order/index.html` and `memorials/order/preview-form.js` from this ZIP. Other existing site files are unchanged. The form script has a versioned URL to avoid stale caching.

## How it works
- No photo: existing JSON order endpoint, unchanged for older cached forms.
- Photo: the browser resizes to at most 1600px, JPEG quality 82%, and sends multipart form data to the same `/api/orders` endpoint.
- Worker stores photo in the separate R2 bucket at `pending/cm-.../photo.jpg` and saves an image endpoint URL in the existing pending order record.
- The image endpoint checks the order's seven-day expiration before serving the photo. No public R2 bucket needed.
- The ready-to-copy index.json email entry includes the temporary photo URL. **Before publishing a paid memorial, move/copy the photo to permanent hosting and replace that URL**: temporary image URLs stop working when the order expires.
- If an image upload or email fails, any already-uploaded photo is cleaned up by the seven-day image lifecycle rule.

## Limits
JPEG output only, up to 5 MB; photos unsupported by the browser image decoder will show a helpful error. The new bucket must exist before deploying the updated Worker. Existing JSON-only submissions remain compatible.

## Testing
1. Submit a test milestone with a local photo on mobile.
2. Verify both the immediate form preview and the shareable `?order_id=...` viewer show the photo.
3. Confirm the new R2 bucket contains `pending/cm-.../photo.jpg`.
4. Confirm a JSON-only order still works.
