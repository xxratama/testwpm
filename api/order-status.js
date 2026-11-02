/**
 * GET /api/order-status?id=WP-xxxxxx-XXXXX
 * Mengambil status pembayaran terbaru langsung dari Midtrans.
 */
const { CORE_URL, midtransFetch, mapStatus, send } = require('./_midtrans');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });

  const url = new URL(req.url, 'http://localhost');
  const id = String(url.searchParams.get('id') || '').trim().toUpperCase();
  if (!/^WP-\d{6}-[A-Z0-9]{5}$/.test(id)) return send(res, 400, { error: 'Format ID pesanan tidak valid' });

  try {
    const r = await midtransFetch(`${CORE_URL}/v2/${encodeURIComponent(id)}/status`);
    if (r.data.status_code === '404' || r.status === 404) return send(res, 404, { error: 'Pesanan tidak ditemukan' });
    if (!r.ok || !r.data.transaction_status) return send(res, 502, { error: r.data.status_message || 'Gagal cek status' });

    return send(res, 200, {
      orderId: id,
      status: mapStatus(r.data),
      paymentType: r.data.payment_type,
      grossAmount: Math.round(Number(r.data.gross_amount) || 0),
      transactionTime: r.data.transaction_time,
    });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: e.message || 'Server error' });
  }
};
