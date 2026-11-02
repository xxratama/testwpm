/**
 * Penyimpanan live chat di Upstash Redis (lihat _redis.js untuk env).
 * Notifikasi Telegram (opsional): TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SITE_URL.
 */
const { rid } = require('./_http');
const { redis, rateLimit, telegram, siteUrl } = require('./_redis');

const TTL = 60 * 60 * 24 * 30; // percakapan disimpan 30 hari
const MAX_MESSAGES = 300;

const K = {
  conv: (id) => `chat:conv:${id}`,
  msgs: (id) => `chat:msgs:${id}`,
  index: 'chat:convs',
};

async function getConv(id) {
  if (!/^[a-z0-9]{8,20}$/.test(String(id || ''))) return null;
  const [v] = await redis(['GET', K.conv(id)]);
  return v ? JSON.parse(v) : null;
}

async function saveConv(conv) {
  await redis(['SET', K.conv(conv.id), JSON.stringify(conv), 'EX', TTL], ['ZADD', K.index, conv.updatedAt, conv.id]);
}

async function addMessage(conv, from, text) {
  const m = { id: rid(10), from, text, ts: Math.max(Date.now(), (conv.lastTs || 0) + 1) };
  conv.lastTs = m.ts;
  conv.updatedAt = m.ts;
  conv.last = { from, text: text.slice(0, 120) };
  if (from === 'visitor') conv.unread = (conv.unread || 0) + 1;
  await redis(
    ['RPUSH', K.msgs(conv.id), JSON.stringify(m)],
    ['LTRIM', K.msgs(conv.id), -MAX_MESSAGES, -1],
    ['EXPIRE', K.msgs(conv.id), TTL],
    ['SET', K.conv(conv.id), JSON.stringify(conv), 'EX', TTL],
    ['ZADD', K.index, conv.updatedAt, conv.id]
  );
  return m;
}

async function getMessages(id) {
  const [list] = await redis(['LRANGE', K.msgs(id), 0, -1]);
  return (list || []).map((s) => JSON.parse(s));
}

async function listConvs(limit = 100) {
  const [ids] = await redis(['ZREVRANGE', K.index, 0, limit - 1]);
  if (!ids || !ids.length) return [];
  const [vals] = await redis(['MGET', ...ids.map(K.conv)]);
  const out = [];
  const stale = [];
  vals.forEach((v, i) => (v ? out.push(JSON.parse(v)) : stale.push(ids[i])));
  if (stale.length) await redis(['ZREM', K.index, ...stale]);
  return out;
}

/** Notifikasi Telegram untuk pesan chat baru (maks. 1x per menit per percakapan). */
async function notifyAdmin(conv, text) {
  if (conv.notifiedAt && Date.now() - conv.notifiedAt < 60000) return;
  conv.notifiedAt = Date.now();
  const who = conv.name + (conv.contact ? ` (${conv.contact})` : '');
  await telegram(`💬 Pesan baru dari ${who}:\n\n${text.slice(0, 500)}\n\nBalas di: ${siteUrl()}/admin.html#${conv.id}`);
}

/** Data percakapan yang aman dikirim ke admin (tanpa hash token). */
function publicConv(c) {
  const { tokenHash, notifiedAt, rate, ...rest } = c;
  return rest;
}

module.exports = { getConv, saveConv, addMessage, getMessages, listConvs, rateLimit, notifyAdmin, publicConv };
