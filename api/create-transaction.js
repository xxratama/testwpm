/**
 * POST /api/create-transaction
 * Membuat transaksi Midtrans Snap. Harga SELALU dihitung ulang dari
 * assets/js/catalog.js di server, jadi tidak bisa dimanipulasi dari browser.
 */
const CAT = require('../assets/js/catalog.js');
const { SNAP_URL, midtransFetch } = require('./_midtrans');
const { send, readBody } = require('./_http');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EXPIRY_MINUTES = 15;

function genId() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const ymd = String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate());
  const r = Math.random().toString(36).slice(2, 7).toUpperCase().padEnd(5, 'X');
  return `WP-${ymd}-${r}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  let body;
  try { body = await readBody(req); } catch (e) { return send(res, 400, { error: 'Data tidak valid' }); }

  const buyer = body.buyer || {};
  const name = String(buyer.name || '').trim().slice(0, 80);
  const email = String(buyer.email || '').trim().slice(0, 120);
  const phone = String(buyer.phone || '').replace(/\D/g, '').slice(0, 16);
  if (name.length < 2) return send(res, 400, { error: 'Nama belum diisi' });
  if (!EMAIL_RE.test(email)) return send(res, 400, { error: 'Email belum valid' });

  const items = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
  if (!items.length) return send(res, 400, { error: 'Keranjang kosong' });

  const totals = CAT.calcTotals(items, body.voucher, body.methodId);
  if (totals.errors.length) return send(res, 400, { error: totals.errors[0] });
  if (!totals.method) return send(res, 400, { error: 'Metode pembayaran tidak valid' });
  for (const l of totals.lines) {
    const v = CAT.findVariant(CAT.findProduct(l.productId), l.variantId);
    if (v.needsEmail && !EMAIL_RE.test(l.targetEmail)) return send(res, 400, { error: `Email akun untuk ${l.name} belum valid` });
  }

  const orderId = genId();

  // item_details harus berjumlah sama persis dengan gross_amount
  const itemDetails = totals.lines.map((l) => ({
    id: `${l.productId}:${l.variantId}`.slice(0, 50),
    name: `${l.name} ${l.variantLabel}`.slice(0, 50),
    price: l.price,
    quantity: l.qty,
  }));
  if (totals.discount) itemDetails.push({ id: 'voucher', name: `Diskon ${totals.voucher.code}`.slice(0, 50), price: -totals.discount, quantity: 1 });
  if (totals.fee) itemDetails.push({ id: 'fee', name: 'Biaya layanan', price: totals.fee, quantity: 1 });

  // Email tujuan aktivasi disimpan di custom_field supaya terlihat di dashboard Midtrans
  const targets = totals.lines.filter((l) => l.targetEmail).map((l) => `${l.name}: ${l.targetEmail}`).join(' | ');

  const payload = {
    transaction_details: { order_id: orderId, gross_amount: totals.total },
    item_details: itemDetails,
    customer_details: { first_name: name, email, phone: phone || undefined },
    enabled_payments: totals.method.midtrans,
    expiry: { unit: 'minute', duration: EXPIRY_MINUTES },
    custom_field1: targets.slice(0, 255) || undefined,
    custom_field2: phone ? `WA: ${phone}` : undefined,
  };

  try {
    const r = await midtransFetch(SNAP_URL, { method: 'POST', body: JSON.stringify(payload) });
    if (!r.ok) {
      console.error('Midtrans error', r.status, r.data);
      return send(res, 502, { error: (r.data.error_messages && r.data.error_messages[0]) || 'Gagal membuat transaksi' });
    }
    return send(res, 200, {
      orderId,
      token: r.data.token,
      redirectUrl: r.data.redirect_url,
      totals: {
        lines: totals.lines, subtotal: totals.subtotal, discount: totals.discount,
        voucher: totals.voucher, fee: totals.fee, total: totals.total,
      },
    });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: e.message || 'Server error' });
  }
};
