/**
 * Pesanan QRIS (GoPay Merchant / kriskris) — sisi admin. Wajib header `x-admin-key` = env ADMIN_PASSWORD.
 *   GET  ?action=list                           → { orders }
 *   POST { action: 'status', id, status }       → { order }
 *        status: 'paid' | 'delivered' | 'cancelled' | 'pending'
 */
const { send, readBody, safeEqual } = require('./_http');
const db = require('./_orderstore');
const KK = require('./_kriskris');

const ALLOWED = ['paid', 'delivered', 'cancelled', 'pending'];

module.exports = async (req, res) => {
  try {
    const pass = process.env.ADMIN_PASSWORD;
    if (!pass) return send(res, 500, { error: 'ADMIN_PASSWORD belum diatur di server' });
    if (!safeEqual(req.headers['x-admin-key'] || '', pass)) return send(res, 401, { error: 'Password admin salah' });

    if (req.method === 'GET') {
      const orders = await db.list(300);
      orders.forEach(db.expire); // hanya untuk tampilan; disimpan saat pembeli/admin mengubahnya
      return send(res, 200, { orders: orders.map(db.adminView) });
    }

    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const b = await readBody(req);
    if (b.action !== 'status') return send(res, 400, { error: 'Aksi tidak dikenal' });
    if (!ALLOWED.includes(b.status)) return send(res, 400, { error: 'Status tidak valid' });

    const o = await db.get(String(b.id || '').toUpperCase());
    if (!o) return send(res, 404, { error: 'Pesanan tidak ditemukan' });
    const now = Date.now();
    // Batalkan juga tagihan kriskris yang masih aktif supaya QR-nya tidak bisa dibayar lagi
    if (b.status === 'cancelled' && o.mode === 'kriskris' && o.status === 'pending' && o.invoiceId) {
      try { await KK.cancelInvoice(o.invoiceId); } catch (e) { console.error('Batal tagihan kriskris gagal', o.id, e.message); }
    }
    o.status = b.status;
    if (b.status === 'paid') o.paidAt = o.paidAt || now;
    if (b.status === 'delivered') { o.paidAt = o.paidAt || now; o.deliveredAt = now; }
    if (b.status === 'cancelled') o.cancelledAt = now;
    if (b.status === 'pending') o.expiresAt = Math.max(o.expiresAt, now + 30 * 60000);
    await db.save(o);
    return send(res, 200, { order: db.adminView(o) });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: e.message || 'Server error' });
  }
};
