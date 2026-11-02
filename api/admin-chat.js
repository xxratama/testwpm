/**
 * Live chat — sisi admin. Wajib header `x-admin-key` = env ADMIN_PASSWORD.
 *   GET  ?action=list                          → { conversations }
 *   GET  ?action=messages&convId=              → { conversation, messages }  (menandai sudah dibaca)
 *   POST { action: 'reply', convId, text }     → { message }
 *   POST { action: 'status', convId, status }  → { ok }   status: 'open' | 'closed'
 */
const { send, readBody, safeEqual } = require('./_http');
const store = require('./_chatstore');

function isAdmin(req) {
  const pass = process.env.ADMIN_PASSWORD;
  return !!pass && safeEqual(req.headers['x-admin-key'] || '', pass);
}

module.exports = async (req, res) => {
  try {
    if (!process.env.ADMIN_PASSWORD) return send(res, 500, { error: 'ADMIN_PASSWORD belum diatur di server' });
    if (!isAdmin(req)) return send(res, 401, { error: 'Password admin salah' });

    if (req.method === 'GET') {
      const u = new URL(req.url, 'http://localhost');
      const action = u.searchParams.get('action');

      if (action === 'list') {
        const convs = await store.listConvs(150);
        return send(res, 200, { conversations: convs.map(store.publicConv) });
      }
      if (action === 'messages') {
        const conv = await store.getConv(u.searchParams.get('convId'));
        if (!conv) return send(res, 404, { error: 'Percakapan tidak ditemukan' });
        if (conv.unread) {
          conv.unread = 0;
          await store.saveConv(conv);
        }
        const messages = await store.getMessages(conv.id);
        return send(res, 200, { conversation: store.publicConv(conv), messages });
      }
      return send(res, 400, { error: 'Aksi tidak dikenal' });
    }

    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const b = await readBody(req);
    const conv = await store.getConv(b.convId);
    if (!conv) return send(res, 404, { error: 'Percakapan tidak ditemukan' });

    if (b.action === 'reply') {
      const text = String(b.text || '').trim().slice(0, 2000);
      if (!text) return send(res, 400, { error: 'Pesan kosong' });
      if (conv.status === 'closed') conv.status = 'open';
      conv.unread = 0;
      const message = await store.addMessage(conv, 'admin', text);
      return send(res, 200, { message });
    }

    if (b.action === 'status') {
      if (!['open', 'closed'].includes(b.status)) return send(res, 400, { error: 'Status tidak valid' });
      conv.status = b.status;
      await store.addMessage(conv, 'system', b.status === 'closed' ? 'Admin menutup percakapan' : 'Admin membuka kembali percakapan');
      return send(res, 200, { ok: true });
    }

    return send(res, 400, { error: 'Aksi tidak dikenal' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: e.message || 'Server error' });
  }
};
