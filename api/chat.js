/**
 * Live chat — sisi pengunjung.
 *   POST { action: 'start', name, contact, context, page }  → { convId, token }
 *   POST { action: 'send', convId, token, text }            → { message }
 *   POST { action: 'leave', convId, token }                 → { ok }
 *   GET  ?convId=&token=&after=<ts>                         → { status, messages }
 */
const { send, readBody, rid, sha, safeEqual } = require('./_http');
const store = require('./_chatstore');
const { clientIp } = require('./_redis');

const clip = (s, n) => String(s || '').trim().slice(0, n);

async function authed(convId, token) {
  const conv = await store.getConv(convId);
  if (!conv || !token || !safeEqual(sha(token).toString('hex'), conv.tokenHash)) return null;
  return conv;
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const u = new URL(req.url, 'http://localhost');
      const conv = await authed(u.searchParams.get('convId'), u.searchParams.get('token'));
      if (!conv) return send(res, 404, { error: 'Percakapan tidak ditemukan' });
      const after = Number(u.searchParams.get('after')) || 0;
      const messages = (await store.getMessages(conv.id)).filter((m) => m.ts > after);
      return send(res, 200, { status: conv.status, messages });
    }

    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const b = await readBody(req);

    if (b.action === 'start') {
      const name = clip(b.name, 60);
      if (name.length < 2) return send(res, 400, { error: 'Isi nama dulu ya' });
      if (!(await store.rateLimit('start:' + clientIp(req), 10, 3600))) return send(res, 429, { error: 'Terlalu banyak percakapan baru. Coba lagi nanti.' });
      const token = rid(24);
      const now = Date.now();
      const conv = {
        id: rid(12), name, contact: clip(b.contact, 100), context: clip(b.context, 2500), page: clip(b.page, 300),
        createdAt: now, updatedAt: now, status: 'open', unread: 0, tokenHash: sha(token).toString('hex'),
      };
      await store.addMessage(conv, 'system', 'Percakapan dimulai');
      return send(res, 200, { convId: conv.id, token });
    }

    const conv = await authed(b.convId, b.token);
    if (!conv) return send(res, 404, { error: 'Percakapan tidak ditemukan' });

    if (b.action === 'send') {
      const text = clip(b.text, 1000);
      if (!text) return send(res, 400, { error: 'Pesan kosong' });
      if (!(await store.rateLimit('msg:' + conv.id, 20, 60))) return send(res, 429, { error: 'Pelan-pelan ya, tunggu sebentar sebelum kirim lagi.' });
      if (conv.status === 'closed') conv.status = 'open';
      await store.notifyAdmin(conv, text);
      const message = await store.addMessage(conv, 'visitor', text);
      return send(res, 200, { message });
    }

    if (b.action === 'leave') {
      conv.status = 'closed';
      await store.addMessage(conv, 'system', 'Pengunjung mengakhiri chat');
      return send(res, 200, { ok: true });
    }

    return send(res, 400, { error: 'Aksi tidak dikenal' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: e.message || 'Server error' });
  }
};
