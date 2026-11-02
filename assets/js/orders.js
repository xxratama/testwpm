/**
 * WAK PREM — koneksi pesanan QRIS (mode pembayaran 'kriskris' atau 'gopay-qris').
 * Dipakai oleh website (app.js) dan Inbox admin (admin.js).
 *
 * server 'demo' → pesanan disimpan di browser ini (localStorage). Buka
 *                 /admin.html di tab lain pada browser yang sama untuk konfirmasi.
 * server 'api'  → pesanan lewat server (api/orders.js & api/admin-orders.js).
 */
(function () {
  'use strict';

  const CFG = window.WAKPREM_CONFIG || {};
  const CAT = window.WAKPREM_CATALOG;
  const MODE = (CFG.server || (CFG.liveChat && CFG.liveChat.mode)) === 'api' ? 'api' : 'demo';
  const API = (CFG.payment && CFG.payment.apiBase) || '/api';
  const EXPIRY = ((CFG.payment && CFG.payment.expiryMinutes) || 30) * 60000;
  const KRISKRIS = (CFG.payment && CFG.payment.mode) === 'kriskris';

  const publicView = (o) => ({
    id: o.id, mode: o.mode, status: o.status, total: o.total, uniqueCode: o.uniqueCode,
    qrPayload: o.status === 'pending' ? o.qrPayload || null : null,
    createdAt: o.createdAt, expiresAt: o.expiresAt, claimedAt: o.claimedAt || null,
    paidAt: o.paidAt || null, deliveredAt: o.deliveredAt || null,
    lines: o.lines.map((l) => ({ name: l.name, variantLabel: l.variantLabel, qty: l.qty, total: l.total })),
  });
  const expire = (o) => {
    if (o.status === 'pending' && Date.now() > o.expiresAt) { o.status = 'expired'; return true; }
    return false;
  };

  /* ---------- Demo: disimpan di localStorage ---------- */
  const KEY = 'wakprem:orders-db';
  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || { orders: {} }; } catch (e) { return { orders: {} }; }
  };
  const persist = (db) => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* penuh / diblokir */ }
  };
  const find = (db, id) => {
    const o = db.orders[String(id || '').toUpperCase()];
    if (!o) throw Object.assign(new Error('Pesanan tidak ditemukan'), { status: 404 });
    return o;
  };

  const demo = {
    async create({ items, buyer, voucher }) {
      const method = CAT.PAYMENT_METHODS.find((m) => m.manual);
      const t = CAT.calcTotals(items, voucher, method.id);
      if (t.errors.length) throw new Error(t.errors[0]);
      const db = load();
      const since = Date.now() - 24 * 3600 * 1000;
      const used = Object.values(db.orders).filter((o) => o.createdAt > since && ['pending', 'review'].includes(o.status)).map((o) => o.total);
      const now = Date.now();
      const order = {
        id: CAT.makeOrderId(), mode: 'manual', status: 'pending', createdAt: now, updatedAt: now, expiresAt: now + EXPIRY,
        buyer, method: method.id, lines: t.lines, subtotal: t.subtotal, discount: t.discount, voucher: t.voucher,
        fee: t.fee, uniqueCode: 0, total: t.total,
      };
      if (KRISKRIS) {
        // Tiruan tagihan kriskris: kode unik 10–99, berlaku 15 menit, QR berisi teks uji (tidak bisa dibayar)
        let code;
        do { code = 10 + Math.floor(Math.random() * 90); } while (used.includes(t.total + code));
        Object.assign(order, {
          mode: 'kriskris', invoiceId: 'inv-demo' + Math.random().toString(36).slice(2, 8),
          uniqueCode: code, total: t.total + code, expiresAt: now + 15 * 60000,
          qrPayload: `WAKPREM-UJI|${order.id}|${t.total + code}`,
        });
      } else {
        order.uniqueCode = CAT.pickUniqueCode(t.total, used);
        order.total += order.uniqueCode;
      }
      db.orders[order.id] = order;
      persist(db);
      return { order, token: 'demo' };
    },
    async get(id) {
      const db = load();
      const o = find(db, id);
      if (expire(o)) persist(db);
      return publicView(o);
    },
    async claim(id) {
      const db = load();
      const o = find(db, id);
      if ((o.mode === 'kriskris' ? ['expired'] : ['pending', 'expired']).includes(o.status)) {
        o.status = 'review';
        o.claimedAt = o.updatedAt = Date.now();
        persist(db);
      }
      return publicView(o);
    },
    // ---- admin ----
    async list() {
      const all = Object.values(load().orders);
      all.forEach(expire);
      return all.sort((a, b) => b.createdAt - a.createdAt);
    },
    async setStatus(id, status) {
      const db = load();
      const o = find(db, id);
      const now = Date.now();
      o.status = status;
      o.updatedAt = now;
      if (status === 'paid') o.paidAt = o.paidAt || now;
      if (status === 'delivered') { o.paidAt = o.paidAt || now; o.deliveredAt = now; }
      if (status === 'cancelled') o.cancelledAt = now;
      if (status === 'pending') o.expiresAt = Math.max(o.expiresAt, now + 30 * 60000);
      persist(db);
      return o;
    },
  };

  /* ---------- API: lewat server ---------- */
  async function req(path, opts) {
    const r = await fetch(API + path, opts);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || 'Gagal terhubung ke server'), { status: r.status });
    return d;
  }
  const adminKey = () => {
    try { return JSON.parse(localStorage.getItem('wakprem:adminKey')) || ''; } catch (e) { return ''; }
  };
  const post = (body, headers) => ({ method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}), body: JSON.stringify(body) });

  const api = {
    create: (p) => req('/orders', post(Object.assign({ action: 'create' }, p))),
    get: (id) => req('/orders?id=' + encodeURIComponent(id)).then((d) => d.order),
    claim: (id, token) => req('/orders', post({ action: 'claim', id, token })).then((d) => d.order),
    list: () => req('/admin-orders?action=list', { headers: { 'x-admin-key': adminKey() } }).then((d) => d.orders),
    setStatus: (id, status) => req('/admin-orders', post({ action: 'status', id, status }, { 'x-admin-key': adminKey() })).then((d) => d.order),
  };

  window.WAKPREM_ORDERS = Object.assign({ mode: MODE, pollMs: MODE === 'api' ? 5000 : 1500 }, MODE === 'api' ? api : demo);
})();
