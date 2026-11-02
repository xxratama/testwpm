/**
 * WAK PREM — Chat CS (widget di halaman awal)
 * 1. Asisten otomatis menjawab pertanyaan umum (harga, cara order,
 *    pembayaran, garansi, status pesanan, promo) dari data katalog.
 * 2. "Sambungkan ke admin" → live chat langsung dengan admin di website.
 *    Admin membalas dari halaman /admin.html (lihat livechat.js).
 *
 * Mau ubah jawaban? Edit bagian ANSWERS di bawah. Kata kunci produk
 * diambil dari `aliases` di catalog.js.
 */
(function () {
  'use strict';

  const CAT = window.WAKPREM_CATALOG;
  const CFG = window.WAKPREM_CONFIG;
  const UI = window.WAKPREM_UI;
  const LIVE = window.WAKPREM_LIVE;
  if (!CAT || !CFG || !UI || !LIVE) return;

  const { icon, esc, rp, pIcon } = UI;
  const $ = (s, el = document) => el.querySelector(s);
  const HOURS = esc(CFG.operationalHours || '');
  const MAIN_CHIPS = ['Daftar harga', 'Cara order', 'Metode bayar', 'Garansi', 'Cek pesanan', 'Chat admin'];
  const ORDER_ID_RE = /WP-?(\d{6})-?([A-Z0-9]{5})/;
  const isMobile = () => window.matchMedia('(max-width: 640px)').matches;

  const makeStore = (area) => ({
    get(k, d) { try { const v = window[area].getItem('wakprem:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { window[area].setItem('wakprem:' + k, JSON.stringify(v)); } catch (e) { /* diblokir */ } },
  });
  const ss = makeStore('sessionStorage');
  const ls = makeStore('localStorage');

  let messages = ss.get('chat', []);
  let awaitingOrder = false;
  let queue = Promise.resolve();

  // Live chat dengan admin
  let live = ls.get('live', null); // { convId, token, name, lastTs }
  let pendingQuestion = ''; // pertanyaan yang diketik pengunjung → dikirim otomatis setelah tersambung
  let draftQuestion = '';   // teks bawaan dari tombol (mis. "tanya pesanan X") → diisikan ke kolom ketik
  let pollTimer = null;
  let restoring = !!live && !messages.some((m) => m.liveId);
  if (restoring) live.lastTs = 0; // riwayat chat di tab ini kosong → ambil ulang semua pesan
  const seen = new Set(messages.filter((m) => m.liveId).map((m) => m.liveId));

  /* =====================================================
     Jam operasional (WIB)
     ===================================================== */
  function isOpenNow() {
    const m = /(\d{1,2})[.:](\d{2})\s*[–-]\s*(\d{1,2})[.:](\d{2})/.exec(CFG.operationalHours || '');
    if (!m) return true;
    const now = new Date();
    const wib = ((now.getUTCHours() + 7) % 24) * 60 + now.getUTCMinutes();
    const start = +m[1] * 60 + +m[2];
    const end = +m[3] * 60 + +m[4];
    return start <= end ? wib >= start && wib < end : wib >= start || wib < end;
  }

  /* =====================================================
     Pemahaman pesan
     ===================================================== */
  const norm = (s) => ' ' + String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  // kata pendek dicocokkan per kata utuh, kata panjang boleh bagian dari kata ("garansinya")
  const has = (t, kw) => (kw.length >= 5 || kw.includes(' ') ? t.includes(kw) : t.includes(' ' + kw + ' '));

  // Urutan berpengaruh kalau skor seri: yang lebih atas menang.
  const INTENTS = {
    human: ['admin', 'cs manusia', 'manusia', 'operator', 'whatsapp', 'wa', 'telpon', 'telepon', 'hubungi', 'komplain', 'chat admin', 'orang asli', 'sambungkan'],
    track: ['cek pesanan', 'cek order', 'status pesanan', 'status order', 'pesanan saya', 'pesananku', 'order saya', 'lacak', 'status'],
    warranty: ['garansi', 'rusak', 'error', 'bermasalah', 'masalah', 'logout', 'keluar sendiri', 'gak bisa', 'ga bisa', 'tidak bisa', 'nggak bisa', 'gabisa', 'kena kick', 'klaim', 'claim', 'refund', 'balik gratis'],
    process: ['berapa lama', 'lama', 'kapan', 'proses', 'dikirim', 'terkirim', 'belum masuk', 'belum dapat', 'belum dikirim', 'nunggu', 'menunggu', 'cepat'],
    payment: ['bayar', 'pembayaran', 'qris', 'dana', 'ovo', 'gopay', 'shopeepay', 'linkaja', 'va', 'virtual', 'transfer', 'bca', 'bni', 'bri', 'mandiri', 'permata', 'metode', 'payment', 'biaya admin', 'biaya layanan'],
    promo: ['promo', 'voucher', 'diskon', 'kode', 'potongan', 'kupon'],
    account: ['email sendiri', 'akun sendiri', 'sharing', 'private', 'privat', 'perbedaan', 'bedanya', 'beda'],
    trust: ['aman', 'legal', 'resmi', 'terpercaya', 'penipu', 'tipu', 'scam', 'amanah', 'original', 'ori', 'trusted', 'percaya'],
    hours: ['jam', 'buka', 'operasional', 'online', 'libur'],
    order: ['cara order', 'cara beli', 'cara pesan', 'gimana beli', 'gimana order', 'order', 'beli', 'pesan', 'checkout', 'langkah'],
    price: ['harga', 'price', 'pricelist', 'berapa', 'daftar', 'katalog', 'list', 'produk', 'jual', 'murah', 'apa aja', 'apa saja', 'tersedia'],
    thanks: ['makasih', 'terima kasih', 'trims', 'thanks', 'thank', 'thx', 'mksh', 'tengkyu'],
    greet: ['halo', 'hallo', 'hai', 'hi', 'hello', 'pagi', 'siang', 'sore', 'malam', 'assalamualaikum', 'permisi', 'p'],
  };

  function findProducts(t) {
    return CAT.PRODUCTS.filter((p) => [p.name.toLowerCase()].concat(p.aliases || []).some((a) => has(t, a.toLowerCase())));
  }

  function detectIntent(t) {
    let best = null;
    let bestScore = 0;
    for (const [k, kws] of Object.entries(INTENTS)) {
      const s = kws.filter((kw) => has(t, kw)).length;
      if (s > bestScore) { best = k; bestScore = s; }
    }
    return best;
  }

  /* =====================================================
     Jawaban asisten
     ===================================================== */
  const minPrice = (p) => Math.min(...p.variants.map((v) => v.price));
  const liveAction = (label) => ({ label: label || 'Sambungkan ke admin', chat: 'live' });

  const ANSWERS = {
    greet: () => ({
      html: 'Halo! 👋 Aku asisten otomatis <b>Wak Prem</b>. Mau cari aplikasi premium apa hari ini? Pilih topik di bawah atau ketik pertanyaanmu — kalau perlu, aku bisa sambungkan kamu langsung ke admin.',
      chips: MAIN_CHIPS,
    }),

    price: () => {
      const live = CAT.PRODUCTS.filter((p) => !p.comingSoon);
      const soon = CAT.PRODUCTS.filter((p) => p.comingSoon).map((p) => p.name);
      return {
        html: `Ini produk yang bisa dibeli sekarang 👇${soon.length ? `<br><small>Segera hadir: ${esc(soon.join(', '))}.</small>` : ''}`,
        cards: live.map((p) => p.id),
        chips: ['Cara order', 'Metode bayar', 'Promo'],
      };
    },

    order: () => ({
      html: `Gampang banget, semuanya langsung di website:
        <ol><li>Pilih produk & paket di katalog</li><li>Klik <b>Beli sekarang</b>, isi nama & email (plus email akun kalau paket upgrade akun sendiri)</li>${UI.autoPayment
          ? '<li>Scan QRIS & bayar — nominal sudah otomatis terisi</li><li>Pembayaran terdeteksi otomatis, lalu akun dikirim ke email kamu</li></ol>'
          : UI.manualPayment
          ? '<li>Scan QRIS & bayar dengan nominal persis (ada kode unik di 3 digit terakhir)</li><li>Klik <b>Saya sudah bayar</b> — admin konfirmasi, lalu akun dikirim ke email kamu</li></ol>'
          : '<li>Pilih pembayaran: QRIS, GoPay, ShopeePay, atau Virtual Account</li><li>Bayar — detail akun dikirim ke email kamu dalam 5–15 menit</li></ol>'}`,
      actions: [{ label: 'Lihat katalog', chat: 'katalog' }],
      chips: ['Metode bayar', 'Garansi', 'Promo'],
    }),

    payment: () => {
      if (UI.autoPayment) {
        return {
          html: 'Pembayaran pakai <b>QRIS</b> langsung di website — bisa dibayar pakai DANA, OVO, GoPay, ShopeePay, LinkAja, dan semua m-banking, <b>tanpa biaya tambahan</b>.<br><br>Nominal sudah otomatis terisi saat scan, dan pembayaranmu <b>terverifikasi otomatis</b> dalam hitungan detik ✅',
          chips: ['Cara order', 'Berapa lama prosesnya?', 'Promo'],
        };
      }
      if (UI.manualPayment) {
        return {
          html: 'Pembayaran pakai <b>QRIS</b> langsung di website — bisa dibayar pakai DANA, OVO, GoPay, ShopeePay, LinkAja, dan semua m-banking, <b>tanpa biaya tambahan</b>.<br><br>Bayar dengan nominal <b>persis</b> (ada kode unik di 3 digit terakhir), lalu klik <b>Saya sudah bayar</b>. Admin mengonfirmasi dan status pesananmu berubah otomatis ✅',
          chips: ['Cara order', 'Berapa lama prosesnya?', 'Promo'],
        };
      }
      const groups = Object.entries(CAT.PAYMENT_GROUPS).map(([g, label]) => {
        const ms = UI.methods.filter((m) => m.group === g);
        if (!ms.length) return '';
        const fee = ms[0].feeFlat ? rp(ms[0].feeFlat) : String(ms[0].feePercent || 0).replace('.', ',') + '%';
        const names = ms.map((m) => m.short).join(', ');
        return `<li><b>${label}</b>${names !== label ? ': ' + esc(names) : ''} <small style="display:inline">(biaya ${fee})</small></li>`;
      }).join('');
      return {
        html: `Pembayaran dilakukan langsung di website, nggak perlu transfer manual:<ul>${groups}</ul>QRIS bisa dibayar pakai DANA, OVO, GoPay, ShopeePay, LinkAja, dan semua m-banking. Status pesanan otomatis berubah setelah pembayaran masuk ✅`,
        chips: ['Cara order', 'Berapa lama prosesnya?', 'Promo'],
      };
    },

    warranty: (prods) => {
      const notes = prods.filter((p) => p.note && !p.comingSoon).map((p) => `<li><b>${esc(p.name)}</b>: ${esc(p.note)}</li>`).join('');
      return {
        html: `Semua produk <b>bergaransi selama masa aktif</b> 🛡️ Kalau akun bermasalah, sambungkan ke admin dan sertakan <b>ID pesanan</b> — kami ganti atau perbaiki.${notes ? `<ul>${notes}</ul>` : ''}<small>Garansi tidak berlaku kalau password/email akun sharing diubah atau ketentuan di halaman produk dilanggar.</small>`,
        actions: [liveAction('Klaim garansi ke admin')],
        chips: ['Cek pesanan', 'Cara order'],
      };
    },

    process: () => {
      awaitingOrder = true;
      return {
        html: `Rata-rata <b>5–15 menit</b> setelah pembayaran berhasil (jam operasional ${HOURS}). Detail akun dikirim ke email — cek juga folder <b>Spam/Promosi</b> ya.<br><br>Sudah lebih dari 15 menit? Ketik <b>ID pesanan</b> kamu di sini, nanti aku cek statusnya.`,
        chips: ['Chat admin'],
      };
    },

    track: () => {
      awaitingOrder = true;
      const recent = Object.values(UI.orders()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 3).map((o) => o.id);
      return {
        html: `Boleh ketik <b>ID pesanan</b> kamu? Contohnya <b>WP-261102-AB12C</b>. ID ada di halaman pesanan dan email bukti bayar.${recent.length ? '<br><small>Atau pilih pesanan terakhir di perangkat ini:</small>' : ''}`,
        chips: recent,
      };
    },

    promo: () => {
      const list = Object.entries(CAT.VOUCHERS).filter(([, v]) => v.promote);
      if (!list.length) return { html: 'Saat ini belum ada promo aktif. Pantau terus ya, promo baru sering muncul! 🎁', chips: ['Daftar harga'] };
      return {
        html: `Ada promo nih 🎁<ul>${list.map(([code, v]) => `<li>Kode <b>${esc(code)}</b> — ${esc(v.label)}${v.minSubtotal ? ` <small style="display:inline">(min. belanja ${rp(v.minSubtotal)})</small>` : ''}</li>`).join('')}</ul>Masukkan kodenya di halaman checkout.`,
        actions: list.slice(0, 2).map(([code]) => ({ label: `Salin ${code}`, chat: 'copy', value: code })),
        chips: ['Daftar harga', 'Cara order'],
      };
    },

    account: () => ({
      html: `Bedanya begini:<ul>
        <li><b>Akun dari kami</b> — kamu dapat email & password akun yang sudah premium, tinggal login.</li>
        <li><b>Email / akun sendiri</b> — premium diaktifkan langsung di akunmu, jadi playlist, data & riwayat tetap milikmu.</li>
        <li><b>Sharing</b> — akun dipakai bersama, paling hemat. <b>Private</b> — akun khusus kamu.</li></ul>
        Jenis paket tiap produk tertulis di halaman produknya.`,
      chips: ['Daftar harga', 'Garansi'],
    }),

    trust: () => ({
      html: 'Tenang 😊 Di Wak Prem kamu bayar langsung di website (QRIS / e-wallet / VA), setiap pesanan punya <b>ID & status</b> yang bisa dicek kapan saja, dan semua produk <b>bergaransi</b> selama masa aktif. Ada kendala? Admin kami siap bantu langsung di chat ini.',
      chips: ['Garansi', 'Cara order', 'Chat admin'],
    }),

    hours: () => ({
      html: `Jam operasional admin: <b>${HOURS}</b>. ${isOpenNow()
        ? 'Saat ini admin sedang <b>online</b> ✅'
        : 'Saat ini di luar jam operasional — pesan ke admin tetap bisa dikirim dan dibalas saat online.'} Asisten ini sendiri siap jawab 24 jam.`,
      chips: ['Chat admin', 'Daftar harga', 'Cara order'],
    }),

    thanks: () => ({
      html: 'Sama-sama! 🙌 Kalau ada yang mau ditanyakan lagi, langsung ketik aja ya.',
      chips: ['Daftar harga', 'Cek pesanan'],
    }),

    fallback: () => ({
      html: 'Maaf, aku belum paham pertanyaan itu 🙏 Coba pilih topik di bawah, atau tanyakan langsung ke admin.',
      actions: [liveAction('Tanya langsung ke admin')],
      chips: MAIN_CHIPS.slice(0, 5),
    }),
  };

  function productReply(p) {
    if (p.comingSoon) {
      return {
        html: `<b>${esc(p.name)}</b> belum tersedia, tapi <b>segera hadir</b> di Wak Prem 👀 Mau dikabari waktu sudah ready? Tinggalkan pesan ke admin.`,
        actions: [liveAction('Kabari saya via admin')],
        chips: ['Daftar harga'],
      };
    }
    return {
      html: `<b>${esc(p.name)}</b> — ${esc(p.tagline)}.<br>Paket yang tersedia:<ul>${p.variants.map((v) => `<li>${esc(v.label)}: <b>${rp(v.price)}</b></li>`).join('')}</ul>${p.note ? `<small>ℹ️ ${esc(p.note)}</small>` : ''}`,
      cards: [p.id],
      chips: ['Cara order', 'Garansi', 'Metode bayar'],
    };
  }

  function orderReply(id) {
    const o = UI.orders()[id];
    if (!o) {
      return {
        html: `Aku belum menemukan pesanan <b>${esc(id)}</b> di perangkat ini. Coba cek lewat halaman Cek Pesanan, atau tanyakan langsung ke admin.`,
        actions: [{ label: 'Buka Cek Pesanan', href: '#/cek' }, liveAction('Tanya admin')],
      };
    }
    const names = o.lines.map((l) => l.name).join(', ');
    const note = {
      paid: `Pembayaran sudah diterima ✅ Detail akun dikirim ke <b>${esc(o.buyer.email)}</b> dalam 5–15 menit (jam operasional ${HOURS}).`,
      pending: 'Pesanan ini masih <b>menunggu pembayaran</b>. Selesaikan pembayaran supaya langsung diproses.',
      expired: 'Waktu pembayaran pesanan ini sudah habis. Kamu bisa pesan ulang dari halaman pesanan.',
      failed: 'Pembayaran pesanan ini gagal. Silakan pesan ulang atau pilih metode lain.',
    }[o.status] || '';
    return {
      html: `Pesanan <b>${esc(o.id)}</b> · ${esc(names)}<br>Status: ${UI.statusPill(o.status)}<br>${note}`,
      actions: [{ label: 'Lihat detail pesanan', href: '#/pesanan/' + encodeURIComponent(o.id) }],
      chips: o.status === 'paid' ? ['Garansi', 'Chat admin'] : ['Metode bayar', 'Chat admin'],
    };
  }

  /** Pesan bot berisi formulir singkat untuk mulai live chat. */
  function liveFormMessage(intro) {
    const offline = !isOpenNow();
    return {
      html: `${intro || 'Siap, aku sambungkan langsung ke admin ya 🙌'} ${offline
        ? `<br><small>Admin sedang offline (jam operasional ${HOURS}). Pesanmu tetap masuk dan dibalas saat online — isi email/WA supaya kami bisa kabari.</small>`
        : '<br><small>Admin biasanya membalas dalam beberapa menit.</small>'}`,
      form: 'live',
    };
  }

  function reply(raw) {
    const t = norm(raw);
    const idMatch = raw.toUpperCase().replace(/\s+/g, '').match(ORDER_ID_RE);
    if (idMatch) { awaitingOrder = false; return orderReply(`WP-${idMatch[1]}-${idMatch[2]}`); }

    const intent = detectIntent(t);
    const prods = findProducts(t);

    if (awaitingOrder && !intent && !prods.length) {
      awaitingOrder = false;
      return {
        html: 'Hmm, sepertinya itu bukan ID pesanan. Formatnya seperti <b>WP-261102-AB12C</b> — bisa dilihat di email bukti bayar.',
        chips: ['Cek pesanan', 'Chat admin'],
      };
    }
    awaitingOrder = false;

    if (intent === 'human') {
      // kalau pengunjung menulis pertanyaan sungguhan (bukan sekadar "chat admin"), teruskan ke admin
      const generic = /^(chat |hubungi |sambungkan( ke)? |mau |minta )?(admin|cs|operator|manusia)( dong| aja| ya| please)?$/i.test(raw.trim());
      pendingQuestion = generic ? '' : raw.trim();
      return liveFormMessage();
    }
    if (prods.length && (!intent || ['price', 'greet', 'order', 'thanks', 'account', 'trust'].includes(intent))) {
      if (prods.length === 1) return productReply(prods[0]);
      return { html: 'Ini produk yang kamu maksud 👇', cards: prods.map((p) => p.id), chips: ['Cara order', 'Metode bayar'] };
    }
    if (intent) return ANSWERS[intent](prods, raw);
    return ANSWERS.fallback(prods, raw);
  }

  /* =====================================================
     Tampilan
     ===================================================== */
  const DEFAULT_TEASER = '<strong>Halo! 👋</strong> Ada yang bisa dibantu? Tanya harga, cara order, atau langsung chat admin di sini.';
  const root = document.createElement('div');
  root.className = 'chat-root';
  root.innerHTML = `
    <div class="chat-teaser" id="chatTeaser" hidden>
      <button class="chat-teaser-x" data-chat="dismiss-teaser" aria-label="Tutup sapaan">${icon('x', 14)}</button>
      <button class="chat-teaser-body" data-chat="open">${DEFAULT_TEASER}</button>
    </div>
    <button class="chat-launcher" id="chatLauncher" data-chat="toggle" aria-label="Buka chat CS" aria-expanded="false" aria-controls="chatPanel">
      <span class="cl-ic cl-open">${icon('message', 22)}</span><span class="cl-ic cl-close">${icon('x', 22)}</span>
      <span class="cl-label">Tanya CS</span><i class="chat-dot" hidden></i>
    </button>
    <section class="chat-panel" id="chatPanel" role="dialog" aria-label="Chat CS Wak Prem" inert>
      <header class="chat-head">
        <span class="chat-avatar">${icon('crown', 20)}<i class="online-dot"></i></span>
        <div class="chat-title"><strong id="chatName">CS Wak Prem</strong><span id="chatStatus"></span></div>
        <button class="chat-icon" data-chat="reset" aria-label="Mulai ulang percakapan" title="Mulai ulang">${icon('refresh', 17)}</button>
        <button class="chat-icon" data-chat="close" aria-label="Tutup chat">${icon('x', 19)}</button>
      </header>
      <div class="chat-livebar" id="chatLivebar" hidden>
        <span class="lb-dot"></span><span>Kamu sedang chat langsung dengan <b>admin</b></span>
        <button data-chat="end-live">Akhiri</button>
      </div>
      <div class="chat-body" id="chatBody" aria-live="polite"></div>
      <form class="chat-input" id="chatForm" autocomplete="off">
        <input id="chatText" type="text" placeholder="Tulis pertanyaan…" aria-label="Tulis pesan" maxlength="1000" enterkeyhint="send">
        <button class="chat-send" type="submit" aria-label="Kirim pesan">${icon('send', 19)}</button>
      </form>
      <button class="chat-foot" id="chatFoot" data-chat="live">${icon('user', 14)} Butuh bantuan manusia? <b>Sambungkan ke admin</b></button>
    </section>`;
  document.body.appendChild(root);

  const panel = $('#chatPanel');
  const body = $('#chatBody');
  const input = $('#chatText');
  const launcher = $('#chatLauncher');
  const teaser = $('#chatTeaser');
  const isPanelOpen = () => panel.classList.contains('open');

  function updateStatus() {
    const open = isOpenNow();
    panel.classList.toggle('offline', !open);
    $('#chatName').textContent = live ? 'Admin Wak Prem' : 'CS Wak Prem';
    $('#chatStatus').textContent = live
      ? (open ? 'Admin online · terhubung langsung' : `Admin offline · dibalas jam ${CFG.operationalHours}`)
      : (open ? 'Online · dijawab instan' : `Asisten 24 jam · admin ${CFG.operationalHours}`);
  }

  function setLiveUI() {
    const on = !!live;
    panel.classList.toggle('is-live', on);
    $('#chatLivebar').hidden = !on;
    $('#chatFoot').hidden = on;
    input.placeholder = on ? 'Tulis pesan untuk admin…' : 'Tulis pertanyaan…';
    updateStatus();
  }

  function cardHTML(id) {
    const p = CAT.findProduct(id);
    if (!p) return '';
    return `<div class="chat-card">${pIcon(p, 'xs')}
      <div class="cc-main"><strong>${esc(p.name)}</strong><span>${p.comingSoon ? 'Segera hadir' : 'Mulai ' + rp(minPrice(p))}</span></div>
      ${p.comingSoon ? '' : `<button class="btn btn-sm btn-primary" data-chat="product" data-id="${p.id}">Lihat</button>`}
    </div>`;
  }

  function actionHTML(a) {
    if (a.href) return `<a class="btn btn-sm btn-outline" href="${a.href}" data-chat="nav">${esc(a.label)} ${icon('arrow-right', 15)}</a>`;
    if (a.chat === 'live') return `<button class="btn btn-sm btn-primary" data-chat="live">${icon('user', 15)} ${esc(a.label)}</button>`;
    return `<button class="btn btn-sm btn-outline" data-chat="${a.chat}" data-value="${esc(a.value || '')}">${esc(a.label)}</button>`;
  }

  function liveFormHTML(m) {
    if (m.done) return `<div class="live-done">${icon('check', 14)} Tersambung sebagai <b>${esc(m.done)}</b></div>`;
    let pre = {};
    try { pre = JSON.parse(localStorage.getItem('wakprem:draft')) || {}; } catch (e) { /* kosong */ }
    return `<form class="live-form" data-live-form novalidate>
      <label><span>Nama</span><input name="name" placeholder="Nama kamu" maxlength="60" value="${esc((live && live.name) || pre.name || '')}" autocomplete="name"></label>
      <label><span>Email / No. WA <em>(opsional)</em></span><input name="contact" placeholder="Supaya admin bisa follow-up" maxlength="100" value="${esc(pre.email || '')}"></label>
      <button class="btn btn-primary btn-block" type="submit">${icon('message', 16)} Mulai chat dengan admin</button>
    </form>`;
  }

  function msgHTML(m, isLast) {
    if (m.from === 'user') return `<div class="msg user${m.failed ? ' failed' : ''}">${esc(m.text)}</div>`;
    if (m.from === 'admin') return `<div class="msg admin"><span class="msg-from">${icon('crown', 12)} Admin</span>${esc(m.text)}</div>`;
    if (m.from === 'system') return `<div class="chat-system">${esc(m.text)}</div>`;
    let h = `<div class="msg bot">${m.html}</div>`;
    if (m.form) h += liveFormHTML(m);
    if (m.cards && m.cards.length) h += `<div class="chat-cards">${m.cards.map(cardHTML).join('')}</div>`;
    if (m.actions && m.actions.length) h += `<div class="chat-actions">${m.actions.map(actionHTML).join('')}</div>`;
    if (isLast && m.chips && m.chips.length) {
      h += `<div class="chat-chips">${m.chips.map((c) => `<button class="chat-chip" data-chat="chip" data-q="${esc(c)}">${esc(c)}</button>`).join('')}</div>`;
    }
    return h;
  }

  function scrollDown() { body.scrollTop = body.scrollHeight; }
  function save() { ss.set('chat', messages.slice(-80)); }

  function renderAll() {
    body.classList.add('no-anim');
    body.innerHTML = '<div class="chat-day">Hari ini</div>' + messages.map((m, i) => msgHTML(m, i === messages.length - 1)).join('');
    scrollDown();
    requestAnimationFrame(() => body.classList.remove('no-anim'));
  }

  function push(m) {
    body.querySelectorAll('.chat-chips').forEach((el) => el.remove());
    messages.push(m);
    save();
    body.insertAdjacentHTML('beforeend', msgHTML(m, true));
    scrollDown();
    return m;
  }
  const pushSystem = (text) => push({ from: 'system', text });

  function botSay(m) {
    return new Promise((resolve) => {
      body.insertAdjacentHTML('beforeend', '<div class="msg bot typing" aria-label="Sedang mengetik"><i></i><i></i><i></i></div>');
      scrollDown();
      const delay = 450 + Math.min(String(m.html).replace(/<[^>]+>/g, '').length * 6, 900);
      setTimeout(() => {
        const t = body.querySelector('.typing');
        if (t) t.remove();
        push(Object.assign({ from: 'bot' }, m));
        resolve();
      }, delay);
    });
  }

  function send(text) {
    const q = String(text || '').trim();
    if (!q) return;
    if (live) { sendLive(q); return; }
    push({ from: 'user', text: q });
    queue = queue.then(() => botSay(reply(q)));
  }

  /* =====================================================
     Live chat dengan admin
     ===================================================== */
  function askLive(question) {
    open();
    if (live) {
      if (question) { input.value = question; input.focus(); }
      return;
    }
    if (question) draftQuestion = question;
    queue = queue.then(() => botSay(liveFormMessage()));
  }

  function transcript() {
    const strip = (h) => String(h || '').replace(/<li>/g, ' • ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    return messages
      .filter((m) => m.from === 'user' || (m.from === 'bot' && !m.form))
      .slice(-10)
      .map((m) => (m.from === 'user' ? 'Pengunjung: ' + m.text : 'Asisten: ' + strip(m.html).slice(0, 160)))
      .join('\n');
  }

  async function startLive(form) {
    const name = form.name.value.trim();
    const contact = form.contact.value.trim();
    if (name.length < 2) {
      form.name.classList.add('invalid');
      form.name.focus();
      return;
    }
    const btn = form.querySelector('button');
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Menyambungkan…';
    try {
      const r = await LIVE.start({ name, contact, context: transcript(), page: location.href });
      live = { convId: r.convId, token: r.token, name, lastTs: 0 };
      ls.set('live', live);
      restoring = false;

      const fm = [...messages].reverse().find((m) => m.form && !m.done);
      if (fm) { fm.done = name; save(); }
      form.outerHTML = liveFormHTML({ done: name });

      setLiveUI();
      setVisible(UI.view());
      pushSystem(isOpenNow() ? 'Tersambung dengan admin' : 'Pesan diteruskan ke admin — dibalas saat jam operasional');

      if (pendingQuestion) {
        const q = pendingQuestion;
        pendingQuestion = '';
        await sendLive(q, true);
      } else {
        pushSystem('Silakan tulis pertanyaanmu di bawah 👇');
      }
      if (draftQuestion) { input.value = draftQuestion; draftQuestion = ''; }
      if (!isMobile() || input.value) input.focus();
      schedulePoll(0);
    } catch (e) {
      btn.classList.remove('loading');
      btn.innerHTML = `${icon('message', 16)} Coba lagi`;
      UI.toast(e.message, 'error');
    }
  }

  async function sendLive(text, alreadyShown) {
    const bubble = alreadyShown ? null : push({ from: 'user', text });
    try {
      const m = await LIVE.send(live.convId, live.token, text);
      seen.add(m.id);
      if (bubble) { bubble.liveId = m.id; save(); }
    } catch (e) {
      if (bubble) {
        bubble.failed = true;
        save();
        const els = body.querySelectorAll('.msg.user');
        if (els.length) els[els.length - 1].classList.add('failed');
      }
      pushSystem('Pesan gagal terkirim: ' + e.message);
      if (/tidak ditemukan/i.test(e.message)) endLive('lost');
    }
  }

  async function poll() {
    if (!live) return;
    try {
      const r = await LIVE.poll(live.convId, live.token, live.lastTs);
      let lastAdmin = null;
      for (const m of r.messages) {
        live.lastTs = Math.max(live.lastTs, m.ts);
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        if (m.from === 'admin') { push({ from: 'admin', text: m.text, liveId: m.id }); lastAdmin = m; }
        else if (m.from === 'visitor' && restoring) push({ from: 'user', text: m.text, liveId: m.id });
        else if (m.from === 'system' && m.text.startsWith('Admin')) push({ from: 'system', text: m.text, liveId: m.id });
      }
      restoring = false;
      if (live) ls.set('live', live);
      if (lastAdmin && !isPanelOpen()) notifyReply(lastAdmin.text);
      if (r.status === 'closed') endLive('admin');
    } catch (e) {
      if (e.status === 404 || /tidak ditemukan/i.test(e.message)) endLive('lost');
    }
  }

  function schedulePoll(delay) {
    clearTimeout(pollTimer);
    if (!live) return;
    const next = delay != null ? delay : isPanelOpen() ? LIVE.pollMs : LIVE.pollMs * 4;
    pollTimer = setTimeout(async () => {
      await poll();
      schedulePoll();
    }, next);
  }

  function endLive(reason) {
    if (!live) return;
    const l = live;
    live = null;
    ls.set('live', null);
    clearTimeout(pollTimer);
    setLiveUI();
    if (reason === 'visitor') {
      LIVE.leave(l.convId, l.token).catch(() => {});
      pushSystem('Kamu mengakhiri chat dengan admin');
    } else if (reason === 'lost') {
      pushSystem('Percakapan dengan admin sudah berakhir');
    }
    queue = queue.then(() => botSay({ html: 'Aku kembali membantu ya 😊 Ada lagi yang bisa ditanyakan? Kamu juga bisa sambungkan ke admin lagi kapan saja.', chips: MAIN_CHIPS }));
    setVisible(UI.view());
  }

  function notifyReply(text) {
    $('.chat-teaser-body', teaser).innerHTML = `<strong>Admin membalas 💬</strong>${esc(text.slice(0, 90))}${text.length > 90 ? '…' : ''}`;
    teaser.hidden = root.hidden;
    $('.chat-dot', launcher).hidden = false;
  }

  /* =====================================================
     Buka / tutup
     ===================================================== */
  function open() {
    root.hidden = false;
    if (isPanelOpen()) return;
    updateStatus();
    hideTeaser();
    panel.classList.add('open');
    panel.removeAttribute('inert');
    root.classList.add('is-open');
    launcher.setAttribute('aria-expanded', 'true');
    launcher.setAttribute('aria-label', 'Tutup chat CS');
    document.body.classList.add('chat-open');
    scrollDown();
    if (!messages.length && !live) queue = queue.then(() => botSay(ANSWERS.greet()));
    if (live) schedulePoll(0);
    if (!isMobile()) setTimeout(() => input.focus({ preventScroll: true }), 200);
  }

  function close() {
    if (!isPanelOpen()) return;
    panel.classList.remove('open');
    panel.setAttribute('inert', '');
    root.classList.remove('is-open');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-label', 'Buka chat CS');
    document.body.classList.remove('chat-open');
    setVisible(UI.view());
  }

  function showTeaser() {
    if (ss.get('teaserSeen', false) || isPanelOpen() || root.hidden) return;
    teaser.hidden = false;
    $('.chat-dot', launcher).hidden = false;
  }
  function hideTeaser() {
    teaser.hidden = true;
    $('.chat-dot', launcher).hidden = true;
    $('.chat-teaser-body', teaser).innerHTML = DEFAULT_TEASER;
    ss.set('teaserSeen', true);
  }

  // Tampil di halaman awal; saat sedang chat dengan admin, tampil di semua halaman.
  function setVisible(view) {
    const show = view === 'home' || !!live || isPanelOpen();
    root.hidden = !show;
  }

  /* =====================================================
     Events
     ===================================================== */
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-action="open-chat"]');
    if (opener) {
      e.preventDefault();
      if (opener.hasAttribute('data-live')) askLive(opener.dataset.live);
      else open();
      return;
    }
    const t = e.target.closest('[data-chat]');
    if (!t || !root.contains(t)) return;
    switch (t.dataset.chat) {
      case 'toggle': isPanelOpen() ? close() : open(); break;
      case 'open': open(); break;
      case 'close': close(); break;
      case 'dismiss-teaser': hideTeaser(); break;
      case 'chip':
        if (/^chat admin$/i.test(t.dataset.q)) { push({ from: 'user', text: t.dataset.q }); pendingQuestion = ''; queue = queue.then(() => botSay(liveFormMessage())); }
        else send(t.dataset.q);
        break;
      case 'live': askLive(''); break;
      case 'end-live': endLive('visitor'); break;
      case 'reset':
        if (live && !window.confirm('Akhiri chat dengan admin dan mulai ulang?')) break;
        if (live) endLive('visitor');
        messages = [];
        awaitingOrder = false;
        pendingQuestion = '';
        queue = queue.then(() => { save(); renderAll(); return botSay(ANSWERS.greet()); });
        break;
      case 'product':
        close();
        location.hash = '#/produk/' + t.dataset.id;
        break;
      case 'katalog':
        if (isMobile()) close();
        { const k = document.getElementById('katalog'); if (k) k.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        break;
      case 'copy': UI.copyText(t.dataset.value); break;
      case 'nav': close(); break;
    }
  });

  document.addEventListener('submit', (e) => {
    const f = e.target;
    if (f.id === 'chatForm') {
      e.preventDefault();
      const v = input.value;
      input.value = '';
      send(v);
    } else if (f.matches('[data-live-form]')) {
      e.preventDefault();
      startLive(f);
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.closest('[data-live-form]')) e.target.classList.remove('invalid');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isPanelOpen() && !document.querySelector('.sheet.open')) close();
  });

  window.addEventListener('wakprem:view', (e) => { if (!isPanelOpen()) setVisible(e.detail); });

  // Sinkron antar-tab (mis. pengunjung membuka 2 tab website)
  window.addEventListener('storage', (e) => {
    if (e.key === 'wakprem:live') {
      live = ls.get('live', null);
      setLiveUI();
      schedulePoll(0);
    } else if (e.key === 'wakprem:livechat' && live) {
      schedulePoll(0); // mode demo: balasan admin dari tab lain langsung muncul
    }
  });

  renderAll();
  setLiveUI();
  setVisible(UI.view());
  setInterval(updateStatus, 60000);
  setTimeout(showTeaser, 5000);
  if (live) schedulePoll(0);
})();
