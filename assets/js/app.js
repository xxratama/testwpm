/**
 * WAK PREM — storefront
 * Vanilla JS, tanpa build step. Halaman: beranda/katalog, detail produk
 * (sheet), keranjang, checkout, pembayaran, detail & cek pesanan.
 */
(function () {
  'use strict';

  const CAT = window.WAKPREM_CATALOG;
  const CFG = window.WAKPREM_CONFIG;
  const PAY = CFG.payment || {};
  // 'demo' (simulasi) | 'manual' (QRIS statis GoPay Merchant + konfirmasi admin)
  // 'auto' (QRIS kriskris, lunas terdeteksi otomatis) | 'midtrans'
  const MODE = { midtrans: 'midtrans', 'gopay-qris': 'manual', kriskris: 'auto' }[PAY.mode] || 'demo';
  const DEMO = MODE === 'demo';
  const MANUAL = MODE === 'manual';
  const AUTO = MODE === 'auto';
  /** Pesanan lewat window.WAKPREM_ORDERS & bayar pakai satu QRIS (manual atau kriskris). */
  const QRIS_ONLY = MANUAL || AUTO;
  const QRIS_MODES = ['manual', 'kriskris'];
  const isQris = (o) => QRIS_MODES.includes(o.mode);
  const ORDERS = window.WAKPREM_ORDERS;
  /** Metode bayar yang tampil sesuai mode (QRIS saja di mode manual/auto). */
  const METHODS = CAT.PAYMENT_METHODS.filter((m) => (QRIS_ONLY ? m.manual : !m.manual));
  /** Aplikasi yang bisa dipakai bayar QRIS (untuk deretan logo di mode manual/auto). */
  const QRIS_APPS = [
    { short: 'QRIS', color: '#111827' }, { short: 'GoPay', color: '#00AED6' }, { short: 'DANA', color: '#118EEA' },
    { short: 'OVO', color: '#4C3494' }, { short: 'SPay', color: '#EE4D2D' }, { short: 'LinkAja', color: '#E82127' },
    { short: 'm-Banking', color: '#0060AF' },
  ];
  const rp = CAT.rp;
  const DEFAULT_TITLE = document.title;

  /* =====================================================
     Utils
     ===================================================== */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmtDate = (ts) => new Date(ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const store = {
    get(k, d) {
      try { const v = localStorage.getItem('wakprem:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem('wakprem:' + k, JSON.stringify(v)); } catch (e) { /* storage penuh / diblokir */ }
    },
  };

  const ICONS = {
    search: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.3-4.3"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sparkles: '<path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6-5.6-1.9 5.6-1.9z"/><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    headphones: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    clapper: '<path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 4"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    tv: '<rect width="20" height="15" x="2" y="7" rx="2"/><path d="m17 2-5 5-5-5"/>',
    play: '<rect width="20" height="16" x="2" y="4" rx="4"/><path d="m10 9 5 3-5 3z"/>',
    palette: '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/>',
    message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    user: '<circle cx="12" cy="8" r="4.5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    phone: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    qr: '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
    bank: '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M12 2l9 5H3z"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    download: '<path d="M12 15V3"/><path d="m7 10 5 5 5-5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
    crown: '<path d="M3.5 8.5 8 12l4-6.5 4 6.5 4.5-3.5L19 18H5z"/>',
    star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
    send: '<path d="M14.54 21.69a.5.5 0 0 0 .94-.03l6.5-19a.5.5 0 0 0-.64-.64l-19 6.5a.5.5 0 0 0-.03.94l7.93 3.18a2 2 0 0 1 1.11 1.11z"/><path d="m21.85 2.15-10.94 10.94"/>',
  };

  function icon(name, size = 20, cls = '') {
    return `<svg class="i ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  const brandVars = (p) => `--brand:${p.colors[0]};--brand-2:${p.colors[1]}`;
  function pIcon(p, cls = '') {
    if (p.logo) {
      const color = p.logoStyle !== 'mono';
      return `<span class="p-icon ${cls}${color ? ' logo-color' : ''}" style="${brandVars(p)}"><img class="p-logo" src="${esc(p.logo)}" alt="" decoding="async"></span>`;
    }
    const size = { lg: 34, sm: 21, xs: 19 }[cls] || 26;
    return `<span class="p-icon ${cls}" style="${brandVars(p)}">${icon(p.icon, size)}</span>`;
  }
  const cheapest = (p) => p.variants.reduce((a, b) => (b.price < a.price ? b : a));
  const offPct = (v) => (v.original ? Math.round((1 - v.price / v.original) * 100) : 0);
  const maxOff = () => Math.max(0, ...CAT.PRODUCTS.filter((p) => !p.comingSoon).flatMap((p) => p.variants.map(offPct)));
  /** Total penghematan dibanding harga normal, untuk item keranjang / baris pesanan. */
  const savingOf = (items) => items.reduce((s, it) => {
    const v = CAT.findVariant(CAT.findProduct(it.productId), it.variantId);
    return s + (v && v.original ? (v.original - v.price) * (it.qty || 1) : 0);
  }, 0);
  const catLabel = (id) => (CAT.CATEGORIES.find((c) => c.id === id) || {}).label || '';
  const liveProducts = () => CAT.PRODUCTS.filter((p) => !p.comingSoon);
  const feeText = (m) => (m.feeFlat ? 'biaya ' + rp(m.feeFlat) : m.feePercent ? 'biaya ' + String(m.feePercent).replace('.', ',') + '%' : 'tanpa biaya');
  const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || 'kak';

  /* =====================================================
     State
     ===================================================== */
  function lookup(item) {
    const p = CAT.findProduct(item.productId);
    return { p, v: CAT.findVariant(p, item.variantId) };
  }
  let cart = store.get('cart', []).filter((it) => { const { p, v } = lookup(it); return p && v && !p.comingSoon; });
  let orders = store.get('orders', {});
  let draft = Object.assign({ name: '', email: '', phone: '', method: 'qris', voucher: '', agree: false }, store.get('draft', {}));
  if (!METHODS.some((m) => m.id === draft.method)) draft.method = METHODS[0].id;

  let filter = 'all';
  let query = '';
  let view = null;
  let lastRoute = null;
  let timerId = null;
  let pendingScroll = null;
  let sheetPushed = false;
  let voucherMsg = '';
  let voucherAttempt = '';
  const sheet = { product: null, variant: null, qty: 1 };

  const saveOrders = () => store.set('orders', orders);
  const saveDraft = () => store.set('draft', draft);
  const cartCount = () => cart.reduce((s, i) => s + i.qty, 0);

  function saveCart(silent) {
    store.set('cart', cart);
    updateBadge();
    if (silent) return;
    if ($('#cartSheet').classList.contains('open')) renderCart();
    if (view === 'checkout') renderView('checkout', null, true);
  }

  function addToCart(p, v, qty) {
    if (v.needsEmail) {
      cart.push({ key: `${p.id}|${v.id}|${Date.now().toString(36)}`, productId: p.id, variantId: v.id, qty: 1, targetEmail: '' });
    } else {
      const key = `${p.id}|${v.id}`;
      const ex = cart.find((i) => i.key === key);
      if (ex) ex.qty = Math.min(CAT.MAX_QTY, ex.qty + qty);
      else cart.push({ key, productId: p.id, variantId: v.id, qty });
    }
    saveCart();
    const badge = $('#cartCount');
    badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump');
  }

  function changeQty(key, delta) {
    const it = cart.find((i) => i.key === key);
    if (!it) return;
    it.qty = Math.max(1, Math.min(CAT.MAX_QTY, it.qty + delta));
    saveCart();
  }

  function removeItem(key) {
    cart = cart.filter((i) => i.key !== key);
    saveCart();
    toast('Produk dihapus dari keranjang', 'info');
  }

  function updateBadge() {
    const n = cartCount();
    const b = $('#cartCount');
    b.textContent = n;
    b.hidden = n === 0;
  }

  /* =====================================================
     Router
     ===================================================== */
  function parseRoute() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    return { name: parts[0] || 'home', param: parts[1] ? decodeURIComponent(parts[1]) : null };
  }

  function router() {
    const r = parseRoute();
    const prev = lastRoute;
    lastRoute = r.name;
    closeMenu();

    if (r.name === 'produk') {
      sheetPushed = prev === 'home' && view === 'home';
      if (view !== 'home') renderView('home');
      openProduct(r.param);
      return;
    }

    sheetPushed = false;
    closeSheet('product');
    closeSheet('cart');

    const name = { home: 'home', checkout: 'checkout', bayar: 'pay', pesanan: 'order', cek: 'track' }[r.name] || 'home';

    if (name === 'pay') {
      const o = orders[r.param];
      if (o) {
        refreshExpiry(o);
        if (o.status !== 'pending' || !['demo', ...QRIS_MODES].includes(o.mode)) { location.replace('#/pesanan/' + o.id); return; }
      }
    }
    if (name === 'home' && view === 'home') { document.title = DEFAULT_TITLE; doPendingScroll(); return; }
    renderView(name, r.param);
  }

  const VIEWS = {};
  const AFTER = {};

  function renderView(name, param, keepScroll) {
    clearInterval(timerId);
    timerId = null;
    view = name;
    const app = $('#app');
    app.innerHTML = VIEWS[name](param);
    document.body.classList.toggle('has-paybar', name === 'checkout' && cart.length > 0);
    if (AFTER[name]) AFTER[name](param);
    observeReveal(app);
    window.dispatchEvent(new CustomEvent('wakprem:view', { detail: name }));
    if (name === 'home' && pendingScroll) doPendingScroll();
    else if (!keepScroll) window.scrollTo(0, 0);
  }

  function scrollToSection(id) {
    if (view !== 'home' || parseRoute().name !== 'home') {
      pendingScroll = id;
      location.hash = '#/';
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function doPendingScroll() {
    if (!pendingScroll) return;
    const id = pendingScroll;
    pendingScroll = null;
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* =====================================================
     Shared bits
     ===================================================== */
  function progress(step) {
    const items = ['Keranjang', 'Pembayaran', 'Selesai'];
    return `<ol class="progress" aria-label="Langkah pemesanan">${items
      .map((t, i) => {
        const n = i + 1;
        const cls = n < step ? 'done' : n === step ? 'active' : '';
        return `<li class="${cls}"><span class="b">${n < step ? icon('check', 13) : n}</span>${t}</li>`;
      })
      .join('')}</ol>`;
  }

  function emptyState({ ic = 'bag', title, text, action = '' }) {
    return `<div class="empty-state"><div class="empty-illu">${icon(ic, 36)}</div><h3>${title}</h3><p>${text}</p>${action}</div>`;
  }

  function stepperHTML(qty, max, actDec, actInc, key = '', sm = false) {
    const k = key ? ` data-key="${esc(key)}"` : '';
    return `<div class="stepper${sm ? ' sm' : ''}">
      <button type="button" data-action="${actDec}"${k} aria-label="Kurangi jumlah" ${qty <= 1 ? 'disabled' : ''}>${icon('minus', 16)}</button>
      <output aria-live="polite">${qty}</output>
      <button type="button" data-action="${actInc}"${k} aria-label="Tambah jumlah" ${qty >= max ? 'disabled' : ''}>${icon('plus', 16)}</button>
    </div>`;
  }

  /* =====================================================
     HOME
     ===================================================== */
  VIEWS.home = function () {
    const live = liveProducts();
    const showcase = live.slice(0, 3);
    const lowest = Math.min(...live.map((p) => cheapest(p).price));
    const marqueeItems = CAT.PRODUCTS.map((p) => `<span>${esc(p.name)}${icon('sparkles', 18)}</span>`).join('');
    const promo = live[0];
    const hours = esc(CFG.operationalHours);

    return `
    <section class="hero">
      <div class="hero-bg" aria-hidden="true"><span class="blob blob-1"></span><span class="blob blob-2"></span></div>
      <div class="container hero-grid">
        <div class="hero-copy">
          ${promo ? `<a class="eyebrow" href="#/produk/${promo.id}"><span class="pill">Baru</span> ${esc(promo.name)} ${esc(promo.tags[0] || '')} sudah tersedia ${icon('arrow-right', 14)}</a>` : ''}
          <h1>Cari Apa Wak?<br>Semua Aplikasi <span class="mark">Ada!</span></h1>
          <p class="lead">Langganan AI, musik, dan editing favoritmu jadi jauh lebih hemat. Pilih produk, bayar langsung di sini, detail akun dikirim ke email kamu.</p>
          <form class="hero-search" data-form="hero-search" role="search">
            ${icon('search', 20)}
            <input name="q" type="search" placeholder="Cari Spotify, ChatGPT, CapCut…" aria-label="Cari produk" autocomplete="off">
            <button class="btn btn-primary" type="submit">Cari</button>
          </form>
          <div class="hero-perks">
            ${maxOff() ? `<span class="perk-hot">${icon('ticket', 18)} Diskon s.d. ${maxOff()}%</span>` : ''}
            <span>${icon('zap', 18)} Proses 5–15 menit</span>
            <span>${icon('shield', 18)} Bergaransi</span>
            <span>${icon('lock', 18)} Bayar aman di website</span>
          </div>
        </div>
        <div class="hero-visual" aria-hidden="true">
          ${showcase.map((p, i) => {
            const v = cheapest(p);
            return `<div class="float-card fc-${i}">
              <div class="fc-top">${pIcon(p)}<div><h4>${esc(p.name)}</h4><div class="fc-sub">${esc(p.tags.join(' · '))}</div></div></div>
              <div class="fc-bottom"><div class="fc-price">${rp(v.price)}${v.original ? `<s>${rp(v.original)}</s>` : ''}</div>${offPct(v) > 0 ? `<span class="off">-${offPct(v)}%</span>` : `<span class="badge">Mulai</span>`}</div>
            </div>`;
          }).join('')}
          <div class="float-chip chip-paid"><span class="dot">${icon('check', 14)}</span>Pembayaran diterima</div>
          <div class="float-chip chip-sent"><span class="dot">${icon('mail', 14)}</span>Akun terkirim ke email</div>
        </div>
      </div>
    </section>

    <div class="marquee" aria-hidden="true"><div class="marquee-track">${marqueeItems}${marqueeItems}</div></div>

    <section class="section" id="katalog">
      <div class="container">
        <div class="section-head reveal">
          <div>
            <span class="kicker">${icon('package', 16)} Katalog</span>
            <h2>Pilih premium favoritmu</h2>
            ${maxOff() ? `<p class="catalog-sub">${icon('ticket', 16)} Hemat hingga <b>${maxOff()}%</b> dari harga langganan resmi</p>` : ''}
          </div>
          <label class="search-inline">${icon('search', 18)}<input id="catalogSearch" type="search" placeholder="Cari produk…" value="${esc(query)}" aria-label="Cari di katalog" autocomplete="off"></label>
        </div>
        <div class="chips" role="toolbar" aria-label="Filter kategori" id="chips"></div>
        <div class="grid" id="productGrid"></div>
      </div>
    </section>

    <section class="section section-alt" id="kenapa">
      <div class="container">
        <div class="section-head reveal">
          <div>
            <span class="kicker">${icon('star', 16)} Kenapa Wak Prem</span>
            <h2>Belanja premium<br>tanpa drama.</h2>
          </div>
          <p>Semua dirancang biar kamu bisa beli dalam hitungan menit — tanpa nunggu chat dibalas.</p>
        </div>
        <div class="bento">
          <div class="bento-card feature wide reveal">
            <div class="bento-icon">${icon('lock', 24)}</div>
            <h3>Checkout & bayar langsung di website</h3>
            <p>Nggak perlu chat dulu. Pilih produk, bayar pakai QRIS, e-wallet, atau virtual account — semuanya di sini, status pesanan bisa dicek kapan saja.</p>
            <div class="bento-pay">${(QRIS_ONLY ? QRIS_APPS : METHODS).map((m) => `<span class="pay-logo" style="--c:${m.color}">${m.short}</span>`).join('')}</div>
          </div>
          <div class="bento-card reveal">
            <div class="big-num">5–15<small style="font-size:18px;letter-spacing:-.02em"> mnt</small></div>
            <h3>Akun dikirim cepat</h3>
            <p>Begitu pembayaran masuk, pesanan langsung diproses dan detail akun dikirim ke email kamu.</p>
          </div>
          <div class="bento-card reveal">
            <div class="bento-icon">${icon('shield', 24)}</div>
            <h3>Full garansi</h3>
            <p>Ada kendala selama masa aktif? Kami ganti atau perbaiki sesuai ketentuan garansi.</p>
          </div>
          <div class="bento-card reveal">
            <div class="bento-icon">${icon('receipt', 24)}</div>
            <h3>Harga transparan</h3>
            <p>Biaya layanan ditampilkan jelas sebelum bayar. Nggak ada biaya tersembunyi.</p>
          </div>
          <div class="bento-card reveal">
            <div class="bento-icon">${icon('message', 24)}</div>
            <h3>CS siap bantu</h3>
            <p>Tim kami standby setiap hari, jam ${hours}.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="cara-order">
      <div class="container">
        <div class="section-head center reveal">
          <span class="kicker">${icon('list', 16)} Cara order</span>
          <h2>4 langkah, langsung premium</h2>
        </div>
        <div class="steps">
          <div class="step-card reveal"><div class="n">1</div><h3>Pilih produk & paket</h3><p>Cari aplikasi yang kamu mau, pilih durasi atau jenis paketnya.</p></div>
          <div class="step-card reveal"><div class="n">2</div><h3>Isi data & email</h3><p>Masukkan email untuk menerima akun. Untuk upgrade akun sendiri, isi email akunmu.</p></div>
          <div class="step-card reveal"><div class="n">3</div><h3>Bayar di website</h3><p>${AUTO ? 'Scan QRIS pakai e-wallet atau m-banking apa saja — pembayaran terverifikasi otomatis.' : MANUAL ? 'Scan QRIS pakai e-wallet atau m-banking apa saja, lalu klik “Saya sudah bayar”.' : 'Scan QRIS, bayar via GoPay/ShopeePay, atau transfer virtual account.'}</p></div>
          <div class="step-card reveal"><div class="n">${icon('check', 18)}</div><h3>Terima akun</h3><p>Detail akun dikirim ke email. Pantau status kapan saja di menu Cek Pesanan.</p></div>
        </div>
      </div>
    </section>

    <section class="section section-alt" id="faq">
      <div class="container faq-wrap">
        <div class="reveal">
          <span class="kicker">${icon('info', 16)} FAQ & garansi</span>
          <h2>Pertanyaan yang sering muncul</h2>
          <div class="help-card">
            <h3>Masih ada yang bingung?</h3>
            <p>Tanya langsung ke CS kami — dijawab instan, 24 jam.</p>
            <button class="btn btn-outline" data-action="open-chat">${icon('message', 18)} Chat CS</button>
          </div>
        </div>
        <div class="faq reveal">
          ${[
            ['Berapa lama pesanan diproses?', `Rata-rata 5–15 menit setelah pembayaran berhasil, pada jam operasional ${hours}. Pesanan di luar jam operasional diproses paling awal keesokan harinya.`],
            ['Bagaimana cara saya menerima akun?', 'Detail akun (atau konfirmasi aktivasi untuk paket email sendiri) dikirim ke email yang kamu isi saat checkout. Cek juga folder Spam/Promosi. Status pesanan bisa dipantau di menu Cek Pesanan.'],
            ['Apa bedanya paket "akun dari kami" dan "email sendiri"?', 'Paket akun dari kami: kamu menerima email & password akun yang sudah premium. Paket email sendiri: kami mengaktifkan premium langsung di akun kamu, jadi data, playlist, dan riwayat tetap milikmu.'],
            ['Bagaimana ketentuan garansinya?', 'Garansi berlaku selama masa aktif paket. Jika akun bermasalah, hubungi CS dengan ID pesanan dan kami akan mengganti atau memperbaikinya. Garansi tidak berlaku jika kamu mengubah password/email akun sharing atau melanggar ketentuan di halaman produk.'],
            ['Metode pembayaran apa saja yang tersedia?', AUTO
              ? 'QRIS — bisa dibayar pakai DANA, OVO, GoPay, ShopeePay, LinkAja, dan semua m-banking. Nominal sudah otomatis terisi saat scan, dan pembayaran terverifikasi otomatis dalam hitungan detik.'
              : MANUAL
              ? 'QRIS — bisa dibayar pakai DANA, OVO, GoPay, ShopeePay, LinkAja, dan semua m-banking. Bayar dengan nominal persis (termasuk kode unik), klik “Saya sudah bayar”, dan admin akan mengonfirmasi pembayaranmu.'
              : 'QRIS (bisa dibayar pakai DANA, OVO, GoPay, ShopeePay, LinkAja, dan semua m-banking), GoPay, ShopeePay, serta Virtual Account BCA, BNI, BRI, Mandiri, dan Permata.'],
            ['Apakah saya perlu daftar akun di Wak Prem?', 'Nggak perlu. Cukup isi nama dan email saat checkout. Simpan ID pesanan kamu untuk cek status atau klaim garansi.'],
          ].map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${q}<span class="plus">${icon('plus', 16)}</span></summary><p>${a}</p></details>`).join('')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="cta reveal">
          <div>
            <h2>Siap upgrade ke premium?</h2>
            <p>Mulai dari ${rp(lowest)} aja. Bayar sekarang, akun langsung diproses.</p>
          </div>
          <button class="btn btn-accent btn-lg" data-action="scroll" data-target="katalog">Belanja sekarang ${icon('arrow-right', 18)}</button>
        </div>
      </div>
    </section>`;
  };

  AFTER.home = function () {
    document.title = DEFAULT_TITLE;
    renderChips();
    renderGrid();
  };

  function renderChips() {
    const el = $('#chips');
    if (!el) return;
    const cats = CAT.CATEGORIES.filter((c) => c.id === 'all' || CAT.PRODUCTS.some((p) => p.category === c.id));
    el.innerHTML = cats.map((c) => {
      const n = c.id === 'all' ? CAT.PRODUCTS.length : CAT.PRODUCTS.filter((p) => p.category === c.id).length;
      return `<button class="chip" data-action="filter" data-cat="${c.id}" aria-pressed="${filter === c.id}">${esc(c.label)} <span class="count">${n}</span></button>`;
    }).join('');
  }

  function filteredProducts() {
    const q = query.trim().toLowerCase();
    return CAT.PRODUCTS
      .filter((p) => filter === 'all' || p.category === filter)
      .filter((p) => !q || [p.name, p.tagline, (p.tags || []).join(' '), (p.aliases || []).join(' '), catLabel(p.category)].join(' ').toLowerCase().includes(q))
      .sort((a, b) => (a.comingSoon ? 1 : 0) - (b.comingSoon ? 1 : 0));
  }

  function productCard(p, i) {
    const d = `--d:${Math.min(i, 8) * 45}ms`;
    if (p.comingSoon) {
      return `<article class="product-card soon" style="${brandVars(p)};${d}">
        <div class="pc-top">${pIcon(p)}<span class="badge badge-soft">${icon('clock', 13)} Segera hadir</span></div>
        <div><h3>${esc(p.name)}</h3><p class="pc-sub">${esc(p.tagline)}</p></div>
      </article>`;
    }
    const v = cheapest(p);
    const off = offPct(v);
    return `<article class="product-card" style="${brandVars(p)};${d}">
      <button class="card-hit" data-action="open-product" data-id="${p.id}" aria-label="Lihat ${esc(p.name)}, mulai ${rp(v.price)}"></button>
      <div class="pc-top">${pIcon(p)}${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}</div>
      <div><h3>${esc(p.name)}</h3><p class="pc-sub">${esc(p.tagline)}</p></div>
      <div class="pc-tags">${p.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
      <div class="pc-bottom">
        <div class="pc-price"><span>Mulai dari</span><strong>${rp(v.price)}</strong>${v.original ? `<s>${rp(v.original)}</s><em class="save">Hemat ${rp(v.original - v.price)}</em>` : ''}</div>
        ${off > 0 ? `<span class="off big">-${off}%</span>` : ''}
        <span class="pc-go">${icon('arrow-right', 18)}</span>
      </div>
    </article>`;
  }

  function renderGrid() {
    const grid = $('#productGrid');
    if (!grid) return;
    const list = filteredProducts();
    if (!list.length) {
      grid.innerHTML = `<div class="empty-grid"><strong>Belum ada “${esc(query)}”</strong>Produk ini belum tersedia. <button class="link-btn accent" data-action="open-chat" data-live="Halo admin, saya mau request produk: ${esc(query)}">Request ke admin</button> biar kami tambahkan.</div>`;
    } else {
      const request = filter === 'all' && !query.trim()
        ? `<button class="product-card request" data-action="open-chat" data-live="Halo admin, saya mau request produk: " style="--d:${Math.min(list.length, 8) * 45}ms">
            <span class="p-icon">${icon('gift', 26)}</span>
            <div><h3>Mau aplikasi lain?</h3><p class="pc-sub">Produk baru terus ditambah. Request aplikasi favoritmu langsung ke admin.</p></div>
            <span class="btn btn-sm btn-ghost">Request ke admin ${icon('arrow-right', 16)}</span>
          </button>`
        : '';
      grid.innerHTML = list.map(productCard).join('') + request;
    }
    $$('#chips .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat === filter)));
  }

  /* =====================================================
     Sheets (product + cart)
     ===================================================== */
  const SHEETS = { product: '#productSheet', cart: '#cartSheet' };
  let lastFocus = null;

  function isOpen(name) { return $(SHEETS[name]).classList.contains('open'); }
  function anyOpen() { return Object.keys(SHEETS).some(isOpen); }

  function openSheet(name) {
    Object.keys(SHEETS).forEach((n) => n !== name && $(SHEETS[n]).classList.remove('open'));
    const el = $(SHEETS[name]);
    if (!anyOpen()) lastFocus = document.activeElement;
    el.classList.add('open');
    el.removeAttribute('inert');
    $('#overlay').classList.add('open');
    document.body.classList.add('locked');
    setTimeout(() => { const f = el.querySelector('[data-autofocus]'); if (f) f.focus({ preventScroll: true }); }, 60);
  }

  function closeSheet(name) {
    const el = $(SHEETS[name]);
    if (!el.classList.contains('open')) return;
    el.classList.remove('open');
    el.setAttribute('inert', '');
    if (!anyOpen()) {
      $('#overlay').classList.remove('open');
      document.body.classList.remove('locked');
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    }
  }

  function closeAllSheets() {
    if (isOpen('product')) requestCloseProduct();
    closeSheet('cart');
  }

  /* ---------- Product sheet ---------- */
  function openProduct(id) {
    const p = CAT.findProduct(id);
    if (!p || p.comingSoon) {
      history.replaceState(null, '', '#/');
      lastRoute = 'home';
      toast('Produk tidak ditemukan', 'error');
      return;
    }
    sheet.product = p;
    sheet.variant = p.variants.find((v) => v.default) || p.variants[0];
    sheet.qty = 1;
    $('#productSheet').innerHTML = productSheetHTML();
    openSheet('product');
    document.title = `${p.name} — Wak Prem`;
  }

  function requestCloseProduct() {
    if (sheetPushed) {
      sheetPushed = false;
      history.back();
    } else {
      history.replaceState(null, '', '#/');
      lastRoute = 'home';
      closeSheet('product');
      document.title = DEFAULT_TITLE;
    }
  }

  function productSheetHTML() {
    const p = sheet.product;
    return `
      <div class="sheet-head">
        <span class="kicker">${esc(catLabel(p.category))}</span>
        <div style="display:flex;gap:8px">
          <button class="icon-btn sm" data-action="share" aria-label="Bagikan produk">${icon('share', 17)}</button>
          <button class="icon-btn sm" data-action="close-product" aria-label="Tutup" data-autofocus>${icon('x', 18)}</button>
        </div>
      </div>
      <div class="sheet-body">
        <div class="ps-hero" style="${brandVars(p)}">${pIcon(p, 'lg')}<div><h2>${esc(p.name)}</h2><p>${esc(p.tagline)}</p></div></div>
        <div class="ps-meta">
          <div>${icon('zap', 18)}<span>Proses</span><strong>${esc(p.process || '5–15 menit')}</strong></div>
          <div>${icon('shield', 18)}<span>Garansi</span><strong>${esc(p.warranty || 'Full garansi')}</strong></div>
          <div>${icon('mail', 18)}<span>Dikirim via</span><strong>Email</strong></div>
        </div>
        <h3 class="ps-h">Pilih paket</h3>
        <div class="variants" role="radiogroup" aria-label="Pilih paket">
          ${p.variants.map((v) => `
            <label class="variant">
              ${v.tag ? `<span class="v-tag">${esc(v.tag)}</span>` : ''}
              <input type="radio" name="variant" value="${v.id}" ${v === sheet.variant ? 'checked' : ''}>
              <span class="radio"></span>
              <span class="v-main"><span class="v-label">${esc(v.label)}</span><span class="v-sub">${esc(v.sub || '')}</span></span>
              <span class="v-price">${offPct(v) > 0 ? `<span class="v-off">-${offPct(v)}%</span>` : ''}${rp(v.price)}${v.original ? `<s>${rp(v.original)}</s>` : ''}</span>
            </label>`).join('')}
        </div>
        ${p.variants.some((v) => v.original) ? '<p class="price-note">Harga coret = perkiraan harga langganan resmi.</p>' : ''}
        <h3 class="ps-h">Yang kamu dapat</h3>
        <ul class="features">${p.features.map((f) => `<li><span class="tick">${icon('check', 14)}</span><span>${esc(f)}</span></li>`).join('')}</ul>
        ${p.note ? `<div class="note">${icon('info', 18)}<span>${esc(p.note)}</span></div>` : ''}
      </div>
      <div class="sheet-foot" id="psFoot">${psFootHTML()}</div>`;
  }

  function psFootHTML() {
    const v = sheet.variant;
    return `
      <div class="ps-foot-row">
        ${v.needsEmail
          ? `<span class="qty-fixed">${icon('mail', 14)} Email akun diisi saat checkout</span>`
          : stepperHTML(sheet.qty, CAT.MAX_QTY, 'ps-dec', 'ps-inc')}
        <div class="ps-total"><span>Total</span><strong>${rp(v.price * sheet.qty)}</strong>${v.original ? `<em class="save">Hemat ${rp((v.original - v.price) * sheet.qty)}</em>` : ''}</div>
      </div>
      <div class="ps-actions">
        <button class="btn btn-outline btn-lg" data-action="add-cart">${icon('plus', 18)} Keranjang</button>
        <button class="btn btn-primary btn-lg" data-action="buy-now">Beli sekarang</button>
      </div>`;
  }

  function refreshPsFoot() { $('#psFoot').innerHTML = psFootHTML(); }

  /* ---------- Cart sheet ---------- */
  function renderCart() {
    const el = $('#cartSheet');
    const n = cartCount();
    const subtotal = CAT.calcTotals(cart).subtotal;
    el.innerHTML = `
      <div class="sheet-head">
        <h2>Keranjang ${n ? `<span class="muted">(${n})</span>` : ''}</h2>
        <button class="icon-btn sm" data-action="close-cart" aria-label="Tutup keranjang" data-autofocus>${icon('x', 18)}</button>
      </div>
      <div class="sheet-body">
        ${cart.length
          ? `<ul class="cart-list">${cart.map(cartItemHTML).join('')}</ul>`
          : emptyState({ title: 'Keranjang masih kosong', text: 'Yuk pilih aplikasi premium favoritmu dulu.', action: `<button class="btn btn-primary" data-action="scroll" data-target="katalog">Lihat katalog</button>` })}
      </div>
      ${cart.length ? `
      <div class="sheet-foot">
        <div class="sum-line"><span>Subtotal</span><strong>${rp(subtotal)}</strong></div>
        <a class="btn btn-primary btn-lg btn-block" href="#/checkout">Checkout sekarang ${icon('arrow-right', 18)}</a>
      </div>` : ''}`;
  }

  function cartItemHTML(it) {
    const { p, v } = lookup(it);
    return `<li class="cart-item">
      ${pIcon(p, 'sm')}
      <div><div class="ci-name">${esc(p.name)}</div><div class="ci-var">${esc(v.label)}</div><div class="ci-price">${rp(v.price * it.qty)}</div></div>
      <div class="ci-side">
        ${v.needsEmail ? '<span class="qty-fixed">1 akun</span>' : stepperHTML(it.qty, CAT.MAX_QTY, 'dec', 'inc', it.key, true)}
        <button class="link-btn" data-action="remove" data-key="${esc(it.key)}">${icon('trash', 14)} Hapus</button>
      </div>
    </li>`;
  }

  /* =====================================================
     CHECKOUT
     ===================================================== */
  function field({ name, label, type = 'text', ic, value = '', placeholder = '', hint = '', error = '', attrs = '' }) {
    return `<div class="field" data-field="${name}">
      <label for="f-${name}">${label}</label>
      <div class="input-wrap">${ic ? icon(ic, 18) : ''}<input class="input${ic ? '' : ' plain'}" id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${attrs}></div>
      ${hint ? `<span class="hint">${hint}</span>` : ''}
      <span class="field-error" role="alert">${icon('info', 14)} ${error}</span>
    </div>`;
  }

  VIEWS.checkout = function () {
    document.title = 'Checkout — Wak Prem';
    if (!cart.length) {
      return `<section class="page"><div class="container">${emptyState({
        title: 'Keranjang masih kosong',
        text: 'Tambahkan produk dulu sebelum checkout.',
        action: `<button class="btn btn-primary btn-lg" data-action="scroll" data-target="katalog">Lihat katalog ${icon('arrow-right', 18)}</button>`,
      })}</div></section>`;
    }
    const needs = cart.filter((it) => lookup(it).v.needsEmail);
    const t = CAT.calcTotals(cart, draft.voucher, draft.method);
    let n = 1;

    return `
    <section class="page"><div class="container">
      <div class="page-head">
        <div>
          <a class="back-link" href="#/">${icon('arrow-left', 18)} Lanjut belanja</a>
          <h1>Checkout</h1>
        </div>
        ${progress(2)}
      </div>
      <form id="checkoutForm" class="checkout-grid" novalidate>
        <div class="stack">
          <div class="panel">
            <div class="panel-title"><span class="step-num">${n++}</span> Data pembeli</div>
            ${field({ name: 'name', label: 'Nama lengkap', ic: 'user', value: draft.name, placeholder: 'Nama kamu', error: 'Isi nama minimal 2 huruf', attrs: 'autocomplete="name" required' })}
            <div class="two-col">
              ${field({ name: 'email', type: 'email', label: 'Email', ic: 'mail', value: draft.email, placeholder: 'kamu@gmail.com', hint: 'Akun & bukti bayar dikirim ke sini', error: 'Format email belum benar', attrs: 'autocomplete="email" inputmode="email" required' })}
              ${field({ name: 'phone', type: 'tel', label: 'No. WhatsApp <span class="opt">(opsional)</span>', ic: 'phone', value: draft.phone, placeholder: '08xxxxxxxxxx', hint: 'Untuk info status pesanan', error: 'Nomor belum valid (contoh: 0812xxxxxxx)', attrs: 'autocomplete="tel" inputmode="tel"' })}
            </div>
          </div>

          ${needs.length ? `
          <div class="panel">
            <div class="panel-title"><span class="step-num">${n++}</span> Akun tujuan aktivasi</div>
            ${needs.map((it, i) => {
              const { p, v } = lookup(it);
              return `<div class="target-block">
                <div class="target-item">${pIcon(p, 'xs')}<div><strong>${esc(p.name)}</strong><span>${esc(v.label)}</span></div></div>
                ${field({ name: 'target-' + i, type: 'email', label: esc(v.emailLabel || 'Email akun tujuan'), ic: 'mail', value: it.targetEmail || '', placeholder: 'email@contoh.com', hint: `<button type="button" class="link-btn accent" data-action="same-email" data-target="f-target-${i}">Pakai email pembeli</button>`, error: 'Format email belum benar', attrs: `data-key="${esc(it.key)}" inputmode="email" autocomplete="off" required` })}
              </div>`;
            }).join('')}
          </div>` : ''}

          <div class="panel">
            <div class="panel-title"><span class="step-num">${n++}</span> Metode pembayaran</div>
            ${paymentOptionsHTML()}
          </div>
        </div>

        <aside class="summary panel" id="summary" aria-label="Ringkasan pesanan">${summaryHTML()}</aside>
      </form>
    </div></section>
    <div class="mobile-paybar">
      <div><span>Total bayar</span><strong id="mpTotal">${rp(t.total)}</strong></div>
      <button class="btn btn-primary btn-lg" type="submit" form="checkoutForm" id="mpBtn">${icon('lock', 18)} Bayar</button>
    </div>`;
  };

  function paymentOptionsHTML() {
    const groupIcon = { qris: 'qr', ewallet: 'wallet', va: 'bank' };
    return Object.entries(CAT.PAYMENT_GROUPS).map(([g, label]) => {
      const ms = METHODS.filter((m) => m.group === g);
      if (!ms.length) return '';
      return `<div class="pay-group-title">${icon(groupIcon[g] || 'wallet', 16)} ${label}</div>
        <div class="pay-options" role="radiogroup" aria-label="${label}">
          ${ms.map((m) => `
            <label class="pay-option${g === 'qris' ? ' wide' : ''}">
              <input type="radio" name="method" value="${m.id}" ${draft.method === m.id ? 'checked' : ''}>
              <span class="pay-logo" style="--c:${m.color}">${m.short}</span>
              <span class="po-main"><span class="po-name">${esc(m.name)}${m.recommended ? '<span class="po-rec">Rekomendasi</span>' : ''}</span><span class="po-desc">${esc(m.desc)} · ${feeText(m)}</span></span>
              <span class="radio"></span>
            </label>`).join('')}
        </div>`;
    }).join('');
  }

  function voucherHTML(t) {
    if (t.voucher) {
      return `<div class="voucher-applied">${icon('ticket', 18)}<span>${esc(t.voucher.code)}<small>${esc(t.voucher.label)}</small></span>
        <button type="button" class="icon-btn sm" data-action="remove-voucher" aria-label="Hapus voucher">${icon('x', 16)}</button></div>`;
    }
    const promo = Object.entries(CAT.VOUCHERS).find(([, v]) => v.promote);
    const msg = voucherMsg || (draft.voucher && t.voucherError) || '';
    return `<div class="voucher">
        <div class="input-wrap" style="flex:1">${icon('ticket', 18)}<input class="input" id="voucherInput" placeholder="Kode voucher" autocomplete="off" value="${esc(voucherAttempt || draft.voucher)}" aria-label="Kode voucher"></div>
        <button type="button" class="btn btn-ghost" data-action="apply-voucher">Pakai</button>
      </div>
      ${msg ? `<p class="voucher-msg">${esc(msg)}</p>`
        : promo ? `<p class="voucher-hint">Pakai kode <button type="button" data-action="fill-voucher" data-code="${promo[0]}">${promo[0]}</button> — ${esc(promo[1].label)}</p>` : ''}`;
  }

  function summaryHTML() {
    const t = CAT.calcTotals(cart, draft.voucher, draft.method);
    return `
      <div class="panel-title">Ringkasan <span class="sub">${cartCount()} item</span></div>
      <ul class="sum-items">${t.lines.map((l) => `
        <li class="sum-item">${pIcon(CAT.findProduct(l.productId), 'xs')}
          <div class="meta"><strong>${esc(l.name)}</strong><span>${esc(l.variantLabel)}${l.qty > 1 ? ` · ${l.qty}x` : ''}</span></div>
          <span class="price">${rp(l.total)}</span>
        </li>`).join('')}</ul>
      ${voucherHTML(t)}
      <div class="sum-rows">
        <div class="sum-row"><span>Subtotal</span><strong>${rp(t.subtotal)}</strong></div>
        ${t.discount ? `<div class="sum-row discount"><span>Diskon · ${esc(t.voucher.code)}</span><strong>−${rp(t.discount)}</strong></div>` : ''}
        <div class="sum-row"><span>Biaya layanan${t.method ? ' · ' + esc(t.method.short) : ''}</span><strong>${t.fee ? rp(t.fee) : 'Gratis'}</strong></div>
        ${QRIS_ONLY ? `<div class="sum-row"><span>Kode unik</span><strong>+${AUTO ? 'Rp10–99' : 'Rp1–299'}</strong></div>` : ''}
      </div>
      <div class="sum-total"><span>Total bayar</span><span class="amount">${rp(t.total)}${QRIS_ONLY ? '<small class="plus-code">+ kode unik</small>' : ''}</span></div>
      ${savingOf(cart) + t.discount > 0 ? `<div class="sum-save">${icon('ticket', 16)} Kamu hemat <b>${rp(savingOf(cart) + t.discount)}</b> dari harga normal</div>` : ''}
      <label class="agree"><input type="checkbox" name="agree" ${draft.agree ? 'checked' : ''}>
        <span>Saya sudah membaca & setuju dengan <a href="#/" data-action="scroll" data-target="faq">ketentuan & garansi</a> Wak Prem.</span></label>
      <button class="btn btn-primary btn-lg btn-block" type="submit" id="payBtn">${icon('lock', 18)} ${QRIS_ONLY ? 'Lanjut ke pembayaran' : 'Bayar ' + rp(t.total)}</button>
      <p class="secure">${icon('shield', 15)} ${DEMO ? 'Mode demo — tidak ada uang yang ditarik'
        : AUTO ? 'Bayar via QRIS, terverifikasi otomatis dalam hitungan detik'
        : MANUAL ? 'Bayar via QRIS resmi toko, dikonfirmasi admin' : 'Pembayaran aman diproses oleh Midtrans'}</p>`;
  }

  function updateSummary() {
    const s = $('#summary');
    if (!s) return;
    s.innerHTML = summaryHTML();
    const t = CAT.calcTotals(cart, draft.voucher, draft.method);
    const mp = $('#mpTotal');
    if (mp) mp.textContent = rp(t.total);
  }

  function applyVoucher() {
    const input = $('#voucherInput');
    const code = (input ? input.value : '').trim().toUpperCase();
    voucherAttempt = code;
    if (!code) { voucherMsg = 'Masukkan kode voucher dulu'; updateSummary(); return; }
    const t = CAT.calcTotals(cart, code, draft.method);
    if (t.voucher) {
      draft.voucher = code;
      voucherMsg = '';
      voucherAttempt = '';
      saveDraft();
      toast(`Voucher dipakai, hemat ${rp(t.discount)}!`);
    } else {
      voucherMsg = t.voucherError;
    }
    updateSummary();
  }

  /* ---------- Validation ---------- */
  function normPhone(s) {
    let d = String(s || '').replace(/\D/g, '');
    if (d.startsWith('0')) d = '62' + d.slice(1);
    else if (d.startsWith('8')) d = '62' + d;
    return d;
  }
  const VALIDATORS = {
    name: (v) => v.trim().length >= 2,
    email: (v) => EMAIL_RE.test(v.trim()),
    phone: (v) => !v.trim() || /^62\d{8,13}$/.test(normPhone(v)),
  };

  function validateField(input, show) {
    const fn = input.name.startsWith('target-') ? VALIDATORS.email : VALIDATORS[input.name];
    if (!fn) return true;
    const ok = fn(input.value);
    const f = input.closest('.field');
    if (show || f.classList.contains('invalid')) f.classList.toggle('invalid', !ok);
    f.classList.toggle('valid', ok && input.value.trim() !== '');
    input.setAttribute('aria-invalid', String(!ok && f.classList.contains('invalid')));
    return ok;
  }

  function shake(el) {
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 450);
  }

  function setPayLoading(on) {
    ['#payBtn', '#mpBtn'].forEach((s) => {
      const b = $(s);
      if (!b) return;
      if (on) { b.dataset.html = b.innerHTML; b.innerHTML = '<span class="spinner"></span> Memproses…'; b.classList.add('loading'); }
      else if (b.dataset.html) { b.innerHTML = b.dataset.html; b.classList.remove('loading'); }
    });
  }

  async function submitCheckout(form) {
    let firstBad = null;
    $$('input.input', form).forEach((inp) => {
      if (inp.id === 'voucherInput') return;
      if (!validateField(inp, true) && !firstBad) firstBad = inp;
    });
    if (firstBad) {
      firstBad.focus();
      shake(firstBad.closest('.field'));
      toast('Lengkapi data yang ditandai merah dulu ya', 'error');
      return;
    }
    const agree = form.querySelector('[name=agree]');
    if (!agree.checked) {
      const a = agree.closest('.agree');
      a.classList.add('invalid');
      shake(a);
      toast('Centang persetujuan ketentuan dulu ya', 'error');
      return;
    }

    const payload = {
      items: cart.map(({ productId, variantId, qty, targetEmail }) => ({ productId, variantId, qty, targetEmail })),
      buyer: { name: draft.name.trim(), email: draft.email.trim(), phone: draft.phone.trim() ? normPhone(draft.phone) : '' },
      methodId: draft.method,
      voucher: draft.voucher,
    };
    const totals = CAT.calcTotals(payload.items, payload.voucher, payload.methodId);
    if (totals.errors.length) { toast(totals.errors[0], 'error'); return; }

    setPayLoading(true);
    try {
      if (QRIS_ONLY) {
        const r = await ORDERS.create({ items: payload.items, buyer: payload.buyer, voucher: payload.voucher });
        const o = Object.assign({}, r.order, { mode: r.order.mode || 'manual', token: r.token });
        finalizeOrder(o);
        location.hash = '#/bayar/' + o.id;
      } else if (DEMO) {
        await sleep(900);
        const o = buildOrder(genId(), payload, totals);
        const m = CAT.findMethod(o.method);
        if (m.group === 'va') o.va = (m.vaPrefix + String(Math.floor(Math.random() * 1e12)).padStart(12, '0')).slice(0, 16);
        finalizeOrder(o);
        location.hash = '#/bayar/' + o.id;
      } else {
        await Midtrans.load();
        const res = await Midtrans.create(payload);
        const o = buildOrder(res.orderId, payload, res.totals || totals, { snapToken: res.token, redirectUrl: res.redirectUrl });
        finalizeOrder(o);
        location.hash = '#/pesanan/' + o.id;
        Midtrans.pay(o);
      }
    } catch (err) {
      toast(err.message || 'Terjadi kesalahan, coba lagi ya', 'error');
      setPayLoading(false);
    }
  }

  function genId() {
    const d = new Date();
    const ymd = String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate());
    const r = Math.random().toString(36).slice(2, 7).toUpperCase().padEnd(5, 'X');
    return `WP-${ymd}-${r}`;
  }

  function buildOrder(id, payload, totals, extra) {
    return Object.assign({
      id,
      mode: DEMO ? 'demo' : 'midtrans',
      createdAt: Date.now(),
      expiresAt: Date.now() + (PAY.expiryMinutes || 15) * 60000,
      status: 'pending',
      paidAt: null,
      buyer: payload.buyer,
      method: payload.methodId,
      lines: totals.lines,
      subtotal: totals.subtotal,
      discount: totals.discount,
      voucher: totals.voucher,
      fee: totals.fee,
      total: totals.total,
    }, extra || {});
  }

  function finalizeOrder(o) {
    orders[o.id] = o;
    saveOrders();
    cart = [];
    store.set('cart', cart);
    updateBadge();
    draft.voucher = '';
    draft.agree = false;
    saveDraft();
  }

  function refreshExpiry(o) {
    if (o.status === 'pending' && ['demo', ...QRIS_MODES].includes(o.mode) && Date.now() > o.expiresAt) {
      o.status = 'expired';
      saveOrders();
    }
  }

  /* =====================================================
     PAYMENT (demo)
     ===================================================== */
  function qrSVG(text) {
    if (typeof window.qrcode !== 'function') {
      return `<div style="display:grid;place-items:center;height:100%;color:#666;font-size:13px;text-align:center">QR gagal dimuat.<br>Muat ulang halaman.</div>`;
    }
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return `<svg viewBox="0 0 ${n} ${n}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img" aria-label="Kode QR pembayaran"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#15121F"/></svg>`;
  }

  const formatVA = (s) => String(s || '').replace(/(\d{4})(?=\d)/g, '$1 ');

  function howtoSteps(m) {
    if (m.group === 'va') {
      return [
        `Buka aplikasi ${m.desc.split(',')[0]} atau datangi ATM ${m.short.toUpperCase()}.`,
        'Pilih menu <strong>Transfer → Virtual Account</strong> (atau Bayar/Multipayment).',
        'Masukkan nomor Virtual Account di atas.',
        'Pastikan nama merchant <strong>Wak Prem</strong> dan nominal sudah sesuai.',
        'Konfirmasi pembayaran. Status pesanan otomatis berubah setelah pembayaran masuk.',
      ];
    }
    if (m.group === 'ewallet') {
      return [
        `Buka aplikasi ${m.name} di HP kamu.`,
        'Pilih menu <strong>Bayar / Scan</strong>, lalu scan kode QR di atas.',
        'Periksa nominal & nama merchant <strong>Wak Prem</strong>.',
        'Masukkan PIN untuk menyelesaikan pembayaran.',
      ];
    }
    return [
      'Buka aplikasi e-wallet atau m-banking apa saja (DANA, OVO, GoPay, ShopeePay, BCA mobile, dll).',
      'Pilih menu <strong>Scan / Bayar QRIS</strong>, lalu scan kode QR di atas. Kalau bayar dari HP yang sama, simpan QR lalu upload dari galeri.',
      'Pastikan nominal & nama merchant <strong>Wak Prem</strong> sudah sesuai.',
      'Konfirmasi dengan PIN. Status pesanan otomatis berubah setelah pembayaran masuk.',
    ];
  }

  /** "Rp40.123" dengan digit kode unik disorot (3 digit QRIS manual, 2 digit kriskris). */
  function rpCode(n, digits = 3) {
    const s = rp(n);
    return n >= 1000 ? `${s.slice(0, -digits)}<mark class="code">${s.slice(-digits)}</mark>` : s;
  }
  const codeDigits = (o) => (o.mode === 'kriskris' ? 2 : 3);

  function payManualHTML(o) {
    const q = PAY.qris || {};
    const merchant = esc(q.merchantName || CFG.storeName || 'Wak Prem');
    return `
    <section class="page"><div class="container pay-wrap">
      <div class="page-head">
        <div><a class="back-link" href="#/pesanan/${esc(o.id)}">${icon('arrow-left', 18)} Detail pesanan</a><h1>Bayar pakai QRIS</h1></div>
        ${progress(2)}
      </div>
      ${ORDERS.mode === 'demo' ? `<div class="demo-banner">${icon('info', 20)}<div><strong>Mode uji</strong>Pesanan tersimpan di browser ini saja. Buka <a href="admin.html#pesanan" target="_blank" rel="noopener">halaman admin → Pesanan</a> di tab lain untuk mencoba konfirmasi.</div></div>` : ''}
      <div class="panel">
        <div class="pay-head">
          <div><div class="label">Bayar persis</div>
            <div class="pay-amount">${rpCode(o.total)}<button class="copy-btn" data-action="copy" data-copy="${o.total}" aria-label="Salin nominal">${icon('copy', 16)}</button></div>
          </div>
          <div class="timer" id="timer" aria-label="Sisa waktu pembayaran">${icon('clock', 16)}<span>--:--</span></div>
        </div>
        <div class="code-note">${icon('info', 18)}<span>Masukkan nominal <b>persis ${rp(o.total)}</b> — termasuk <b>kode unik ${o.uniqueCode}</b> di 3 digit terakhir — supaya pembayaranmu cepat dikenali admin.</span></div>
        <div class="qr-frame">
          <div class="qr-label">${icon('qr', 16)} Scan pakai e-wallet / m-banking apa saja</div>
          <div class="qr-box qr-img">
            <img src="${esc(q.image || '')}" alt="QRIS ${merchant}" onerror="this.parentNode.classList.add('missing')">
            <div class="qr-missing">${icon('qr', 34)}<b>QRIS belum dipasang</b><span>Simpan gambar QRIS dari aplikasi GoPay Merchant ke <code>${esc(q.image || 'assets/img/qris-gopay.png')}</code></span></div>
          </div>
          <div class="qr-merchant">a.n. <b>${merchant}</b></div>
          <div class="qr-actions"><a class="btn btn-sm btn-ghost" href="${esc(q.image || '')}" download="QRIS-${merchant}.png">${icon('download', 16)} Simpan QRIS</a></div>
        </div>
        <div class="pay-actions">
          <button class="btn btn-primary btn-lg btn-block" data-action="claim-paid" data-id="${esc(o.id)}">${icon('check', 18)} Saya sudah bayar ${rp(o.total)}</button>
          <p class="hint" style="text-align:center">Klik setelah pembayaran berhasil. Admin akan mengecek & mengonfirmasi pesananmu.</p>
        </div>
      </div>
      <div class="panel" style="margin-top:16px">
        <div class="panel-title">Cara bayar</div>
        <ol class="howto">
          <li><span>Buka aplikasi e-wallet atau m-banking apa saja (GoPay, DANA, OVO, ShopeePay, BCA mobile, dll).</span></li>
          <li><span>Pilih <b>Scan / Bayar QRIS</b>, lalu scan QR di atas. Kalau bayar dari HP yang sama, tekan <b>Simpan QRIS</b> lalu upload dari galeri.</span></li>
          <li><span>Ketik nominal <b>persis ${rp(o.total)}</b> dan pastikan nama penerima <b>${merchant}</b>.</span></li>
          <li><span>Selesaikan pembayaran, lalu kembali ke sini dan klik <b>Saya sudah bayar</b>.</span></li>
          <li><span>Admin mengonfirmasi dalam 5–15 menit (jam operasional ${esc(CFG.operationalHours)}). Halaman pesanan akan ter-update otomatis.</span></li>
        </ol>
      </div>
    </div></section>`;
  }

  /** Halaman bayar QRIS kriskris: QR dinamis (nominal sudah terisi), lunas terdeteksi otomatis. */
  function payAutoHTML(o) {
    const q = PAY.qris || {};
    const merchant = esc(q.merchantName || CFG.storeName || 'Wak Prem');
    return `
    <section class="page"><div class="container pay-wrap">
      <div class="page-head">
        <div><a class="back-link" href="#/pesanan/${esc(o.id)}">${icon('arrow-left', 18)} Detail pesanan</a><h1>Bayar pakai QRIS</h1></div>
        ${progress(2)}
      </div>
      ${ORDERS.mode === 'demo' ? `<div class="demo-banner">${icon('info', 20)}<div><strong>Mode uji</strong>QR di bawah hanya tiruan (tidak bisa dibayar). Buka <a href="admin.html#pesanan" target="_blank" rel="noopener">halaman admin → Pesanan</a> di tab lain lalu klik <b>Tandai lunas</b> untuk mensimulasikan pembayaran masuk.</div></div>` : ''}
      <div class="panel">
        <div class="pay-head">
          <div><div class="label">Total pembayaran</div>
            <div class="pay-amount">${rpCode(o.total, 2)}<button class="copy-btn" data-action="copy" data-copy="${o.total}" aria-label="Salin nominal">${icon('copy', 16)}</button></div>
          </div>
          <div class="timer" id="timer" aria-label="Sisa waktu pembayaran">${icon('clock', 16)}<span>--:--</span></div>
        </div>
        <div class="code-note">${icon('info', 18)}<span>Nominal <b>${rp(o.total)}</b> (termasuk kode unik <b>${o.uniqueCode}</b>) otomatis terisi saat QR di-scan. Jangan diubah supaya pembayaranmu langsung terdeteksi.</span></div>
        <div class="qr-frame">
          <div class="qr-label">${icon('qr', 16)} Scan pakai e-wallet / m-banking apa saja</div>
          <div class="qr-box">${qrSVG(o.qrPayload || '')}</div>
          <div class="qr-merchant">a.n. <b>${merchant}</b></div>
          <div class="qr-actions"><button class="btn btn-sm btn-ghost" data-action="download-qr" data-id="${esc(o.id)}">${icon('download', 16)} Simpan QR</button></div>
        </div>
        <div class="pay-actions">
          <div class="pay-wait"><span class="spinner"></span> Menunggu pembayaran — halaman ini lanjut otomatis setelah pembayaran masuk</div>
          <button class="btn btn-outline btn-lg btn-block" data-action="check-auto" data-id="${esc(o.id)}">${icon('refresh', 18)} Saya sudah bayar, cek status</button>
        </div>
      </div>
      <div class="panel" style="margin-top:16px">
        <div class="panel-title">Cara bayar</div>
        <ol class="howto">
          <li><span>Buka aplikasi e-wallet atau m-banking apa saja (GoPay, DANA, OVO, ShopeePay, BCA mobile, dll).</span></li>
          <li><span>Pilih <b>Scan / Bayar QRIS</b>, lalu scan QR di atas. Kalau bayar dari HP yang sama, tekan <b>Simpan QR</b> lalu upload dari galeri.</span></li>
          <li><span>Pastikan nominal <b>${rp(o.total)}</b> dan nama penerima <b>${merchant}</b>, lalu konfirmasi dengan PIN.</span></li>
          <li><span>Selesai! Pembayaran terdeteksi otomatis dalam hitungan detik, lalu akun dikirim ke <b>${esc(o.buyer.email)}</b>.</span></li>
        </ol>
      </div>
    </div></section>`;
  }

  /** Cek status pesanan QRIS kriskris. Sudah tidak menunggu bayar → pindah ke halaman pesanan. */
  async function pollAuto(id, btn) {
    const html = btn && btn.innerHTML;
    if (btn) { btn.classList.add('loading'); btn.innerHTML = '<span class="spinner"></span> Mengecek pembayaran…'; }
    try {
      const pub = await ORDERS.get(id);
      const o = orders[id];
      if (o && pub.status !== 'pending') {
        Object.assign(o, { status: pub.status, paidAt: pub.paidAt, deliveredAt: pub.deliveredAt, claimedAt: pub.claimedAt });
        saveOrders();
        if (view === 'pay') location.replace('#/pesanan/' + id);
        return;
      }
      if (btn) toast('Pembayaran belum masuk. Selesaikan pembayaran dulu ya — status dicek otomatis.', 'info');
    } catch (e) {
      if (btn) toast(e.message, 'error');
    }
    if (btn) { btn.classList.remove('loading'); btn.innerHTML = html; }
  }

  async function claimPaid(btn) {
    const o = orders[btn.dataset.id];
    if (!o) return;
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Mengirim konfirmasi…';
    try {
      const pub = await ORDERS.claim(o.id, o.token);
      Object.assign(o, { status: pub.status, claimedAt: pub.claimedAt });
      saveOrders();
      location.replace('#/pesanan/' + o.id);
    } catch (e) {
      toast(e.message, 'error');
      btn.classList.remove('loading');
      btn.innerHTML = `${icon('check', 18)} Saya sudah bayar ${rp(o.total)}`;
    }
  }

  VIEWS.pay = function (id) {
    const o = orders[id];
    if (!o) return notFoundHTML(id);
    document.title = 'Pembayaran — Wak Prem';
    if (o.mode === 'manual') return payManualHTML(o);
    if (o.mode === 'kriskris') return payAutoHTML(o);
    const m = CAT.findMethod(o.method) || CAT.PAYMENT_METHODS[0];
    const isVA = m.group === 'va';
    return `
    <section class="page"><div class="container pay-wrap">
      <div class="page-head">
        <div><a class="back-link" href="#/pesanan/${esc(o.id)}">${icon('arrow-left', 18)} Detail pesanan</a><h1>Selesaikan pembayaran</h1></div>
        ${progress(2)}
      </div>
      <div class="demo-banner">${icon('info', 20)}<div>
        <strong>Mode demo</strong>Pembayaran di halaman ini hanya simulasi — tidak ada uang yang ditarik. Aktifkan Midtrans di <code>config.js</code> untuk menerima pembayaran asli.
        <br><button class="btn btn-sm btn-outline" data-action="simulate-pay" data-id="${esc(o.id)}">${icon('zap', 16)} Simulasikan pembayaran berhasil</button>
      </div></div>
      <div class="panel">
        <div class="pay-head">
          <div><div class="label">Total pembayaran</div>
            <div class="pay-amount">${rp(o.total)}<button class="copy-btn" data-action="copy" data-copy="${o.total}" aria-label="Salin nominal">${icon('copy', 16)}</button></div>
          </div>
          <div class="timer" id="timer" aria-label="Sisa waktu pembayaran">${icon('clock', 16)}<span>--:--</span></div>
        </div>
        <div class="pay-method-row"><span class="pay-logo" style="--c:${m.color}">${m.short}</span><span>${esc(m.name)}</span><span class="muted">· ${esc(o.id)}</span></div>
        ${isVA ? `
        <div class="va-block">
          <div class="va-label">Nomor Virtual Account</div>
          <div class="va-box"><span class="va-num">${formatVA(o.va)}</span><button class="btn btn-sm btn-outline" data-action="copy" data-copy="${esc(o.va)}">${icon('copy', 16)} Salin</button></div>
          <p class="hint" style="margin-top:10px">Bayar sebelum ${fmtTime(o.expiresAt)}. Nominal harus sama persis.</p>
        </div>` : `
        <div class="qr-frame">
          <div class="qr-label">${icon('qr', 16)} Scan pakai ${m.group === 'qris' ? 'e-wallet / m-banking apa saja' : 'aplikasi ' + esc(m.name)}</div>
          <div class="qr-box">${qrSVG(`WAKPREM-DEMO|${o.id}|${o.total}`)}</div>
          <div class="qr-actions"><button class="btn btn-sm btn-ghost" data-action="download-qr" data-id="${esc(o.id)}">${icon('download', 16)} Simpan QR</button></div>
        </div>`}
        <div class="pay-actions">
          <button class="btn btn-primary btn-lg btn-block" data-action="check-status" data-id="${esc(o.id)}">${icon('refresh', 18)} Saya sudah bayar, cek status</button>
        </div>
      </div>
      <div class="panel" style="margin-top:16px">
        <div class="panel-title">Cara bayar</div>
        <ol class="howto">${howtoSteps(m).map((s) => `<li><span>${s}</span></li>`).join('')}</ol>
      </div>
    </div></section>`;
  };

  AFTER.pay = function (id) {
    const o = orders[id];
    if (!o) return;
    const wrap = $('#timer');
    const label = $('#timer span');
    const tick = () => {
      const left = o.expiresAt - Date.now();
      if (left <= 0) {
        clearInterval(timerId);
        o.status = 'expired';
        saveOrders();
        location.replace('#/pesanan/' + o.id);
        return;
      }
      label.textContent = `${pad(Math.floor(left / 60000))}:${pad(Math.floor((left % 60000) / 1000))}`;
      wrap.classList.toggle('urgent', left < 60000);
      if (o.mode === 'kriskris' && ++ticks % Math.max(1, Math.round(ORDERS.pollMs / 1000)) === 0) pollAuto(id);
    };
    let ticks = 0;
    tick();
    timerId = setInterval(tick, 1000);
  };

  async function checkStatusDemo(btn) {
    const html = btn.innerHTML;
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Mengecek pembayaran…';
    await sleep(1200);
    btn.classList.remove('loading');
    btn.innerHTML = html;
    const o = orders[btn.dataset.id];
    if (o && o.status === 'paid') location.replace('#/pesanan/' + o.id);
    else toast('Pembayaran belum masuk. Selesaikan pembayaran dulu ya.', 'info');
  }

  function markPaid(id) {
    const o = orders[id];
    if (!o) return;
    o.status = 'paid';
    o.paidAt = o.paidAt || Date.now();
    saveOrders();
    if (view === 'order' && parseRoute().param === id) renderView('order', id, true);
    else location.replace('#/pesanan/' + id);
  }

  function downloadQR(id) {
    const svg = $('.qr-box svg');
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const size = 720, gap = 56;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, gap, gap, size - gap * 2, size - gap * 2);
      const a = document.createElement('a');
      a.download = `QRIS-${id}.png`;
      a.href = c.toDataURL('image/png');
      a.click();
      toast('QR disimpan');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  }

  /* =====================================================
     ORDER DETAIL
     ===================================================== */
  function notFoundHTML(id) {
    return `<section class="page"><div class="container">${emptyState({
      ic: 'receipt',
      title: 'Pesanan tidak ditemukan',
      text: `ID ${esc(id || '')} tidak ada di perangkat ini. Pastikan ID pesanan sudah benar.`,
      action: `<a class="btn btn-primary" href="#/cek">Cek pesanan lain</a>`,
    })}</div></section>`;
  }

  function statusInfo(o) {
    const email = `<strong>${esc(o.buyer.email)}</strong>`;
    const check = `<svg class="draw" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
    switch (o.status) {
      case 'paid':
        return {
          tone: 'success',
          icon: check,
          title: o.mode === 'manual' ? 'Pembayaran dikonfirmasi!' : 'Pembayaran berhasil!',
          desc: `Makasih, ${esc(firstName(o.buyer.name))}! Pesananmu sedang diproses. Detail akun dikirim ke ${email} dalam 5–15 menit (jam operasional ${esc(CFG.operationalHours)}).`,
        };
      case 'delivered':
        return {
          tone: 'success',
          icon: icon('mail', 34),
          title: 'Akun sudah dikirim!',
          desc: `Detail akun sudah dikirim ke ${email}. Cek inbox dan folder Spam/Promosi ya. Ada kendala? Chat admin dengan ID pesanan ini.`,
        };
      case 'review':
        return {
          tone: 'warning',
          icon: `<span class="spinner" style="width:30px;height:30px;border-width:3px"></span>`,
          title: 'Pembayaran sedang dicek',
          desc: `Admin sedang mencocokkan pembayaran <strong>${rp(o.total)}</strong>. Biasanya selesai dalam 5–15 menit (jam operasional ${esc(CFG.operationalHours)}). Halaman ini ter-update otomatis.`,
        };
      case 'cancelled':
        return {
          tone: 'danger', icon: icon('x', 34),
          title: 'Pesanan dibatalkan',
          desc: 'Pesanan ini dibatalkan admin. Kalau kamu sudah transfer, chat admin dengan ID pesanan ini supaya dibantu.',
          action: `<button class="btn btn-primary btn-lg" data-action="open-chat" data-live="Halo admin, pesanan ${esc(o.id)} dibatalkan, padahal saya sudah bayar">${icon('message', 18)} Chat admin</button>`,
        };
      case 'expired':
        return {
          tone: 'danger', icon: icon('clock', 34),
          title: 'Waktu pembayaran habis',
          desc: isQris(o)
            ? 'Pesanan ini otomatis dibatalkan. Sudah terlanjur bayar? Klik “Saya sudah bayar” supaya admin mengecek.'
            : 'Pesanan ini otomatis dibatalkan. Tenang, kamu bisa pesan ulang dengan sekali klik.',
          action: `<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            ${isQris(o) ? `<button class="btn btn-outline btn-lg" data-action="claim-paid" data-id="${esc(o.id)}">${icon('check', 18)} Saya sudah bayar</button>` : ''}
            <button class="btn btn-primary btn-lg" data-action="reorder" data-id="${esc(o.id)}">${icon('refresh', 18)} Pesan ulang</button></div>`,
        };
      case 'failed':
        return {
          tone: 'danger', icon: icon('x', 34),
          title: 'Pembayaran gagal',
          desc: 'Pembayaran dibatalkan atau ditolak. Silakan pesan ulang atau pilih metode lain.',
          action: `<button class="btn btn-primary btn-lg" data-action="reorder" data-id="${esc(o.id)}">${icon('refresh', 18)} Pesan ulang</button>`,
        };
      default:
        return {
          tone: 'warning', icon: icon('clock', 34),
          title: 'Menunggu pembayaran',
          desc: `Selesaikan pembayaran sebelum <strong>${fmtTime(o.expiresAt)}</strong> supaya pesanan langsung diproses.`,
          action: o.mode === 'demo' || isQris(o)
            ? `<a class="btn btn-primary btn-lg" href="#/bayar/${esc(o.id)}">${icon('wallet', 18)} Lanjut bayar</a>`
            : `<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn btn-primary btn-lg" data-action="snap-resume" data-id="${esc(o.id)}">${icon('wallet', 18)} Lanjutkan pembayaran</button><button class="btn btn-outline btn-lg" data-action="refresh-status" data-id="${esc(o.id)}">${icon('refresh', 18)} Cek status</button></div>`,
        };
    }
  }

  function statusPill(status) {
    const map = {
      paid: ['success', 'Lunas'], delivered: ['success', 'Akun terkirim'], review: ['warning', 'Dicek admin'],
      pending: ['warning', 'Menunggu bayar'], expired: ['danger', 'Kedaluwarsa'], failed: ['danger', 'Gagal'], cancelled: ['danger', 'Dibatalkan'],
    };
    const [tone, label] = map[status] || map.pending;
    return `<span class="status-pill tone-${tone}">${label}</span>`;
  }

  function timelineHTML(o) {
    if (o.mode === 'manual') return timelineManualHTML(o);
    if (o.mode === 'kriskris') return timelineAutoHTML(o);
    const m = CAT.findMethod(o.method);
    const paid = o.status === 'paid';
    const dead = o.status === 'expired' || o.status === 'failed';
    const steps = [
      { t: 'Pesanan dibuat', s: fmtDate(o.createdAt), st: 'done' },
      { t: 'Pembayaran', s: paid ? `Diterima ${fmtDate(o.paidAt)}${m ? ' via ' + esc(m.name) : ''}` : dead ? (o.status === 'expired' ? 'Kedaluwarsa' : 'Gagal') : 'Menunggu pembayaran', st: paid ? 'done' : dead ? 'fail' : 'current' },
      { t: 'Diproses admin', s: paid ? 'Akun sedang disiapkan' : 'Setelah pembayaran diterima', st: paid ? 'current' : '' },
      { t: 'Akun dikirim ke email', s: paid ? `Cek inbox / folder spam ${esc(o.buyer.email)}` : '—', st: '' },
    ];
    const ic = { done: icon('check', 16), current: icon('clock', 16), fail: icon('x', 16) };
    return `<ol class="timeline">${steps.map((s, i) => `
      <li class="tl-item ${s.st}"><span class="tl-dot">${ic[s.st] || `<small style="font-weight:800">${i + 1}</small>`}</span><div><strong>${s.t}</strong><span>${s.s}</span></div></li>`).join('')}</ol>`;
  }

  function timelineManualHTML(o) {
    const s = o.status;
    const claimed = ['review', 'paid', 'delivered'].includes(s);
    const paid = ['paid', 'delivered'].includes(s);
    const dead = ['expired', 'cancelled'].includes(s);
    const steps = [
      { t: 'Pesanan dibuat', s: fmtDate(o.createdAt), st: 'done' },
      { t: 'Pembayaran QRIS', s: claimed ? `Kamu konfirmasi sudah bayar ${rp(o.total)}${o.claimedAt ? ' · ' + fmtTime(o.claimedAt) : ''}` : dead ? (s === 'expired' ? 'Kedaluwarsa' : 'Dibatalkan') : `Bayar persis ${rp(o.total)}`, st: claimed ? 'done' : dead ? 'fail' : 'current' },
      { t: 'Dicek & dikonfirmasi admin', s: paid ? `Lunas · ${fmtDate(o.paidAt)}` : s === 'review' ? 'Admin sedang mencocokkan pembayaran' : 'Setelah kamu klik “Saya sudah bayar”', st: paid ? 'done' : s === 'review' ? 'current' : '' },
      { t: 'Akun dikirim ke email', s: s === 'delivered' ? `Terkirim · cek inbox / spam ${esc(o.buyer.email)}` : s === 'paid' ? 'Akun sedang disiapkan' : '—', st: s === 'delivered' ? 'done' : s === 'paid' ? 'current' : '' },
    ];
    const ic = { done: icon('check', 16), current: icon('clock', 16), fail: icon('x', 16) };
    return `<ol class="timeline">${steps.map((x, i) => `
      <li class="tl-item ${x.st}"><span class="tl-dot">${ic[x.st] || `<small style="font-weight:800">${i + 1}</small>`}</span><div><strong>${x.t}</strong><span>${x.s}</span></div></li>`).join('')}</ol>`;
  }

  function timelineAutoHTML(o) {
    const s = o.status;
    const paid = ['paid', 'delivered'].includes(s);
    const dead = ['expired', 'cancelled'].includes(s);
    const steps = [
      { t: 'Pesanan dibuat', s: fmtDate(o.createdAt), st: 'done' },
      { t: 'Pembayaran QRIS', s: paid ? `Diterima otomatis · ${fmtDate(o.paidAt)}` : s === 'review' ? 'Dibayar setelah batas waktu — sedang dicek admin' : dead ? (s === 'expired' ? 'Kedaluwarsa' : 'Dibatalkan') : `Bayar ${rp(o.total)} sebelum ${fmtTime(o.expiresAt)}`, st: paid ? 'done' : dead ? 'fail' : 'current' },
      { t: 'Akun disiapkan admin', s: s === 'delivered' ? 'Selesai' : s === 'paid' ? 'Sedang diproses' : 'Setelah pembayaran diterima', st: s === 'delivered' ? 'done' : s === 'paid' ? 'current' : '' },
      { t: 'Akun dikirim ke email', s: s === 'delivered' ? `Terkirim · cek inbox / spam ${esc(o.buyer.email)}` : '—', st: s === 'delivered' ? 'done' : '' },
    ];
    const ic = { done: icon('check', 16), current: icon('clock', 16), fail: icon('x', 16) };
    return `<ol class="timeline">${steps.map((x, i) => `
      <li class="tl-item ${x.st}"><span class="tl-dot">${ic[x.st] || `<small style="font-weight:800">${i + 1}</small>`}</span><div><strong>${x.t}</strong><span>${x.s}</span></div></li>`).join('')}</ol>`;
  }

  VIEWS.order = function (id) {
    const o = orders[id];
    if (!o) {
      if (DEMO) return notFoundHTML(id);
      return `<section class="page"><div class="container narrow"><div class="panel status-hero tone-warning" id="remoteOrder">
        <div class="status-icon"><span class="spinner" style="width:30px;height:30px"></span></div><h1>Memuat pesanan…</h1><p>${esc(id)}</p></div></div></section>`;
    }
    refreshExpiry(o);
    document.title = `Pesanan ${o.id} — Wak Prem`;
    const m = CAT.findMethod(o.method);
    const S = statusInfo(o);

    return `
    <section class="page"><div class="container">
      <div class="page-head no-print">
        <div><a class="back-link" href="#/">${icon('arrow-left', 18)} Beranda</a><h1>Detail pesanan</h1></div>
        ${progress(['paid', 'delivered'].includes(o.status) ? 4 : 2)}
      </div>
      <div class="panel status-hero tone-${S.tone}">
        <div class="status-icon">${S.icon}</div>
        <h1>${S.title}</h1>
        <p>${S.desc}</p>
        ${S.action || ''}
      </div>
      <div class="order-grid">
        <div class="stack">
          <div class="panel"><div class="panel-title">Status pesanan</div>${timelineHTML(o)}</div>
          <div class="panel">
            <div class="panel-title">Produk dibeli</div>
            <ul class="sum-items">${o.lines.map((l) => {
              const p = CAT.findProduct(l.productId) || { colors: ['#888', '#555'], icon: 'package' };
              return `<li class="sum-item">${pIcon(p, 'xs')}<div class="meta"><strong>${esc(l.name)}</strong><span>${esc(l.variantLabel)}${l.qty > 1 ? ` · ${l.qty}x` : ''}${l.targetEmail ? ` · ${esc(l.targetEmail)}` : ''}</span></div><span class="price">${rp(l.total)}</span></li>`;
            }).join('')}</ul>
            <div class="sum-rows">
              <div class="sum-row"><span>Subtotal</span><strong>${rp(o.subtotal)}</strong></div>
              ${o.discount ? `<div class="sum-row discount"><span>Diskon · ${esc(o.voucher ? o.voucher.code : '')}</span><strong>−${rp(o.discount)}</strong></div>` : ''}
              <div class="sum-row"><span>Biaya layanan</span><strong>${o.fee ? rp(o.fee) : 'Gratis'}</strong></div>
              ${o.uniqueCode ? `<div class="sum-row"><span>Kode unik</span><strong>+${rp(o.uniqueCode)}</strong></div>` : ''}
            </div>
            <div class="sum-total"><span>Total</span><span class="amount">${o.uniqueCode ? rpCode(o.total, codeDigits(o)) : rp(o.total)}</span></div>
          </div>
        </div>
        <div class="stack">
          <div class="panel">
            <div class="panel-title">Info pesanan</div>
            <div class="info-list">
              <div class="info-row"><span>ID pesanan</span><strong>${esc(o.id)} <button class="copy-btn no-print" data-action="copy" data-copy="${esc(o.id)}" aria-label="Salin ID pesanan">${icon('copy', 14)}</button></strong></div>
              <div class="info-row"><span>Status</span><strong>${statusPill(o.status)}</strong></div>
              <div class="info-row"><span>Tanggal</span><strong>${fmtDate(o.createdAt)}</strong></div>
              <div class="info-row"><span>Metode</span><strong>${m ? esc(m.name) : '-'}</strong></div>
              <div class="info-row"><span>Nama</span><strong>${esc(o.buyer.name)}</strong></div>
              <div class="info-row"><span>Email</span><strong>${esc(o.buyer.email)}</strong></div>
              ${o.buyer.phone ? `<div class="info-row"><span>WhatsApp</span><strong>+${esc(o.buyer.phone)}</strong></div>` : ''}
            </div>
          </div>
          <div class="help-card no-print" style="margin-top:16px">
            <h3>Butuh bantuan?</h3>
            <p>Sertakan ID pesanan saat menghubungi CS supaya cepat dibantu.</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-outline btn-sm" data-action="open-chat" data-live="Halo admin, saya mau tanya pesanan ${esc(o.id)}">${icon('message', 16)} Chat admin</button>
              <button class="btn btn-ghost btn-sm" data-action="print">${icon('printer', 16)} Simpan bukti</button>
            </div>
          </div>
        </div>
      </div>
    </div></section>`;
  };

  AFTER.order = function (id) {
    const o = orders[id];
    if (o && ['paid', 'delivered'].includes(o.status) && !o.celebrated) {
      o.celebrated = true;
      saveOrders();
      setTimeout(confetti, 250);
    }
    if (QRIS_ONLY || (o && isQris(o))) {
      if (!o || !['delivered', 'cancelled'].includes(o.status)) {
        refreshManual(id);
        timerId = setInterval(() => refreshManual(id), ORDERS.pollMs * 2);
      }
      return;
    }
    if (!DEMO && (!o || o.status === 'pending')) {
      refreshRemote(id);
      timerId = setInterval(() => refreshRemote(id), 8000);
    }
  };

  async function refreshRemote(id, manual) {
    try {
      const data = await Midtrans.status(id);
      const o = orders[id];
      if (o) {
        if (data.status && data.status !== o.status) {
          o.status = data.status;
          if (data.status === 'paid') o.paidAt = o.paidAt || Date.now();
          saveOrders();
          if (view === 'order' && parseRoute().param === id) renderView('order', id, true);
        } else if (manual) toast(o.status === 'pending' ? 'Pembayaran belum masuk' : 'Status sudah terbaru', 'info');
      } else {
        const box = $('#remoteOrder');
        if (box) {
          const tone = data.status === 'paid' ? 'success' : data.status === 'pending' ? 'warning' : 'danger';
          box.className = `panel status-hero tone-${tone}`;
          box.innerHTML = `<div class="status-icon">${icon(tone === 'success' ? 'check' : tone === 'warning' ? 'clock' : 'x', 34)}</div>
            <h1>${esc(id)}</h1><p>Status: ${statusPill(data.status)}${data.grossAmount ? ` · Total ${rp(data.grossAmount)}` : ''}</p>
            <button class="btn btn-outline" data-action="open-chat" data-live="Halo admin, saya mau tanya pesanan ${esc(id)}">${icon('message', 18)} Chat admin</button>`;
          clearInterval(timerId);
        }
      }
    } catch (e) {
      if (manual) toast(e.message, 'error');
      const box = $('#remoteOrder');
      if (box && !orders[id]) { box.innerHTML = notFoundHTML(id); clearInterval(timerId); }
    }
  }

  /** Ambil status terbaru pesanan QRIS manual (dikonfirmasi admin) dari server / penyimpanan demo. */
  async function refreshManual(id) {
    try {
      const pub = await ORDERS.get(id);
      const o = orders[id];
      if (o) {
        const changed = pub.status !== o.status;
        Object.assign(o, { status: pub.status, paidAt: pub.paidAt, deliveredAt: pub.deliveredAt, claimedAt: pub.claimedAt });
        saveOrders();
        if (changed && view === 'order' && parseRoute().param === id) renderView('order', id, true);
        if (['delivered', 'cancelled'].includes(pub.status)) clearInterval(timerId);
      } else {
        const box = $('#remoteOrder');
        if (!box) return;
        const tone = ['paid', 'delivered'].includes(pub.status) ? 'success' : ['pending', 'review'].includes(pub.status) ? 'warning' : 'danger';
        box.className = `panel status-hero tone-${tone}`;
        box.innerHTML = `<div class="status-icon">${icon(tone === 'success' ? 'check' : tone === 'warning' ? 'clock' : 'x', 34)}</div>
          <h1>${esc(pub.id)}</h1><p>${esc(pub.lines.map((l) => l.name).join(', '))}<br>Status: ${statusPill(pub.status)} · Total ${rp(pub.total)}</p>
          <button class="btn btn-outline" data-action="open-chat" data-live="Halo admin, saya mau tanya pesanan ${esc(pub.id)}">${icon('message', 18)} Chat admin</button>`;
      }
    } catch (e) {
      const box = $('#remoteOrder');
      if (box && !orders[id]) { box.outerHTML = notFoundHTML(id); clearInterval(timerId); }
    }
  }

  function reorder(id) {
    const o = orders[id];
    if (!o) return;
    o.lines.forEach((l) => {
      const p = CAT.findProduct(l.productId);
      const v = CAT.findVariant(p, l.variantId);
      if (!p || !v || p.comingSoon) return;
      if (v.needsEmail) cart.push({ key: `${p.id}|${v.id}|${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, productId: p.id, variantId: v.id, qty: 1, targetEmail: l.targetEmail || '' });
      else {
        const key = `${p.id}|${v.id}`;
        const ex = cart.find((i) => i.key === key);
        if (ex) ex.qty = Math.min(CAT.MAX_QTY, ex.qty + l.qty);
        else cart.push({ key, productId: p.id, variantId: v.id, qty: l.qty });
      }
    });
    saveCart(true);
    location.hash = '#/checkout';
  }

  /* =====================================================
     TRACK
     ===================================================== */
  VIEWS.track = function () {
    document.title = 'Cek Pesanan — Wak Prem';
    const list = Object.values(orders).sort((a, b) => b.createdAt - a.createdAt);
    return `
    <section class="page"><div class="container narrow">
      <a class="back-link" href="#/">${icon('arrow-left', 18)} Beranda</a>
      <div class="page-head" style="margin-bottom:6px"><h1>Cek pesanan</h1></div>
      <p class="muted">Masukkan ID pesanan yang ada di bukti pembayaran atau email kamu.</p>
      <form class="track-form" data-form="track">
        <div class="input-wrap">${icon('search', 18)}<input class="input" name="id" placeholder="Contoh: WP-261102-AB12C" autocomplete="off" aria-label="ID pesanan" required></div>
        <button class="btn btn-primary btn-lg" type="submit">Cek status</button>
      </form>
      <div class="panel-title">Pesanan di perangkat ini <span class="sub">${list.length}</span></div>
      ${list.length
        ? `<ul class="order-rows">${list.map((o) => {
            refreshExpiry(o);
            const p = CAT.findProduct(o.lines[0] && o.lines[0].productId) || { colors: ['#888', '#555'], icon: 'package' };
            const more = o.lines.length > 1 ? ` +${o.lines.length - 1} lainnya` : '';
            return `<li><a class="order-row" href="#/pesanan/${esc(o.id)}">${pIcon(p, 'sm')}
              <div class="meta"><strong>${esc(o.lines[0] ? o.lines[0].name : 'Pesanan')}${more}</strong><span>${esc(o.id)} · ${fmtDate(o.createdAt)}</span></div>
              <div class="right"><strong>${rp(o.total)}</strong>${statusPill(o.status)}</div></a></li>`;
          }).join('')}</ul>`
        : `<div class="panel">${emptyState({ ic: 'receipt', title: 'Belum ada pesanan', text: 'Pesanan yang kamu buat di perangkat ini akan muncul di sini.', action: `<button class="btn btn-primary" data-action="scroll" data-target="katalog">Mulai belanja</button>` })}</div>`}
    </div></section>`;
  };

  /* =====================================================
     Midtrans (mode 'midtrans')
     ===================================================== */
  const apiUrl = (path) => (PAY.apiBase || '/api') + path;
  const Midtrans = {
    load() {
      return new Promise((resolve, reject) => {
        if (window.snap) return resolve();
        if (!PAY.midtransClientKey) return reject(new Error('Client key Midtrans belum diisi di config.js'));
        const s = document.createElement('script');
        s.src = PAY.midtransProduction ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js';
        s.setAttribute('data-client-key', PAY.midtransClientKey);
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Gagal memuat Midtrans, cek koneksi kamu'));
        document.head.appendChild(s);
      });
    },
    async create(payload) {
      const res = await fetch(apiUrl('/create-transaction'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal membuat transaksi');
      return data;
    },
    async status(id) {
      const res = await fetch(apiUrl('/order-status?id=' + encodeURIComponent(id)));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal cek status pesanan');
      return data;
    },
    async pay(o) {
      try { await this.load(); } catch (e) { toast(e.message, 'error'); return; }
      window.snap.pay(o.snapToken, {
        onSuccess: () => markPaid(o.id),
        onPending: () => refreshRemote(o.id),
        onError: () => toast('Pembayaran gagal, coba lagi ya', 'error'),
        onClose: () => toast('Pembayaran belum selesai. Kamu bisa lanjutkan kapan saja.', 'info'),
      });
    },
  };

  /* =====================================================
     Toast, copy, confetti, theme, menu
     ===================================================== */
  function toast(msg, type = 'success', action) {
    const wrap = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = `<span class="t-ic">${icon(type === 'error' ? 'x' : type === 'info' ? 'info' : 'check', 13)}</span><span>${esc(msg)}</span>`;
    if (action) {
      const b = document.createElement('button');
      b.className = 'btn btn-sm btn-accent';
      b.style.marginLeft = '6px';
      b.textContent = action.label;
      b.onclick = () => { action.run(); el.remove(); };
      el.appendChild(b);
    }
    wrap.appendChild(el);
    while (wrap.children.length > 3) wrap.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, action ? 4200 : 2800);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('Disalin: ' + text);
  }

  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = $('#confetti');
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth, H = window.innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    ctx.scale(dpr, dpr);
    const colors = ['#5B3DF5', '#C8F04A', '#FF6A88', '#3B82F6', '#FFB020', '#12A150'];
    const parts = Array.from({ length: 150 }, (_, i) => ({
      x: W / 2 + (Math.random() - 0.5) * 160, y: H * 0.32,
      vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 5,
      w: 6 + Math.random() * 6, h: 9 + Math.random() * 8,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35, c: colors[i % colors.length],
    }));
    const start = performance.now();
    const DUR = 2800;
    (function frame(now) {
      const el = now - start;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = Math.max(0, 1 - el / DUR);
      for (const p of parts) {
        p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      }
      if (el < DUR) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    })(start);
  }

  const rootEl = document.documentElement;
  function currentTheme() { return rootEl.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
  function updateThemeIcon() {
    const dark = currentTheme() === 'dark';
    $('#themeBtn').innerHTML = icon(dark ? 'sun' : 'moon', 19);
    $('meta[name=theme-color]').setAttribute('content', dark ? '#0C0A13' : '#F6F5FB');
  }
  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    rootEl.dataset.theme = next;
    store.set('theme', next);
    updateThemeIcon();
  }

  function toggleMenu(force) {
    const m = $('#mobileMenu');
    const open = force !== undefined ? force : m.hidden;
    m.hidden = !open;
    $('.menu-btn').setAttribute('aria-expanded', String(open));
    $('.menu-btn').innerHTML = icon(open ? 'x' : 'menu', 20);
  }
  const closeMenu = () => { if (!$('#mobileMenu').hidden) toggleMenu(false); };

  async function shareProduct() {
    const p = sheet.product;
    const url = location.origin + location.pathname + '#/produk/' + p.id;
    if (navigator.share) {
      try { await navigator.share({ title: `${p.name} — Wak Prem`, text: `${p.name} mulai ${rp(cheapest(p).price)} di Wak Prem`, url }); } catch (e) { /* dibatalkan */ }
    } else copyText(url);
  }

  /* Reveal on scroll */
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' })
    : null;
  function observeReveal(root) {
    $$('.reveal', root).forEach((el) => (io ? io.observe(el) : el.classList.add('in')));
  }

  /* =====================================================
     Events
     ===================================================== */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const a = t.dataset.action;
    switch (a) {
      case 'scroll':
        e.preventDefault();
        closeMenu();
        if (isOpen('cart')) closeSheet('cart');
        if (isOpen('product')) { sheetPushed = false; history.replaceState(null, '', '#/'); lastRoute = 'home'; closeSheet('product'); }
        scrollToSection(t.dataset.target);
        break;
      case 'open-product': location.hash = '#/produk/' + t.dataset.id; break;
      case 'close-product': requestCloseProduct(); break;
      case 'share': shareProduct(); break;
      case 'ps-inc': sheet.qty = Math.min(CAT.MAX_QTY, sheet.qty + 1); refreshPsFoot(); break;
      case 'ps-dec': sheet.qty = Math.max(1, sheet.qty - 1); refreshPsFoot(); break;
      case 'add-cart':
        addToCart(sheet.product, sheet.variant, sheet.qty);
        requestCloseProduct();
        toast(`${sheet.product.name} masuk keranjang`, 'success', { label: 'Lihat', run: () => { renderCart(); openSheet('cart'); } });
        break;
      case 'buy-now':
        addToCart(sheet.product, sheet.variant, sheet.qty);
        if (sheetPushed) { sheetPushed = false; location.replace('#/checkout'); } else location.hash = '#/checkout';
        break;
      case 'open-cart': closeMenu(); renderCart(); openSheet('cart'); break;
      case 'close-cart': closeSheet('cart'); break;
      case 'close-sheets': closeAllSheets(); break;
      case 'inc': changeQty(t.dataset.key, 1); break;
      case 'dec': changeQty(t.dataset.key, -1); break;
      case 'remove': removeItem(t.dataset.key); break;
      case 'filter': filter = t.dataset.cat; renderGrid(); break;
      case 'clear-search': query = ''; renderGrid(); break;
      case 'theme': toggleTheme(); break;
      case 'menu': toggleMenu(); break;
      case 'copy': copyText(t.dataset.copy); break;
      case 'apply-voucher': applyVoucher(); break;
      case 'fill-voucher': { const i = $('#voucherInput'); if (i) i.value = t.dataset.code; applyVoucher(); break; }
      case 'remove-voucher': draft.voucher = ''; voucherAttempt = ''; voucherMsg = ''; saveDraft(); updateSummary(); break;
      case 'same-email': {
        const inp = document.getElementById(t.dataset.target);
        if (!draft.email.trim()) { toast('Isi email pembeli dulu ya', 'info'); $('#f-email').focus(); break; }
        inp.value = draft.email.trim();
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        validateField(inp, true);
        break;
      }
      case 'check-status': checkStatusDemo(t); break;
      case 'claim-paid': claimPaid(t); break;
      case 'check-auto': pollAuto(t.dataset.id, t); break;
      case 'simulate-pay': markPaid(t.dataset.id); break;
      case 'download-qr': downloadQR(t.dataset.id); break;
      case 'snap-resume': { const o = orders[t.dataset.id]; if (o) Midtrans.pay(o); break; }
      case 'refresh-status': refreshRemote(t.dataset.id, true); break;
      case 'reorder': reorder(t.dataset.id); break;
      case 'print': window.print(); break;
    }
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'catalogSearch') { query = t.value; renderGrid(); return; }
    if (!t.form || t.form.id !== 'checkoutForm' || !t.name) return;
    if (t.name === 'name' || t.name === 'email' || t.name === 'phone') {
      draft[t.name] = t.value;
      saveDraft();
      validateField(t, false);
    } else if (t.name.startsWith('target-')) {
      const it = cart.find((i) => i.key === t.dataset.key);
      if (it) { it.targetEmail = t.value.trim(); saveCart(true); }
      validateField(t, false);
    } else if (t.id === 'voucherInput') {
      if (voucherMsg) { voucherMsg = ''; const m = $('.voucher-msg'); if (m) m.remove(); }
    }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'variant' && t.closest('#productSheet')) {
      sheet.variant = CAT.findVariant(sheet.product, t.value);
      if (sheet.variant.needsEmail) sheet.qty = 1;
      refreshPsFoot();
    } else if (t.name === 'method') {
      draft.method = t.value;
      saveDraft();
      updateSummary();
    } else if (t.name === 'agree') {
      draft.agree = t.checked;
      saveDraft();
      t.closest('.agree').classList.remove('invalid');
    }
  });

  document.addEventListener('focusout', (e) => {
    const t = e.target;
    if (t.form && t.form.id === 'checkoutForm' && t.classList.contains('input') && t.id !== 'voucherInput' && t.value.trim()) validateField(t, true);
  });

  document.addEventListener('submit', (e) => {
    const f = e.target;
    if (f.id === 'checkoutForm') {
      e.preventDefault();
      submitCheckout(f);
    } else if (f.dataset.form === 'hero-search') {
      e.preventDefault();
      query = f.q.value;
      filter = 'all';
      const s = $('#catalogSearch');
      if (s) s.value = query;
      renderGrid();
      scrollToSection('katalog');
    } else if (f.dataset.form === 'track') {
      e.preventDefault();
      const id = f.id.value.trim().toUpperCase();
      if (!id) return;
      if (orders[id] || !DEMO) location.hash = '#/pesanan/' + encodeURIComponent(id);
      else { toast('Pesanan tidak ditemukan di perangkat ini', 'error'); shake(f); }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (anyOpen()) closeAllSheets();
      else closeMenu();
    } else if (e.key === 'Enter' && e.target.id === 'voucherInput') {
      e.preventDefault();
      applyVoucher();
    }
  });

  window.addEventListener('scroll', () => {
    $('#header').classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });

  window.addEventListener('storage', (e) => {
    if (e.key === 'wakprem:cart') { cart = store.get('cart', []); updateBadge(); }
    if (e.key === 'wakprem:orders') orders = store.get('orders', {});
  });

  /** Dipakai oleh chat.js (widget chat CS). */
  window.WAKPREM_UI = {
    icon, esc, rp, pIcon, statusPill, copyText, toast,
    methods: METHODS,
    manualPayment: MANUAL,
    autoPayment: AUTO,
    view: () => view,
    orders: () => orders,
  };

  /* =====================================================
     Init
     ===================================================== */
  function init() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    $$('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size) || 20); });
    $$('.sheet').forEach((s) => { s.hidden = false; s.setAttribute('inert', ''); });
    updateThemeIcon();
    updateBadge();
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeIcon);

    $('#year').textContent = new Date().getFullYear();
    $('#footerProducts').innerHTML = liveProducts().map((p) => `<li><a href="#/produk/${p.id}">${esc(p.name)}</a></li>`).join('');
    $('#footerPay').innerHTML = (QRIS_ONLY ? QRIS_APPS : METHODS).map((m) => `<span class="pay-logo" style="--c:${m.color}">${m.short}</span>`).join('');

    window.addEventListener('hashchange', router);
    router();
  }

  init();
})();
