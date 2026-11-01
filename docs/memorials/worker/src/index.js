const encoder = new TextEncoder();
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }
});
function cors(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
  return origin && allowed.includes(origin) ? {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Idempotency-Key',
    'Access-Control-Max-Age': '600', 'Vary': 'Origin'
  } : null;
}
function clean(v, max) { return typeof v === 'string' ? v.trim().slice(0, max + 1) : ''; }
function validate(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return 'Invalid request.';
  const email = clean(b.email,254);
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Valid email required.';
  if (!['Memorial','Milestone'].includes(b.type)) return 'Invalid type.';
  if (!clean(b.title,150) || clean(b.title,150).length > 150) return 'Title required (150 characters maximum).';
  if (!clean(b.inscription,500) || encoder.encode(clean(b.inscription,500)).length > 80) return 'Inscription must be 1–80 UTF-8 bytes.';
  if (clean(b.name,150).length > 150 || clean(b.description,5000).length > 5000) return 'Field too long.';
  const image = clean(b.image_url,2000);
  if (image.length > 2000) return 'Image URL too long.';
  if (image) { try { if (new URL(image).protocol !== 'https:') return 'Image URL must be HTTPS.'; } catch { return 'Invalid image URL.'; } }
  return null;
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') return json({status:'ok'});
    // Pending previews are publicly shareable by their existing order ID.
    // Only the public index entry is stored; contact/payment details are never returned.
    if (url.pathname.startsWith('/api/orders/') && request.method === 'GET') {
      const headers = cors(request, env);
      if (!headers) return json({error:'Origin not allowed'},403);
      if (!env.MEMORIAL_PENDING) return json({error:'Preview storage not configured'},503,headers);
      const id = decodeURIComponent(url.pathname.slice('/api/orders/'.length)).toLowerCase();
      if (!/^cm-[0-9a-f]{12}$/.test(id)) return json({error:'Invalid order ID'},400,headers);
      try {
        const object = await env.MEMORIAL_PENDING.get(`pending/${id}.json`);
        if (!object) return json({error:'Preview not found or expired'},404,headers);
        const pending = await object.json();
        if (!pending.expires_at || Date.parse(pending.expires_at) <= Date.now())
          return json({error:'Preview expired'},410,headers);
        return json({order_id:id.toUpperCase(),status:'pending',expires_at:pending.expires_at,record:pending.record},200,headers);
      } catch (error) {
        console.error('Pending preview read failed', error);
        return json({error:'Preview temporarily unavailable'},503,headers);
      }
    }
    if (url.pathname !== '/api/orders') return json({error:'Not found'},404);
    const headers = cors(request,env);
    if (!headers) return json({error:'Origin not allowed'},403);
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if (request.method !== 'POST') return json({error:'Method not allowed'},405,headers);
    if (Number(request.headers.get('Content-Length') || 0) > 16000) return json({error:'Request too large'},413,headers);
    const key = request.headers.get('Idempotency-Key');
    if (!key || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(key)) return json({error:'Invalid request key'},400,headers);
    let body;
    try { body = await request.json(); } catch { return json({error:'Invalid JSON'},400,headers); }
    const problem = validate(body);
    if (problem) return json({error:problem},400,headers);
    if (!env.MEMORIAL_PENDING) return json({error:'Pending preview storage not configured'},503,headers);
    if (!env.RESEND_API_KEY || !env.ORDER_FROM_EMAIL || !env.ORDER_TO_EMAIL) return json({error:'Order service not configured'},503,headers);
    const orderId = 'CM-' + key.replace(/-/g,'').slice(0,12).toUpperCase();

    // Generate a ready-to-copy entry for memorials/index.json.
    const indexEntry = {
      id: orderId.toLowerCase(),
      type: body.type.toLowerCase(),
      title: clean(body.title,150),
      status: 'published',
      visibility: 'private',
      collections: [],
      description: clean(body.description,5000) || null,
      image: clean(body.image_url,2000),
      bitcoin: {
        txid: '',
        psbt: '',
        extracted_inscription: '',
        preview_inscription: clean(body.inscription,500)
      }
    };
    const indexJson = JSON.stringify(indexEntry, null, 2) + ',';

    const lines = [
      'NEW MEMORIALS & MILESTONES ORDER', '',
      `Order ID: ${orderId}`, 'Status: Pending payment and approval', 'Price: $21',
      `Type: ${body.type}`, `Customer email: ${clean(body.email,254)}`,
      `Customer name: ${clean(body.name,150) || '(not provided)'}`,
      `Title: ${clean(body.title,150)}`, '',
      'Proposed Bitcoin inscription:', clean(body.inscription,500), '',
      'Additional description:', clean(body.description,5000) || '(none)', '',
      `Image URL: ${clean(body.image_url,2000) || '(none)'}`, '',
      'Review payment and approve inscription manually. No Bitcoin transaction has occurred.',
      '',
      '----------------------------------------',
      'READY-TO-COPY INDEX.JSON ENTRY',
      '----------------------------------------',
      indexJson
    ];
    let result;
    try {
      result = await fetch('https://api.resend.com/emails', {
        method:'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type':'application/json',
          'Idempotency-Key': key
        },
        body:JSON.stringify({
          from:env.ORDER_FROM_EMAIL,
          to:[env.ORDER_TO_EMAIL],
          reply_to:clean(body.email,254),
          subject:`New ${body.type} Order — ${orderId}`,
          text:lines.join('\n')
        })
      });
    } catch { return json({error:'Email service temporarily unavailable. Please retry.'},502,headers); }
    if (!result.ok) {
      console.error('Resend rejected email:', result.status);
      return json({error:'Unable to accept order right now. Please retry later.'},502,headers);
    }
    // Store only the public-facing ready-to-copy entry, never customer contact data.
    // The existing emailed entry and its published/private fields remain unchanged.
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    try {
      await env.MEMORIAL_PENDING.put(`pending/${indexEntry.id}.json`, JSON.stringify({
        order_id:orderId, created_at:new Date().toISOString(), expires_at:expiresAt, record:indexEntry
      }), {httpMetadata:{contentType:'application/json'}});
    } catch (error) {
      console.error('Pending preview write failed', error);
      return json({error:'Order email accepted, but preview could not be saved. Contact us with your order ID: '+orderId},503,headers);
    }
    return json({order_id:orderId,status:'pending',notification:'accepted_for_delivery',
      preview_url:`https://mycontinuum.xyz/memorials/?order_id=${encodeURIComponent(orderId)}`,
      expires_at:expiresAt},201,headers);
  }
};
