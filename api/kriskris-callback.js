/**
 * Callback kriskris → isi "URL callback" di dashboard kriskris dengan https://wakprem.com/api/kriskris-callback
 * Event: invoice.paid | invoice.expired | test.ping (header X-Kriskris-Event)
 * Tanda tangan: X-Kriskris-Signature = "sha256=" + HMAC-SHA256(KRISKRIS_CALLBACK_SECRET, raw body)
 * kriskris mengulang pengiriman yang gagal dengan delivery_id yang sama → dicatat supaya tidak diproses dua kali.
 */
const { send } = require('./_http');
const { redis } = require('./_redis');
const db = require('./_orderstore');
const KK = require('./_kriskris');

/** Body mentah persis seperti yang dikirim (wajib untuk cek tanda tangan; jangan pakai req.body hasil parse). */
async function rawBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  return Buffer.concat(chunks).toString('utf8');
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    if (!process.env.KRISKRIS_CALLBACK_SECRET) return send(res, 500, { error: 'KRISKRIS_CALLBACK_SECRET belum diatur' });

    const raw = await rawBody(req);
    if (!KK.verifyCallback(raw, req.headers['x-kriskris-signature'])) return send(res, 401, { error: 'Tanda tangan tidak valid' });

    const b = JSON.parse(raw || '{}');
    const event = b.event || req.headers['x-kriskris-event'];
    const delivery = String(b.delivery_id || req.headers['x-kriskris-delivery'] || '').slice(0, 100);
    if (event === 'test.ping') return send(res, 200, { ok: true });

    const seenKey = 'kk:delivery:' + delivery;
    if (delivery) {
      const [seen] = await redis(['GET', seenKey]);
      if (seen) return send(res, 200, { ok: true, duplicate: true });
    }

    if (event === 'invoice.paid' || event === 'invoice.expired') {
      const o = await db.get(String(b.label || '').toUpperCase());
      if (!o || o.invoiceId !== b.invoice_id) {
        console.error('Callback kriskris: pesanan tidak cocok', b.label, b.invoice_id);
      } else if (db.applyInvoice(o, b.status || (event === 'invoice.paid' ? 'paid' : 'expired'), b.paid_at)) {
        await db.save(o);
        if (o.status === 'paid') await db.notifyPaid(o);
      }
    }

    if (delivery) await redis(['SET', seenKey, '1', 'EX', 60 * 60 * 24 * 7]);
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: e.message || 'Server error' });
  }
};
