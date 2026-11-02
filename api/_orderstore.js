/**
 * Penyimpanan pesanan QRIS (GoPay Merchant manual / kriskris otomatis) di Upstash Redis (lihat _redis.js).
 *
 * Status pesanan:
 *   pending   → menunggu pembayaran
 *   review    → pembeli klik "Saya sudah bayar", menunggu dicek admin
 *   paid      → uang masuk (dikonfirmasi admin, atau otomatis dari kriskris)
 *   delivered → admin sudah kirim akun
 *   expired   → lewat batas waktu bayar tanpa klik "sudah bayar"
 *   cancelled → dibatalkan admin
 */
const CAT = require('../assets/js/catalog.js');
const { redis, telegram, siteUrl } = require('./_redis');

const TTL = 60 * 60 * 24 * 90; // pesanan disimpan 90 hari
const K = { order: (id) => `order:${id}`, index: 'orders' };
const ID_RE = /^WP-\d{6}-[A-Z0-9]{5}$/;
const STATUSES = ['pending', 'review', 'paid', 'delivered', 'expired', 'cancelled'];

async function get(id) {
  if (!ID_RE.test(String(id || ''))) return null;
  const [v] = await redis(['GET', K.order(id)]);
  return v ? JSON.parse(v) : null;
}

async function save(o) {
  o.updatedAt = Date.now();
  await redis(['SET', K.order(o.id), JSON.stringify(o), 'EX', TTL], ['ZADD', K.index, o.createdAt, o.id]);
}

async function list(limit = 200) {
  const [ids] = await redis(['ZREVRANGE', K.index, 0, limit - 1]);
  if (!ids || !ids.length) return [];
  const [vals] = await redis(['MGET', ...ids.map(K.order)]);
  const out = [];
  const stale = [];
  vals.forEach((v, i) => (v ? out.push(JSON.parse(v)) : stale.push(ids[i])));
  if (stale.length) await redis(['ZREM', K.index, ...stale]);
  return out;
}

/** Tandai kedaluwarsa kalau belum dibayar & lewat batas waktu. Mengembalikan true kalau berubah. */
function expire(o) {
  // kriskris: beri jeda 2 menit supaya pembayaran detik terakhir sempat terdeteksi
  const grace = o.mode === 'kriskris' ? 120000 : 0;
  if (o.status === 'pending' && Date.now() > o.expiresAt + grace) {
    o.status = 'expired';
    return true;
  }
  return false;
}

/** Total pesanan lain yang masih aktif (24 jam terakhir) — supaya kode unik tidak kembar. */
async function activeTotals() {
  const since = Date.now() - 24 * 3600 * 1000;
  return (await list(300)).filter((o) => o.createdAt > since && ['pending', 'review'].includes(o.status)).map((o) => o.total);
}

/** Data yang boleh dilihat siapa pun yang tahu ID pesanan (tanpa data pribadi). */
function publicView(o) {
  return {
    id: o.id, mode: o.mode, status: o.status, total: o.total, uniqueCode: o.uniqueCode,
    qrPayload: o.status === 'pending' ? o.qrPayload || null : null,
    createdAt: o.createdAt, expiresAt: o.expiresAt, claimedAt: o.claimedAt || null,
    paidAt: o.paidAt || null, deliveredAt: o.deliveredAt || null,
    lines: o.lines.map((l) => ({ name: l.name, variantLabel: l.variantLabel, qty: l.qty, total: l.total })),
  };
}

/** Data lengkap untuk admin (tanpa hash token). */
function adminView(o) {
  const { tokenHash, ...rest } = o;
  return rest;
}

/**
 * Terapkan status tagihan kriskris ke pesanan. Mengembalikan true kalau pesanan berubah.
 * Lunas selalu diterima (uang sudah masuk), kecuali pesanan memang sudah lunas/terkirim.
 */
function applyInvoice(o, status, paidAt) {
  if (status === 'paid' && !['paid', 'delivered'].includes(o.status)) {
    o.status = 'paid';
    o.paidAt = Date.parse(paidAt) || Date.now();
    return true;
  }
  if (['expired', 'cancelled'].includes(status) && o.status === 'pending') {
    o.status = 'expired';
    return true;
  }
  return false;
}

/** Kabari admin lewat Telegram bahwa pesanan lunas & akun perlu dikirim. */
function notifyPaid(o) {
  return telegram(
    `✅ LUNAS ${o.id} — ${CAT.rp(o.total)} (QRIS otomatis)\n` +
    `${o.buyer.name} · ${o.buyer.email}${o.buyer.phone ? ' · ' + o.buyer.phone : ''}\n` +
    o.lines.map((l) => `• ${l.name} (${l.variantLabel})${l.targetEmail ? ' → ' + l.targetEmail : ''}`).join('\n') +
    `\n\nKirim akunnya, lalu tandai terkirim: ${siteUrl()}/admin.html#pesanan`
  );
}

module.exports = { get, save, list, expire, activeTotals, publicView, adminView, applyInvoice, notifyPaid, STATUSES };
