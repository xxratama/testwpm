/**
 * WAK PREM — Inbox CS (admin.html)
 * Admin melihat & membalas live chat pengunjung website.
 * Template balasan cepat bisa diubah di QUICK_REPLIES.
 */
(function () {
  'use strict';

  const CFG = window.WAKPREM_CONFIG || {};
  const LIVE = window.WAKPREM_LIVE;
  const DEMO = LIVE.mode === 'demo';

  const QUICK_REPLIES = [
    'Halo kak 👋 Ada yang bisa dibantu?',
    'Boleh minta ID pesanannya kak?',
    'Baik kak, mohon ditunggu sebentar ya, sedang kami cek 🙏',
    'Akun sudah kami kirim ke email ya kak, cek juga folder spam 📩',
    'Terima kasih sudah belanja di Wak Prem 🙌',
  ];

  /* ---------- Utils ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('wakprem:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { if (v == null) localStorage.removeItem('wakprem:' + k); else localStorage.setItem('wakprem:' + k, JSON.stringify(v)); } catch (e) { /* diblokir */ } },
  };
  const ICONS = {
    message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    send: '<path d="M14.54 21.69a.5.5 0 0 0 .94-.03l6.5-19a.5.5 0 0 0-.64-.64l-19 6.5a.5.5 0 0 0-.03.94l7.93 3.18a2 2 0 0 1 1.11 1.11z"/><path d="m21.85 2.15-10.94 10.94"/>',
    search: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.3-4.3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    crown: '<path d="M3.5 8.5 8 12l4-6.5 4 6.5 4.5-3.5L19 18H5z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/>',
    user: '<circle cx="12" cy="8" r="4.5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  };
  const icon = (n, s = 20) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const hue = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const avatar = (c, cls = '') => `<span class="ad-av ${cls}" style="--h:${hue(c.name + c.id)}">${esc(initials(c.name))}</span>`;
  const isToday = (ts) => new Date(ts).toDateString() === new Date().toDateString();
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const fmtShort = (ts) => (isToday(ts) ? fmtTime(ts) : new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
  const fmtFull = (ts) => new Date(ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  function contactLink(c) {
    const v = String(c || '').trim();
    if (!v) return '';
    if (/@/.test(v)) return `<a href="mailto:${esc(v)}">${esc(v)}</a>`;
    let d = v.replace(/\D/g, '');
    if (d.length >= 9) {
      if (d.startsWith('0')) d = '62' + d.slice(1);
      return `<a href="https://wa.me/${d}" target="_blank" rel="noopener">${esc(v)} ${icon('external', 12)}</a>`;
    }
    return esc(v);
  }

  function toast(msg, type = 'success') {
    const wrap = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = `<span class="t-ic">${icon(type === 'error' ? 'info' : 'check', 13)}</span><span>${esc(msg)}</span>`;
    wrap.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2600);
  }

  /* ---------- State ---------- */
  let convs = [];
  let activeId = decodeURIComponent(location.hash.slice(1)) || null;
  let filter = 'open';
  let search = '';
  let threadId = null;
  let rendered = new Set();
  let lastSeen = {};
  let firstLoad = true;
  let timer = null;
  let audioCtx = null;
  let busy = false;
  let unreadChats = 0;

  // Pesanan (mode pembayaran 'kriskris' = QRIS otomatis, 'gopay-qris' = QRIS manual)
  const ORDERS = window.WAKPREM_ORDERS;
  const PAY_MODE = (CFG.payment || {}).mode;
  const AUTO_PAY = PAY_MODE === 'kriskris';
  const HAS_ORDERS = !!ORDERS && (PAY_MODE === 'gopay-qris' || AUTO_PAY);
  const REVIEW_FILTER = { id: 'review', label: AUTO_PAY ? 'Telat bayar' : 'Perlu dicek', match: ['review'] };
  const PAID_FILTER = { id: 'paid', label: AUTO_PAY ? 'Perlu dikirim' : 'Lunas', match: ['paid'] };
  // QRIS otomatis: pekerjaan utama admin = kirim akun untuk pesanan yang sudah lunas
  const ORDER_FILTERS = (AUTO_PAY ? [PAID_FILTER, REVIEW_FILTER] : [REVIEW_FILTER, PAID_FILTER]).concat([
    { id: 'pending', label: 'Belum bayar', match: ['pending'] },
    { id: 'delivered', label: 'Selesai', match: ['delivered'] },
    { id: 'closed', label: 'Batal', match: ['expired', 'cancelled'] },
  ]);
  /** Status yang butuh tindakan admin (dihitung di badge & dibunyikan saat masuk). */
  const NEEDS_ACTION = AUTO_PAY ? ['paid', 'review'] : ['review'];
  let section = store.get('adminSection', 'chat');
  let ordersData = [];
  let orderSeen = {};
  let ordersFirst = true;
  let reviewOrders = 0;
  let ordFilter = ORDER_FILTERS[0].id;
  let ordSearch = '';

  /* ---------- Login ---------- */
  function renderLogin(err) {
    clearInterval(timer);
    $('#admin').innerHTML = `
      <div class="ad-login">
        <form class="ad-login-card" id="loginForm">
          <span class="logo-mark big">${icon('crown', 26)}</span>
          <h1>Inbox CS</h1>
          <p>Masuk untuk membalas chat pelanggan Wak Prem.</p>
          <div class="input-wrap">${icon('lock', 18)}<input class="input" type="password" name="pw" placeholder="Password admin" autocomplete="current-password" required></div>
          ${err ? `<p class="ad-err">${esc(err)}</p>` : ''}
          <button class="btn btn-primary btn-lg btn-block" type="submit">Masuk</button>
        </form>
      </div>`;
    $('#loginForm input').focus();
  }

  async function login(pw) {
    const btn = $('#loginForm button');
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Memeriksa…';
    try {
      await LIVE.login(pw);
      store.set('adminKey', pw);
      startApp();
    } catch (e) {
      renderLogin(e.status === 401 ? 'Password salah' : e.message);
    }
  }

  function logout() {
    store.set('adminKey', null);
    renderLogin();
  }

  /* ---------- App shell ---------- */
  function setSection(s) {
    section = HAS_ORDERS ? s : 'chat';
    store.set('adminSection', section);
    $('#grid').hidden = section !== 'chat';
    const so = $('#secOrders');
    if (so) so.hidden = section !== 'orders';
    document.querySelectorAll('.ad-nav button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.s === section)));
    if (section === 'orders') history.replaceState(null, '', '#pesanan');
    else if (location.hash === '#pesanan') history.replaceState(null, '', activeId ? '#' + encodeURIComponent(activeId) : location.pathname);
  }

  function startApp() {
    $('#admin').innerHTML = `
      <header class="ad-top">
        <a class="logo" href="./" target="_blank" rel="noopener" title="Buka website"><span class="logo-mark">${icon('crown', 20)}</span><span>wak<b>prem</b></span></a>
        ${HAS_ORDERS ? `<nav class="ad-nav" role="tablist">
          <button role="tab" data-ad="section" data-s="chat">${icon('message', 16)} Chat <span class="ad-count" id="totalUnread" hidden></span></button>
          <button role="tab" data-ad="section" data-s="orders">${icon('receipt', 16)} Pesanan <span class="ad-count" id="reviewCount" hidden></span></button>
        </nav>` : '<span class="ad-title">Inbox CS <span class="ad-count" id="totalUnread" hidden></span></span>'}
        <span class="ad-conn" id="conn"><i></i><span>Terhubung</span></span>
        <div class="ad-actions">
          <button class="icon-btn" data-ad="notif" id="notifBtn" title="Aktifkan notifikasi" aria-label="Aktifkan notifikasi">${icon('bell', 19)}</button>
          <button class="icon-btn" data-ad="theme" id="themeBtn" aria-label="Ganti tema"></button>
          ${DEMO ? '' : `<button class="icon-btn" data-ad="logout" aria-label="Keluar" title="Keluar">${icon('logout', 19)}</button>`}
        </div>
      </header>
      ${DEMO ? `<div class="ad-demo">${icon('info', 18)}<span><b>Mode demo</b> — chat & pesanan hanya tersimpan di browser ini. Buka <a href="./" target="_blank" rel="noopener">website</a> di tab lain untuk mencoba: buat pesanan, atau klik <b>Tanya CS → Sambungkan ke admin</b>.</span></div>` : ''}
      ${HAS_ORDERS ? `<section class="ad-orders" id="secOrders" hidden>
        <div class="ord-head">
          <div class="ad-tabs ord-tabs" role="tablist">
            ${ORDER_FILTERS.map((f) => `<button role="tab" data-ad="ord-filter" data-f="${f.id}">${f.label} <span id="ordCnt-${f.id}"></span></button>`).join('')}
          </div>
          <label class="ad-search">${icon('search', 17)}<input id="ordSearch" type="search" placeholder="Cari ID, nama, email, atau nominal"></label>
        </div>
        <p class="ord-hint">${icon('info', 16)} ${AUTO_PAY
          ? 'Pembayaran QRIS terdeteksi <b>otomatis</b> lewat kriskris. Pesanan <b>Perlu dikirim</b> sudah lunas — kirim akunnya, lalu klik <b>Akun sudah dikirim</b>.'
          : 'Cocokkan <b>nominal persis</b> (3 digit terakhir = kode unik) dengan riwayat transaksi di aplikasi <b>GoPay Merchant</b>, lalu klik <b>Konfirmasi lunas</b>.'}</p>
        <div class="ord-list" id="ordList"></div>
      </section>` : ''}
      <div class="ad-grid" id="grid">
        <aside class="ad-list">
          <div class="ad-tabs" role="tablist">
            <button role="tab" data-ad="filter" data-f="open">Aktif <span id="cntOpen"></span></button>
            <button role="tab" data-ad="filter" data-f="closed">Selesai <span id="cntClosed"></span></button>
          </div>
          <label class="ad-search">${icon('search', 17)}<input id="adSearch" type="search" placeholder="Cari nama, kontak, atau pesan"></label>
          <ul class="ad-convs" id="convList"></ul>
        </aside>
        <section class="ad-thread" id="thread"></section>
      </div>`;
    updateThemeIcon();
    updateNotifBtn();
    renderThreadEmpty();
    setSection(location.hash === '#pesanan' ? 'orders' : section);
    refresh();
    clearInterval(timer);
    timer = setInterval(refresh, LIVE.pollMs);
  }

  function setConn(ok) {
    const c = $('#conn');
    if (!c) return;
    c.classList.toggle('off', !ok);
    $('span', c).textContent = ok ? 'Terhubung' : 'Koneksi terputus';
  }

  async function refresh() {
    if (busy) return;
    busy = true;
    try {
      convs = await LIVE.list();
      setConn(true);
      checkNew();
      renderList();
      if (activeId) await loadThread();
      if (HAS_ORDERS) await refreshOrders();
    } catch (e) {
      if (e.status === 401) { logout(); return; }
      setConn(false);
    } finally {
      busy = false;
    }
  }

  /* ---------- Notifikasi ---------- */
  function beep() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
      o.connect(g).connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 0.36);
    } catch (e) { /* audio diblokir */ }
  }

  function checkNew() {
    for (const c of convs) {
      const prev = lastSeen[c.id] || 0;
      if (!firstLoad && c.updatedAt > prev && c.last && c.last.from === 'visitor' && (document.hidden || c.id !== activeId)) {
        beep();
        if ('Notification' in window && Notification.permission === 'granted') {
          const n = new Notification(`💬 ${c.name}`, { body: c.last.text, tag: c.id });
          n.onclick = () => { window.focus(); select(c.id); n.close(); };
        }
      }
      lastSeen[c.id] = c.updatedAt;
    }
    firstLoad = false;
    unreadChats = convs.reduce((s, c) => s + (c.status !== 'closed' && c.id !== activeId ? c.unread || 0 : 0), 0);
    updateTitle();
    const b = $('#totalUnread');
    if (b) { b.hidden = !unreadChats; b.textContent = unreadChats; }
  }

  function updateTitle() {
    const n = unreadChats + reviewOrders;
    document.title = (n ? `(${n}) ` : '') + 'Inbox CS — Wak Prem';
  }

  /* ---------- Pesanan (QRIS) ---------- */
  const rp = (n) => 'Rp' + Math.round(n || 0).toLocaleString('id-ID');
  const rpCode = (n, digits = 3) => {
    const s = rp(n);
    return n >= 1000 ? `${s.slice(0, -digits)}<mark class="code">${s.slice(-digits)}</mark>` : s;
  };
  const ORDER_STATUS = {
    review: ['warning', 'Perlu dicek'], pending: ['warning', 'Belum bayar'], paid: ['success', 'Lunas'],
    delivered: ['success', 'Akun terkirim'], expired: ['danger', 'Kedaluwarsa'], cancelled: ['danger', 'Dibatalkan'],
  };

  async function refreshOrders() {
    ordersData = await ORDERS.list();
    for (const o of ordersData) {
      const was = orderSeen[o.id];
      if (!ordersFirst && NEEDS_ACTION.includes(o.status) && was !== o.status) {
        beep();
        if ('Notification' in window && Notification.permission === 'granted') {
          const n = o.status === 'paid'
            ? new Notification(`✅ Lunas ${rp(o.total)} — ${o.buyer.name}`, { body: `${o.id} — kirim akunnya sekarang`, tag: o.id })
            : new Notification(`💰 ${o.buyer.name} sudah bayar ${rp(o.total)}`, { body: `${o.id} — cek GoPay Merchant lalu konfirmasi`, tag: o.id });
          n.onclick = () => { window.focus(); setSection('orders'); n.close(); };
        }
      }
      orderSeen[o.id] = o.status;
    }
    ordersFirst = false;
    reviewOrders = ordersData.filter((o) => NEEDS_ACTION.includes(o.status)).length;
    const b = $('#reviewCount');
    if (b) { b.hidden = !reviewOrders; b.textContent = reviewOrders; }
    updateTitle();
    renderOrders();
  }

  function renderOrders() {
    const el = $('#ordList');
    if (!el) return;
    ORDER_FILTERS.forEach((f) => {
      const n = ordersData.filter((o) => f.match.includes(o.status)).length;
      const c = $('#ordCnt-' + f.id);
      if (c) c.textContent = n || '';
    });
    document.querySelectorAll('.ord-tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.f === ordFilter)));
    const f = ORDER_FILTERS.find((x) => x.id === ordFilter) || ORDER_FILTERS[0];
    const q = ordSearch.trim().toLowerCase().replace(/[.\s]/g, '');
    const list = ordersData
      .filter((o) => f.match.includes(o.status))
      .filter((o) => !q || [o.id, o.buyer.name, o.buyer.email, o.buyer.phone, String(o.total)].join(' ').toLowerCase().replace(/[.\s]/g, '').includes(q));
    if (!list.length) {
      el.innerHTML = `<div class="ad-list-empty">${icon('receipt', 28)}<span>${q ? 'Tidak ada pesanan yang cocok' : 'Belum ada pesanan di sini'}</span></div>`;
      return;
    }
    el.innerHTML = list.map(orderCard).join('');
  }

  function orderCard(o) {
    const [tone, label] = ORDER_STATUS[o.status] || ORDER_STATUS.pending;
    const btn = (s, text, cls) => `<button class="btn btn-sm ${cls}" data-ad="ord-status" data-id="${esc(o.id)}" data-s="${s}">${text}</button>`;
    const actions = {
      review: btn('paid', `${icon('check', 15)} Konfirmasi lunas`, 'btn-primary') + btn('pending', 'Belum masuk', 'btn-ghost') + btn('cancelled', 'Batalkan', 'btn-ghost'),
      pending: btn('paid', `${icon('check', 15)} Tandai lunas`, 'btn-outline') + btn('cancelled', 'Batalkan', 'btn-ghost'),
      paid: btn('delivered', `${icon('check', 15)} Akun sudah dikirim`, 'btn-primary') + btn('cancelled', 'Batalkan', 'btn-ghost'),
      expired: btn('paid', 'Tandai lunas (telat bayar)', 'btn-ghost'),
      cancelled: btn('paid', 'Tandai lunas', 'btn-ghost'),
      delivered: '',
    }[o.status] || '';
    const time = o.status === 'review' && o.claimedAt ? `bayar ${fmtShort(o.claimedAt)}` : fmtFull(o.createdAt);
    return `<article class="ord-card ${NEEDS_ACTION.includes(o.status) ? 'hot' : ''}">
      <div class="ord-top">
        <strong class="ord-id">${esc(o.id)}</strong>
        <span class="status-pill tone-${tone}">${label}</span>
        <time>${time}</time>
      </div>
      <div class="ord-amount">${rpCode(o.total, o.mode === 'kriskris' ? 2 : 3)}${o.uniqueCode ? `<small>kode unik ${o.uniqueCode}${o.mode === 'kriskris' ? ' · QRIS otomatis' : ''}</small>` : ''}</div>
      <ul class="ord-items">${o.lines.map((l) => `<li><b>${esc(l.name)}</b> · ${esc(l.variantLabel)}${l.qty > 1 ? ` × ${l.qty}` : ''}${l.targetEmail ? `<span class="ord-target">→ aktivasi ke <b>${esc(l.targetEmail)}</b> <button class="link-copy" data-ad="copy" data-v="${esc(l.targetEmail)}" title="Salin">${icon('copy', 12)}</button></span>` : ''}</li>`).join('')}</ul>
      <div class="ord-buyer">${icon('user', 14)} <b>${esc(o.buyer.name)}</b> · ${contactLink(o.buyer.email)}${o.buyer.phone ? ' · ' + contactLink(o.buyer.phone) : ''}</div>
      ${actions ? `<div class="ord-actions">${actions}</div>` : ''}
    </article>`;
  }

  async function setOrderStatus(id, s) {
    const o = ordersData.find((x) => x.id === id);
    if (!o) return;
    const ask = {
      paid: `Pastikan uang ${rp(o.total)} sudah masuk di GoPay Merchant.\n\nKonfirmasi pesanan ${id} LUNAS?`,
      cancelled: `Batalkan pesanan ${id}?`,
      pending: `Kembalikan ${id} ke "Belum bayar"? Pembeli akan diminta membayar lagi.`,
    }[s];
    if (ask && !window.confirm(ask)) return;
    try {
      await ORDERS.setStatus(id, s);
      toast({ paid: 'Pesanan ditandai lunas', delivered: 'Ditandai akun terkirim', cancelled: 'Pesanan dibatalkan', pending: 'Dikembalikan ke belum bayar' }[s]);
      await refreshOrders();
    } catch (e) {
      if (e.status === 401) { logout(); return; }
      toast(e.message, 'error');
    }
  }

  function updateNotifBtn() {
    const b = $('#notifBtn');
    if (!b) return;
    const on = 'Notification' in window && Notification.permission === 'granted';
    b.classList.toggle('on', on);
    b.title = on ? 'Notifikasi aktif' : 'Aktifkan notifikasi';
  }

  /* ---------- Daftar percakapan ---------- */
  function renderList() {
    const list = $('#convList');
    if (!list) return;
    const q = search.trim().toLowerCase();
    const open = convs.filter((c) => c.status !== 'closed');
    $('#cntOpen').textContent = open.length || '';
    $('#cntClosed').textContent = convs.length - open.length || '';
    document.querySelectorAll('.ad-tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.f === filter)));

    const shown = convs
      .filter((c) => (filter === 'closed' ? c.status === 'closed' : c.status !== 'closed'))
      .filter((c) => !q || [c.name, c.contact, c.last && c.last.text].join(' ').toLowerCase().includes(q));

    if (!shown.length) {
      list.innerHTML = `<li class="ad-list-empty">${icon('inbox', 28)}<span>${q ? 'Tidak ada yang cocok' : filter === 'open' ? 'Belum ada chat aktif' : 'Belum ada chat selesai'}</span></li>`;
      return;
    }
    list.innerHTML = shown.map((c) => {
      const unread = c.id !== activeId ? c.unread || 0 : 0;
      const last = c.last ? (c.last.from === 'admin' ? 'Kamu: ' : '') + c.last.text : '';
      return `<li><button class="ad-conv${c.id === activeId ? ' active' : ''}${unread ? ' unread' : ''}" data-ad="select" data-id="${esc(c.id)}">
        ${avatar(c)}
        <span class="ad-conv-main">
          <span class="ad-conv-top"><strong>${esc(c.name)}</strong><time>${fmtShort(c.updatedAt)}</time></span>
          <span class="ad-conv-last">${esc(last)}</span>
        </span>
        ${unread ? `<span class="ad-unread">${unread}</span>` : ''}
      </button></li>`;
    }).join('');
  }

  /* ---------- Thread ---------- */
  function renderThreadEmpty() {
    $('#grid').classList.remove('has-active');
    $('#thread').innerHTML = `<div class="ad-empty">
      <div class="empty-illu">${icon('message', 36)}</div>
      <h3>Pilih percakapan</h3>
      <p>Chat dari pengunjung yang klik <b>Sambungkan ke admin</b> akan muncul di sini.${'Notification' in window && Notification.permission !== 'granted' ? ' Aktifkan notifikasi (ikon lonceng) supaya tidak ketinggalan.' : ''}</p>
    </div>`;
  }

  function select(id) {
    activeId = id;
    history.replaceState(null, '', '#' + encodeURIComponent(id));
    threadId = null;
    renderList();
    loadThread();
  }

  function threadShell(c) {
    const closed = c.status === 'closed';
    return `
      <div class="th-head">
        <button class="icon-btn sm th-back" data-ad="back" aria-label="Kembali ke daftar">${icon('back', 18)}</button>
        ${avatar(c, 'lg')}
        <div class="th-who">
          <strong>${esc(c.name)}</strong>
          <span>${c.contact ? contactLink(c.contact) + ' · ' : ''}mulai ${fmtFull(c.createdAt)}</span>
        </div>
        <span class="status-pill ${closed ? 'tone-danger' : 'tone-success'}" id="thStatus">${closed ? 'Selesai' : 'Aktif'}</span>
        <button class="btn btn-sm ${closed ? 'btn-outline' : 'btn-ghost'}" data-ad="toggle-status" id="thToggle">${closed ? 'Buka lagi' : `${icon('check', 15)} Selesai`}</button>
      </div>
      ${c.context ? `<details class="th-context"><summary>${icon('bot', 16)} Percakapan dengan asisten sebelum tersambung</summary><pre>${esc(c.context)}</pre></details>` : ''}
      <div class="th-body" id="thBody"></div>
      <div class="th-quick">${QUICK_REPLIES.map((q) => `<button class="chat-chip" data-ad="quick" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      <form class="th-compose" id="compose">
        <textarea id="replyText" rows="1" placeholder="Tulis balasan…" title="Enter untuk kirim, Shift+Enter untuk baris baru" maxlength="2000"></textarea>
        <button class="chat-send" type="submit" aria-label="Kirim balasan">${icon('send', 19)}</button>
      </form>`;
  }

  function bubbleHTML(m) {
    if (m.from === 'system') return `<div class="chat-system">${esc(m.text)} · ${fmtTime(m.ts)}</div>`;
    return `<div class="ad-msg ${m.from === 'admin' ? 'me' : 'them'}"><div class="ad-bubble">${esc(m.text)}</div><time>${fmtShort(m.ts)}</time></div>`;
  }

  async function loadThread() {
    const id = activeId;
    if (!id) return;
    let data;
    try {
      data = await LIVE.messages(id);
    } catch (e) {
      if (e.status === 401) { logout(); return; }
      if (e.status === 404 || /tidak ditemukan/i.test(e.message)) { activeId = null; history.replaceState(null, '', location.pathname); renderThreadEmpty(); }
      return;
    }
    if (id !== activeId) return;
    const c = data.conversation;
    const th = $('#thread');
    if (threadId !== id) {
      threadId = id;
      rendered = new Set();
      th.innerHTML = threadShell(c);
      $('#grid').classList.add('has-active');
      if (window.matchMedia('(min-width: 801px)').matches) $('#replyText').focus();
    } else {
      const closed = c.status === 'closed';
      const st = $('#thStatus');
      if (st && st.textContent !== (closed ? 'Selesai' : 'Aktif')) {
        st.className = `status-pill ${closed ? 'tone-danger' : 'tone-success'}`;
        st.textContent = closed ? 'Selesai' : 'Aktif';
        const t = $('#thToggle');
        t.className = `btn btn-sm ${closed ? 'btn-outline' : 'btn-ghost'}`;
        t.innerHTML = closed ? 'Buka lagi' : `${icon('check', 15)} Selesai`;
      }
    }
    const body = $('#thBody');
    const nearBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 80;
    const fresh = data.messages.filter((m) => !rendered.has(m.id));
    if (!fresh.length) return;
    fresh.forEach((m) => rendered.add(m.id));
    body.insertAdjacentHTML('beforeend', fresh.map(bubbleHTML).join(''));
    if (nearBottom || fresh.some((m) => m.from === 'admin')) body.scrollTop = body.scrollHeight;
    // pesan sudah dibaca → perbarui badge di daftar
    const lc = convs.find((x) => x.id === id);
    if (lc) lc.unread = 0;
    renderList();
  }

  async function sendReply() {
    const ta = $('#replyText');
    const text = ta.value.trim();
    if (!text || !activeId) return;
    ta.value = '';
    autosize(ta);
    try {
      const m = await LIVE.reply(activeId, text);
      rendered.add(m.id);
      const body = $('#thBody');
      body.insertAdjacentHTML('beforeend', bubbleHTML(m));
      body.scrollTop = body.scrollHeight;
      refresh();
    } catch (e) {
      ta.value = text;
      toast('Gagal mengirim: ' + e.message, 'error');
    }
  }

  function autosize(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }

  /* ---------- Tema ---------- */
  const rootEl = document.documentElement;
  const currentTheme = () => rootEl.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  function updateThemeIcon() {
    const b = $('#themeBtn');
    if (b) b.innerHTML = icon(currentTheme() === 'dark' ? 'sun' : 'moon', 19);
  }

  /* ---------- Events ---------- */
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-ad]');
    if (!t) return;
    switch (t.dataset.ad) {
      case 'section': setSection(t.dataset.s); break;
      case 'ord-filter': ordFilter = t.dataset.f; renderOrders(); break;
      case 'ord-status': setOrderStatus(t.dataset.id, t.dataset.s); break;
      case 'copy':
        try { await navigator.clipboard.writeText(t.dataset.v); toast('Disalin: ' + t.dataset.v); } catch (err) { toast('Gagal menyalin', 'error'); }
        break;
      case 'select': select(t.dataset.id); break;
      case 'back':
        activeId = null;
        threadId = null;
        history.replaceState(null, '', location.pathname);
        renderThreadEmpty();
        renderList();
        break;
      case 'filter': filter = t.dataset.f; renderList(); break;
      case 'quick': {
        const ta = $('#replyText');
        ta.value = t.dataset.q;
        autosize(ta);
        ta.focus();
        break;
      }
      case 'toggle-status': {
        const c = convs.find((x) => x.id === activeId);
        const next = c && c.status === 'closed' ? 'open' : 'closed';
        try {
          await LIVE.setStatus(activeId, next);
          toast(next === 'closed' ? 'Percakapan ditandai selesai' : 'Percakapan dibuka lagi');
          refresh();
        } catch (err) { toast(err.message, 'error'); }
        break;
      }
      case 'notif':
        if (!('Notification' in window)) { toast('Browser ini tidak mendukung notifikasi', 'error'); break; }
        beep();
        if (Notification.permission === 'granted') { toast('Notifikasi sudah aktif'); break; }
        if ((await Notification.requestPermission()) === 'granted') toast('Notifikasi diaktifkan');
        updateNotifBtn();
        break;
      case 'theme': {
        const next = currentTheme() === 'dark' ? 'light' : 'dark';
        rootEl.dataset.theme = next;
        store.set('theme', next);
        updateThemeIcon();
        break;
      }
      case 'logout': logout(); break;
    }
  });

  document.addEventListener('submit', (e) => {
    if (e.target.id === 'loginForm') {
      e.preventDefault();
      login(e.target.pw.value);
    } else if (e.target.id === 'compose') {
      e.preventDefault();
      sendReply();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.id === 'replyText' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      sendReply();
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'replyText') autosize(e.target);
    if (e.target.id === 'adSearch') { search = e.target.value; renderList(); }
    if (e.target.id === 'ordSearch') { ordSearch = e.target.value; renderOrders(); }
  });

  // Mode demo: update instan saat pengunjung mengirim pesan dari tab lain
  window.addEventListener('storage', (e) => { if (e.key === 'wakprem:livechat' || e.key === 'wakprem:orders-db') refresh(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });

  /* ---------- Mulai ---------- */
  if (DEMO) startApp();
  else {
    const key = store.get('adminKey', '');
    if (key) LIVE.login(key).then(startApp).catch(() => renderLogin());
    else renderLogin();
  }
})();
