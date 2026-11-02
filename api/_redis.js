/**
 * Koneksi Upstash Redis (REST) bersama untuk live chat & pesanan.
 * Env (otomatis terisi kalau pasang Upstash dari Vercel Marketplace):
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 *   (atau KV_REST_API_URL / KV_REST_API_TOKEN)
 */
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

/** Jalankan beberapa perintah Redis sekaligus (pipeline). */
async function redis(...cmds) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error('Database belum diatur (UPSTASH_REDIS_REST_URL / TOKEN)');
  const r = await fetch(REDIS_URL.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error('Database error (' + r.status + ')');
  const data = await r.json();
  return data.map((x) => {
    if (x.error) throw new Error(x.error);
    return x.result;
  });
}

/** Batasi jumlah permintaan per kunci (mis. per IP) dalam jendela waktu. */
async function rateLimit(key, max, windowSec) {
  const [count] = await redis(['INCR', 'rl:' + key], ['EXPIRE', 'rl:' + key, windowSec, 'NX']);
  return count <= max;
}

/** Kirim pesan ke Telegram admin (opsional: TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID). */
async function telegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
  } catch (e) {
    console.error('Telegram notify gagal', e.message);
  }
}

const siteUrl = () => (process.env.SITE_URL || 'https://wakprem.com').replace(/\/$/, '');

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'unknown').split(',')[0].trim();
}

module.exports = { redis, rateLimit, telegram, siteUrl, clientIp };
