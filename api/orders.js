/**
 * Pesanan QRIS — sisi pembeli.
 *   POST { action: 'create', items, buyer, voucher }  → { order, token }
 *   POST { action: 'claim', id, token }               → { order }   ("Saya sudah bayar")
 *   GET  ?id=WP-xxxxxx-XXXXX                           → { order }   (tanpa data pribadi)
 * Harga selalu dihitung di server dari assets/js/catalog.js.
 *
 * Kalau env KRISKRIS_API_KEY & KRISKRIS_API_SECRET terisi → tagihan QRIS dibuat di kriskris
 * (nominal + kode unik ditentukan kriskris, lunas terdeteksi otomatis lewat callback / cek status).
 * Kalau tidak → QRIS statis GoPay Merchant dengan kode unik sendiri & konfirmasi admin.
 */
const CAT = require('../assets/js/catalog.js');
const { send, readBody, rid, sha, safeEqual } = require('./_http');
const { rateLimit, telegram, siteUrl, clientIp } = require('./_redis');
const db = require('./_orderstore');
const KK = require('./_kriskris');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EXPIRY_MINUTES = Number(process.env.ORDER_EXPIRY_MINUTES) || 30;
const RECHECK_MS = 10000; // cek status ke kriskris paling sering tiap 10 detik per pesanan
const clip = (s, n) => String(s || '').trim().slice(0, n);

/** Cadangan kalau callback belum masuk: tanya status tagihan langsung ke kriskris. */
async function syncInvoice(o) {
  if (o.mode !== 'kriskris' || o.status !== 'pending' || !o.invoiceId || !KK.enabled()) return;
  if (Date.now() - (o.checkedAt || 0) < RECHECK_MS) return;
  o.checkedAt = Date.now();
  try {
    const inv = await KK.getInvoice(o.invoiceId);
    if (db.applyInvoice(o, inv.status, inv.paid_at) && o.status === 'paid') await db.notifyPaid(o);
  } catch (e) {
    console.error('Cek status kriskris gagal', o.id, e.message);
  }
  await db.save(o);
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const id = String(new URL(req.url, 'http://localhost').searchParams.get('id') || '').trim().toUpperCase();
      const o = await db.get(id);
      if (!o) return send(res, 404, { error: 'Pesanan tidak ditemukan' });
      await syncInvoice(o);
      if (db.expire(o)) await db.save(o);
      return send(res, 200, { order: db.publicView(o) });
    }

    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const b = await readBody(req);

    if (b.action === 'create') {
      const buyer = b.buyer || {};
      const name = clip(buyer.name, 80);
      const email = clip(buyer.email, 120);
      const phone = String(buyer.phone || '').replace(/\D/g, '').slice(0, 16);
      if (name.length < 2) return send(res, 400, { error: 'Nama belum diisi' });
      if (!EMAIL_RE.test(email)) return send(res, 400, { error: 'Email belum valid' });

      const items = Array.isArray(b.items) ? b.items.slice(0, 20) : [];
      if (!items.length) return send(res, 400, { error: 'Keranjang kosong' });
      const method = CAT.PAYMENT_METHODS.find((m) => m.manual);
      const totals = CAT.calcTotals(items, b.voucher, method.id);
      if (totals.errors.length) return send(res, 400, { error: totals.errors[0] });
      for (const l of totals.lines) {
        const v = CAT.findVariant(CAT.findProduct(l.productId), l.variantId);
        if (v.needsEmail && !EMAIL_RE.test(l.targetEmail)) return send(res, 400, { error: `Email akun untuk ${l.name} belum valid` });
      }
      if (!(await rateLimit('order:' + clientIp(req), 15, 3600))) return send(res, 429, { error: 'Terlalu banyak pesanan. Coba lagi nanti.' });

      const token = rid(24);
      const now = Date.now();
      const order = {
        id: CAT.makeOrderId(), mode: 'manual', status: 'pending',
        createdAt: now, expiresAt: now + EXPIRY_MINUTES * 60000,
        buyer: { name, email, phone }, method: method.id,
        lines: totals.lines, subtotal: totals.subtotal, discount: totals.discount, voucher: totals.voucher,
        fee: totals.fee, uniqueCode: 0, total: totals.total,
        tokenHash: sha(token).toString('hex'),
      };
      if (KK.enabled()) {
        let inv;
        try {
          inv = await KK.createInvoice(totals.total, order.id);
        } catch (e) {
          return send(res, e.status === 422 || e.status === 429 ? 503 : 502, { error: e.message });
        }
        Object.assign(order, {
          mode: 'kriskris', invoiceId: inv.id, qrPayload: inv.qr_payload,
          uniqueCode: inv.unique_code, total: inv.amount,
          expiresAt: Date.parse(inv.expires_at) || now + 15 * 60000, checkedAt: now,
        });
      } else {
        order.uniqueCode = CAT.pickUniqueCode(totals.total, await db.activeTotals());
        order.total += order.uniqueCode;
      }
      await db.save(order);
      return send(res, 200, { order: db.adminView(order), token });
    }

    if (b.action === 'claim') {
      const o = await db.get(String(b.id || '').toUpperCase());
      if (!o || !b.token || !safeEqual(sha(b.token).toString('hex'), o.tokenHash)) return send(res, 404, { error: 'Pesanan tidak ditemukan' });
      // kriskris mendeteksi lunas sendiri; klaim hanya untuk yang terlanjur bayar setelah kedaluwarsa
      const claimable = o.mode === 'kriskris' ? ['expired'] : ['pending', 'expired'];
      if (claimable.includes(o.status)) {
        o.status = 'review';
        o.claimedAt = Date.now();
        await db.save(o);
        await telegram(
          `💰 Pesanan ${o.id} mengaku SUDAH BAYAR ${CAT.rp(o.total)}\n` +
          `${o.buyer.name} · ${o.buyer.email}${o.buyer.phone ? ' · ' + o.buyer.phone : ''}\n` +
          o.lines.map((l) => `• ${l.name} (${l.variantLabel})${l.targetEmail ? ' → ' + l.targetEmail : ''}`).join('\n') +
          `\n\nCek nominal ${CAT.rp(o.total)} di GoPay Merchant${o.mode === 'kriskris' ? ' (dibayar setelah tagihan kriskris kedaluwarsa)' : ''}, lalu konfirmasi: ${siteUrl()}/admin.html#pesanan`
        );
      }
      return send(res, 200, { order: db.publicView(o) });
    }

    return send(res, 400, { error: 'Aksi tidak dikenal' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: e.message || 'Server error' });
  }
};
