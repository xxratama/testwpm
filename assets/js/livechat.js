/**
 * WAK PREM — koneksi live chat (pengunjung ↔ admin)
 * Dipakai oleh widget chat (chat.js) dan Inbox admin (admin.js).
 *
 * mode 'demo' → percakapan disimpan di browser ini (localStorage). Buka
 *               /admin.html di tab lain pada browser yang sama untuk membalas.
 * mode 'api'  → percakapan lewat server (api/chat.js & api/admin-chat.js).
 */
(function () {
  'use strict';

  const CFG = window.WAKPREM_CONFIG || {};
  const LC = CFG.liveChat || {};
  const MODE = (CFG.server || LC.mode) === 'api' ? 'api' : 'demo';
  const API = (CFG.payment && CFG.payment.apiBase) || '/api';
  const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

  function rid(n) {
    const a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => ALPHABET[b % 32]).join('');
  }

  /* ---------- Demo: disimpan di localStorage ---------- */
  const KEY = 'wakprem:livechat';
  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || { convs: {}, msgs: {} }; } catch (e) { return { convs: {}, msgs: {} }; }
  };
  const persist = (db) => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* penuh / diblokir */ }
  };

  function addMsg(db, conv, from, text) {
    const m = { id: rid(10), from, text, ts: Math.max(Date.now(), (conv.lastTs || 0) + 1) };
    (db.msgs[conv.id] = db.msgs[conv.id] || []).push(m);
    conv.lastTs = m.ts;
    conv.updatedAt = m.ts;
    conv.last = { from, text: text.slice(0, 120) };
    if (from === 'visitor') conv.unread = (conv.unread || 0) + 1;
    return m;
  }

  function demoConv(db, id) {
    const c = db.convs[id];
    if (!c) throw new Error('Percakapan tidak ditemukan');
    return c;
  }

  const demo = {
    async start({ name, contact, context, page }) {
      const db = load();
      const conv = { id: rid(12), name, contact, context, page, createdAt: Date.now(), updatedAt: Date.now(), status: 'open', unread: 0 };
      db.convs[conv.id] = conv;
      addMsg(db, conv, 'system', 'Percakapan dimulai');
      persist(db);
      return { convId: conv.id, token: 'demo' };
    },
    async send(convId, token, text) {
      const db = load();
      const conv = demoConv(db, convId);
      if (conv.status === 'closed') conv.status = 'open';
      const m = addMsg(db, conv, 'visitor', text);
      persist(db);
      return m;
    },
    async poll(convId, token, after) {
      const db = load();
      const conv = demoConv(db, convId);
      return { status: conv.status, messages: (db.msgs[convId] || []).filter((m) => m.ts > after) };
    },
    async leave(convId) {
      const db = load();
      const conv = db.convs[convId];
      if (!conv) return;
      conv.status = 'closed';
      addMsg(db, conv, 'system', 'Pengunjung mengakhiri chat');
      persist(db);
    },
    // ---- admin ----
    async login() { return true; },
    async list() {
      return Object.values(load().convs).sort((a, b) => b.updatedAt - a.updatedAt);
    },
    async messages(convId) {
      const db = load();
      const conv = demoConv(db, convId);
      conv.unread = 0;
      persist(db);
      return { conversation: conv, messages: db.msgs[convId] || [] };
    },
    async reply(convId, text) {
      const db = load();
      const conv = demoConv(db, convId);
      if (conv.status === 'closed') conv.status = 'open';
      const m = addMsg(db, conv, 'admin', text);
      persist(db);
      return m;
    },
    async setStatus(convId, status) {
      const db = load();
      const conv = demoConv(db, convId);
      conv.status = status;
      addMsg(db, conv, 'system', status === 'closed' ? 'Admin menutup percakapan' : 'Admin membuka kembali percakapan');
      persist(db);
    },
  };

  /* ---------- API: lewat server ---------- */
  let adminKey = '';
  async function req(path, opts) {
    const r = await fetch(API + path, opts);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err = new Error(d.error || 'Gagal terhubung ke server');
      err.status = r.status;
      throw err;
    }
    return d;
  }
  const post = (body, headers) => ({ method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}), body: JSON.stringify(body) });
  const adminHdr = () => ({ 'x-admin-key': adminKey });
  const q = encodeURIComponent;

  const api = {
    start: (p) => req('/chat', post(Object.assign({ action: 'start' }, p))),
    send: (convId, token, text) => req('/chat', post({ action: 'send', convId, token, text })).then((d) => d.message),
    poll: (convId, token, after) => req(`/chat?convId=${q(convId)}&token=${q(token)}&after=${after || 0}`),
    leave: (convId, token) => req('/chat', post({ action: 'leave', convId, token })),
    // ---- admin ----
    async login(key) {
      adminKey = key;
      await req('/admin-chat?action=list', { headers: adminHdr() });
      return true;
    },
    list: () => req('/admin-chat?action=list', { headers: adminHdr() }).then((d) => d.conversations),
    messages: (convId) => req(`/admin-chat?action=messages&convId=${q(convId)}`, { headers: adminHdr() }),
    reply: (convId, text) => req('/admin-chat', post({ action: 'reply', convId, text }, adminHdr())).then((d) => d.message),
    setStatus: (convId, status) => req('/admin-chat', post({ action: 'status', convId, status }, adminHdr())),
  };

  window.WAKPREM_LIVE = Object.assign(
    { mode: MODE, pollMs: MODE === 'api' ? LC.pollMs || 3000 : 1500 },
    MODE === 'api' ? api : demo
  );
})();
