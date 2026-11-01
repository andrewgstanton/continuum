# Pending preview deployment

1. Create a **private** Cloudflare R2 bucket named `continuum-memorial-pending` (Standard storage). Do not enable a public R2 domain.
2. The `worker/wrangler.toml` file now binds that bucket as `MEMORIAL_PENDING`. Deploy from `memorials/worker` using your existing Wrangler deployment process.
3. Deploy the updated `memorials/` website files to GitHub Pages, including `order/` and `memorial.js`.
4. Submit a test order. Verify the existing email arrives, the confirmation displays the preview link, and the link shows the yellow pending banner without Bitcoin verification.
5. Set an R2 lifecycle rule for the prefix `pending/` to expire objects after 7 days. The Worker also rejects previews past their `expires_at` timestamp, even before physical deletion.
6. Verify `?txid=...` existing finalized records still work.

## Notes
- R2 holds one JSON object per order, at `pending/cm-xxxxxxxxxxxx.json`; no shared index file is needed.
- The public GET endpoint returns **only** the ready-to-copy index entry, never the customer's name or email.
- The same order ID used in the email is used in the URL. Anyone who knows the order ID can view the temporary preview.
- Pending records expire after 7 days. This version does not yet implement automatic order-ID-to-final-txid redirects; that can be added in the next stage.
- A successfully emailed order whose R2 write fails returns an explicit error including the order ID; check email before resubmitting.
