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
  const imageFileInput = field('request-image-file');
  let photoObjectUrl = null;
  let preparedPhoto = null;
  const releasePhotoPreview = () => {
    if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
    photoObjectUrl = null;
  };
  // Resize camera images in-browser so mobile uploads are small and consistently viewable.
  async function preparePhoto(file) {
    if (!file) return null;
    if (!file.type.startsWith('image/')) throw new Error('Please select an image file.');
    const sourceUrl = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = sourceUrl;
      if (img.decode) await img.decode();
      else await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
      const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
      if (!blob || blob.size > 5 * 1024 * 1024) throw new Error('Photo could not be optimized below 5 MB. Choose a smaller image.');
      return new File([blob], 'photo.jpg', {type:'image/jpeg'});
    } catch (_) {
      throw new Error('This photo format cannot be opened by your browser. Try a JPEG, PNG, or another photo.');
    } finally { URL.revokeObjectURL(sourceUrl); }
  }
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
  const hidePreview = () => { preparedPhoto = null; releasePhotoPreview(); preview.hidden = true; orderConfirmation.hidden = true; orderStatus.hidden = true; currentRequestKey = crypto.randomUUID(); submitButton.disabled = false; };
  form.addEventListener('input', () => { updateCount(); hidePreview(); error.hidden = true; });
  form.addEventListener('change', hidePreview);
  form.addEventListener('reset', () => {
    hidePreview(); error.hidden = true;
    setTimeout(updateCount, 0);
  });
  form.addEventListener('submit', async event => {
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
    const selectedFile = imageFileInput.files[0];
    if (imageUrl && !selectedFile) {
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
    try {
      preparedPhoto = selectedFile ? await preparePhoto(selectedFile) : null;
    } catch (e) {
      error.textContent = e.message;
      error.hidden = false;
      preview.hidden = true;
      return;
    }
    error.hidden = true;
    releasePhotoPreview();
    previewImage.removeAttribute('src');
    previewImage.hidden = true;
    imageError.hidden = true;
    imageWrap.hidden = !(preparedPhoto || imageUrl);
    if (preparedPhoto) { photoObjectUrl = URL.createObjectURL(preparedPhoto); previewImage.src = photoObjectUrl; }
    else if (imageUrl) previewImage.src = imageUrl;
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
    const multipart = !!preparedPhoto;
    const requestBody = multipart ? new FormData() : JSON.stringify(payload);
    if (multipart) {
      requestBody.append('order', JSON.stringify(payload));
      requestBody.append('photo', preparedPhoto, preparedPhoto.name);
    }
    submitButton.disabled = true;
    orderStatus.hidden = false;
    orderStatus.textContent = 'Submitting your order…';
    try {
      const response = await fetch(api.replace(/\/$/, '') + '/api/orders', {
        method: 'POST', headers: multipart ? {'Idempotency-Key': currentRequestKey} : {'Content-Type': 'application/json', 'Idempotency-Key': currentRequestKey},
        body: requestBody
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
