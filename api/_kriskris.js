/**
 * Klien API kriskris (QRIS otomatis dari outlet GoBiz). Dokumentasi: https://kriskris.id/panduan
 * Env:
 *   KRISKRIS_API_KEY / KRISKRIS_API_SECRET → dari tab Umum merchant (tampil sekali saat dibuat)
 *   KRISKRIS_CALLBACK_SECRET               → secret callback (tampil sekali saat simpan URL callback)
 *   KRISKRIS_BASE_URL                      → opsional, default https://kriskris.id
 */
const crypto = require('crypto');

const KEY = process.env.KRISKRIS_API_KEY;
const SECRET = process.env.KRISKRIS_API_SECRET;
const BASE = (process.env.KRISKRIS_BASE_URL || 'https://kriskris.id').replace(/\/$/, '');

const enabled = () => !!(KEY && SECRET);

const hex = (alg, data) => crypto.createHash(alg).update(data).digest('hex');
const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');

/** Pesan ramah untuk kode error bisnis kriskris (HTTP 422). */
const ERRORS = {
  duplicate_pending: 'Sedang banyak pesanan dengan nominal yang sama. Coba lagi 1–2 menit lagi ya.',
  gobiz_offline: 'Pembayaran QRIS sedang gangguan. Coba lagi sebentar lagi atau chat admin.',
  quota_exceeded: 'Pembayaran QRIS sedang tidak tersedia. Chat admin ya.',
  invalid_amount: 'Nominal pembayaran tidak valid.',
};

/**
 * Panggil API kriskris dengan tanda tangan v1:
 * HMAC-SHA256(secret, timestamp \n METHOD \n path \n query \n sha256(body))
 */
async function call(method, path, body) {
  if (!enabled()) throw new Error('kriskris belum diatur (KRISKRIS_API_KEY / KRISKRIS_API_SECRET)');
  const [p, query = ''] = path.split('?');
  const raw = body ? JSON.stringify(body) : '';
  const ts = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const canonical = [ts, method, p, query, hex('sha256', raw)].join('\n');
  const r = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': KEY,
      'X-Kriskris-Timestamp': ts,
      'X-Kriskris-Signature': 'v1=' + hmac(SECRET, canonical),
    },
    body: raw || undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.ok === false) {
    const code = d.data && d.data.code;
    console.error('kriskris', method, p, r.status, d.error || '', code || '');
    throw Object.assign(new Error(ERRORS[code] || 'Gagal membuat pembayaran QRIS. Coba lagi ya.'), { status: r.status, code });
  }
  return d.data;
}

const createInvoice = (amount, label) => call('POST', '/api/v1/external/invoices', { amount, label });
const getInvoice = (id) => call('GET', '/api/v1/external/invoices/' + encodeURIComponent(id));
const cancelInvoice = (id) => call('POST', '/api/v1/external/invoices/' + encodeURIComponent(id) + '/cancel');

/** Cek tanda tangan callback: header X-Kriskris-Signature = "sha256=" + HMAC-SHA256(callback secret, raw body). */
function verifyCallback(raw, header) {
  const secret = process.env.KRISKRIS_CALLBACK_SECRET;
  if (!secret || !header) return false;
  const want = Buffer.from('sha256=' + hmac(secret, raw));
  const got = Buffer.from(String(header));
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

module.exports = { enabled, createInvoice, getInvoice, cancelInvoice, verifyCallback };
