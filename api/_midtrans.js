/**
 * Helper Midtrans bersama untuk fungsi di folder api/.
 * Env yang dibutuhkan di hosting (Vercel → Settings → Environment Variables):
 *   MIDTRANS_SERVER_KEY      = SB-Mid-server-xxxx (sandbox) / Mid-server-xxxx (production)
 *   MIDTRANS_IS_PRODUCTION   = "true" kalau sudah production (default: sandbox)
 */
const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';

const SNAP_URL = isProd ? 'https://app.midtrans.com/snap/v1/transactions' : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
const CORE_URL = isProd ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';

function authHeader() {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) throw new Error('MIDTRANS_SERVER_KEY belum diatur di server');
  return 'Basic ' + Buffer.from(key + ':').toString('base64');
}

async function midtransFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: authHeader(), ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Ubah status Midtrans ke status sederhana yang dipakai website. */
function mapStatus(trx) {
  const s = trx.transaction_status;
  if (s === 'settlement' || (s === 'capture' && trx.fraud_status !== 'challenge')) return 'paid';
  if (s === 'pending' || s === 'capture') return 'pending';
  if (s === 'expire') return 'expired';
  return 'failed'; // cancel, deny, failure, refund
}

const { send } = require('./_http');

module.exports = { SNAP_URL, CORE_URL, midtransFetch, mapStatus, send };
