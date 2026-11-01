'use strict';
(() => {
  const form = document.getElementById('native-order-form');
  const field = id => document.getElementById(id);
  const encoder = new TextEncoder();
  const message = field('request-message');
  const count = field('message-byte-count');
  const error = field('form-error');
  const preview = field('instant-preview');
  const previewImage = field('preview-image');
  const imageWrap = field('preview-image-wrap');
  const imageError = field('preview-image-error');
  previewImage.addEventListener('error', () => {
    previewImage.hidden = true;
    imageError.hidden = false;
  });
  previewImage.addEventListener('load', () => {
    previewImage.hidden = false;
    imageError.hidden = true;
  });
  let currentRequestKey = crypto.randomUUID();
  const submitButton = field('submit-order');
  const orderStatus = field('order-status');
  const orderConfirmation = field('order-confirmation');
  const previewLinkBox = field('order-preview-link');
  const previewAnchor = field('order-preview-anchor');
  field('copy-order-preview').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(previewAnchor.href); field('copy-order-preview').textContent = 'Copied!'; }
    catch { window.prompt('Copy this link:', previewAnchor.href); }
  });
  const updateCount = () => {
    const size = encoder.encode(message.value).length;
    count.textContent = `${size} / 80 UTF-8 bytes`;
    count.classList.toggle('error', size > 80);
    return size;
  };
  const hidePreview = () => { preview.hidden = true; orderConfirmation.hidden = true; orderStatus.hidden = true; currentRequestKey = crypto.randomUUID(); submitButton.disabled = false; };
  form.addEventListener('input', () => { updateCount(); hidePreview(); error.hidden = true; });
  form.addEventListener('change', hidePreview);
  form.addEventListener('reset', () => {
    hidePreview(); error.hidden = true;
    setTimeout(updateCount, 0);
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const email = field('request-email').value.trim();
    const title = field('request-title').value.trim();
    const inscription = message.value.trim();
    const size = encoder.encode(inscription).length;
    if (!email || !field('request-email').checkValidity() || !title || !inscription || size > 80) {
      error.textContent = !email ? 'Please enter your email address.' : !field('request-email').checkValidity() ? 'Please enter a valid email address.' : !title ? 'Please enter a title.' : !inscription ? 'Please enter a message.' : `The message is ${size} bytes. Please shorten it to 80 UTF-8 bytes or fewer.`;
      error.hidden = false;
      preview.hidden = true;
      if (!email || !field('request-email').checkValidity()) field('request-email').focus();
      return;
    }
    const imageUrl = field('request-image-url').value.trim();
    if (imageUrl) {
      try {
        const url = new URL(imageUrl);
        if (url.protocol !== 'https:') throw new Error('HTTPS required');
      } catch (_) {
        error.textContent = 'Please enter a valid HTTPS image URL, or leave the image field blank.';
        error.hidden = false;
        preview.hidden = true;
        return;
      }
    }
    error.hidden = true;
    previewImage.removeAttribute('src');
    previewImage.hidden = true;
    imageError.hidden = true;
    imageWrap.hidden = !imageUrl;
    if (imageUrl) previewImage.src = imageUrl;
    field('preview-title').textContent = title;
    field('preview-message').textContent = inscription;
    const desc = field('request-description').value.trim();
    field('preview-description').textContent = desc;
    field('preview-description').hidden = !desc;
    preview.hidden = false;
    preview.scrollIntoView({behavior:'smooth',block:'start'});
  });
  submitButton.addEventListener('click', async () => {
    if (preview.hidden || !orderConfirmation.hidden) return;
    const api = window.MEMORIALS_ORDER_API;
    if (!api) {
      orderStatus.textContent = 'Order service is not configured yet.';
      orderStatus.hidden = false;
      return;
    }
    const payload = {
      email: field('request-email').value.trim(),
      name: field('request-name').value.trim(),
      type: field('request-type').value,
      title: field('request-title').value.trim(),
      inscription: field('request-message').value.trim(),
      description: field('request-description').value.trim(),
      image_url: field('request-image-url').value.trim()
    };
    submitButton.disabled = true;
    orderStatus.hidden = false;
    orderStatus.textContent = 'Submitting your order…';
    try {
      const response = await fetch(api.replace(/\/$/, '') + '/api/orders', {
        method: 'POST', headers: {'Content-Type': 'application/json', 'Idempotency-Key': currentRequestKey},
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not submit order.');
      field('order-number').textContent = 'Order ID: ' + data.order_id;
      previewLinkBox.hidden = !data.preview_url;
      if (data.preview_url) previewAnchor.href = data.preview_url;
      const expiryLabel = field('order-preview-expires');
      const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
      expiryLabel.textContent = expiresAt && !Number.isNaN(expiresAt.getTime())
        ? new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Los_Angeles',
            month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
            hour12: true, timeZoneName: 'short'
          }).format(expiresAt)
        : 'the expiration time shown in your order details';
      orderConfirmation.hidden = false;
      orderStatus.hidden = true;
    } catch (e) {
      orderStatus.textContent = e.message + ' Please try again.';
      submitButton.disabled = false;
    }
  });
  field('edit-preview').addEventListener('click', () => {
    hidePreview();
    field('request-title').focus();
    form.scrollIntoView({behavior:'smooth',block:'start'});
  });
  updateCount();
})();
