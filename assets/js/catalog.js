/**
 * KATALOG WAK PREM
 * ------------------------------------------------------------------
 * Edit file ini untuk menambah / mengubah produk, harga, voucher, dan
 * metode pembayaran. File ini dipakai oleh website (browser) DAN server
 * pembayaran (folder api/), jadi total yang dibayar pembeli selalu
 * dihitung ulang dari sini — harga tidak bisa diakali dari browser.
 *
 * Menambah produk baru: salin salah satu blok produk, ganti id (unik,
 * huruf kecil-strip), nama, harga, dll. Untuk produk yang belum dijual,
 * isi `comingSoon: true` (tanpa variants).
 *
 * `aliases` = kata kunci lain yang dikenali chat CS & pencarian (opsional).
 *
 * Logo produk:
 *   logo: 'assets/img/brands/nama-file.svg'  ← file logo (svg / png / webp)
 *   logoStyle: 'mono'  → logo dibuat putih di atas warna brand (`colors`)
 *   logoStyle: 'color' → logo asli berwarna di atas kotak putih (file logo resmi berwarna)
 *   Tanpa `logo`, kartu memakai ikon di bawah sebagai pengganti.
 *
 * Ikon yang tersedia: sparkles, bot, music, headphones, clapper, tv,
 * play, palette, zap, gift, package.
 *
 * `original` = harga normal untuk harga coret & label diskon. Diisi dari
 * perkiraan harga langganan resmi (cek Nov 2026): Apple Music & Spotify
 * Rp59rb/bln, YouTube Rp69rb/bln, Canva Rp769rb/thn, Zoom ±US$15/bln,
 * Scribd ±Rp70rb/bln, CapCut (harga ID tidak dipublikasikan, perkiraan).
 * Harga resmi bisa naik/turun — cek ulang berkala supaya label tetap jujur.
 */
(function (root) {
  'use strict';

  const CATEGORIES = [
    { id: 'all', label: 'Semua' },
    { id: 'ai', label: 'AI & Produktivitas' },
    { id: 'music', label: 'Musik' },
    { id: 'editing', label: 'Editing' },
    { id: 'streaming', label: 'Streaming' },
    { id: 'reading', label: 'Baca & Belajar' },
  ];

  const PRODUCTS = [
    {
      id: 'gemini-ai-pro', aliases: ['gemini', 'google one', 'google ai', 'bard', 'veo', 'notebooklm'],
      logo: 'assets/img/brands/googlegemini.svg', logoStyle: 'mono',
      name: 'Gemini AI Pro',
      tagline: 'AI terbaik dari Google + penyimpanan 5 TB',
      category: 'ai',
      icon: 'sparkles',
      colors: ['#3B82F6', '#A855F7'],
      badge: 'Terlaris',
      tags: ['18 Bulan', '5 TB Storage', 'Email sendiri'],
      process: '5–15 menit',
      warranty: 'Full garansi',
      features: [
        'Akses model Gemini Pro terbaru dengan limit lebih tinggi',
        'Deep Research, pembuatan video AI (Veo) & gambar',
        'NotebookLM dengan kuota lebih besar',
        'Gemini langsung di Gmail, Docs, Sheets & Slides',
        'Penyimpanan Google 5 TB (Drive, Gmail, Foto)',
      ],
      note: 'Diaktifkan langsung di akun Google kamu. Pastikan akun sedang tidak berlangganan Google One / Gemini.',
      variants: [
        { id: '18-bulan-email', label: '18 Bulan · Email sendiri', sub: 'Upgrade langsung ke Gmail kamu', price: 40000, original: 100000, needsEmail: true, emailLabel: 'Gmail yang mau di-upgrade', default: true },
      ],
    },
    {
      id: 'chatgpt-plus', aliases: ['chatgpt', 'chat gpt', 'gpt', 'openai', 'cgpt'],
      logo: 'assets/img/brands/chatgpt.svg', logoStyle: 'mono',
      name: 'ChatGPT Plus',
      tagline: 'Model GPT terbaru tanpa batasan versi gratis',
      category: 'ai',
      icon: 'bot',
      colors: ['#10A37F', '#0B7A5E'],
      badge: 'Hot',
      tags: ['1 Bulan', 'GPT terbaru'],
      process: '5–15 menit',
      warranty: 'Full garansi',
      features: [
        'Model GPT terbaru dengan limit pesan jauh lebih tinggi',
        'Buat & edit gambar langsung di chat',
        'Mode suara (voice) lanjutan',
        'Analisis file, PDF, dan data',
        'Deep research & Custom GPTs',
      ],
      note: 'Untuk paket Sharing, mohon jangan mengubah password, email, atau pengaturan akun.',
      variants: [
        { id: '1-bulan-sharing', label: '1 Bulan · Sharing', sub: 'Akun bersama, paling hemat', price: 35000, original: 330000, default: true },
        { id: '1-bulan-private', label: '1 Bulan · Private', sub: 'Akun khusus kamu, riwayat chat privat', price: 95000, original: 330000, tag: 'Privat' },
      ],
    },
    {
      id: 'apple-music', aliases: ['apple music', 'apple', 'itunes'],
      logo: 'assets/img/brands/applemusic.svg', logoStyle: 'mono',
      name: 'Apple Music 1 Tahun',
      tagline: '100 juta+ lagu, lossless & Dolby Atmos',
      category: 'music',
      icon: 'music',
      colors: ['#FA2D48', '#FF7A59'],
      tags: ['1 Tahun', 'Lossless', 'Tanpa iklan'],
      process: '5–15 menit',
      warranty: 'Full garansi',
      features: [
        'Dengarkan 100 juta+ lagu tanpa iklan',
        'Audio lossless & Spatial Audio (Dolby Atmos)',
        'Download lagu untuk didengar offline',
        'Lirik real-time & Apple Music Sing',
        'Bisa di iPhone, Android, Mac, Windows & web',
      ],
      note: 'Aktivasi lewat undangan Family ke Apple ID kamu. Pastikan Apple ID belum tergabung di Family lain.',
      variants: [
        { id: '1-tahun', label: '1 Tahun', sub: 'Undangan ke Apple ID kamu', price: 40000, original: 708000, needsEmail: true, emailLabel: 'Email Apple ID kamu', default: true },
      ],
    },
    {
      id: 'spotify-premium', aliases: ['spotify', 'spoti', 'spotif'],
      logo: 'assets/img/brands/spotify.svg', logoStyle: 'mono',
      name: 'Spotify Premium 1 Tahun',
      tagline: 'Musik & podcast tanpa iklan, bisa offline',
      category: 'music',
      icon: 'headphones',
      colors: ['#1DB954', '#13863C'],
      badge: 'Favorit',
      tags: ['1 Tahun', 'Akun sendiri', 'Offline'],
      process: '5–15 menit',
      warranty: 'Full garansi',
      features: [
        'Dengar musik tanpa iklan',
        'Download lagu & podcast untuk offline',
        'Skip lagu sepuasnya',
        'Kualitas audio tinggi',
        'Pakai akun Spotify kamu sendiri — playlist tetap aman',
      ],
      note: 'Aktivasi lewat undangan Premium Family ke akun Spotify kamu. Jangan keluar dari Family selama masa aktif.',
      variants: [
        { id: '1-tahun', label: '1 Tahun', sub: 'Pakai akun Spotify kamu', price: 120000, original: 708000, needsEmail: true, emailLabel: 'Email akun Spotify kamu', default: true },
      ],
    },
    {
      id: 'capcut-pro', aliases: ['capcut', 'cap cut', 'capcat'],
      logo: 'assets/img/brands/capcut.svg', logoStyle: 'mono',
      name: 'CapCut Pro',
      tagline: 'Edit video tanpa watermark + semua fitur Pro',
      category: 'editing',
      icon: 'clapper',
      colors: ['#1F2937', '#52525B'],
      tags: ['Tanpa watermark', 'HP & PC'],
      process: '5–15 menit',
      warranty: 'Full garansi',
      features: [
        'Ekspor tanpa watermark hingga 4K',
        'Semua efek, filter, transisi & template Pro',
        'Fitur AI: hapus background, auto caption, dll.',
        'Penyimpanan cloud tambahan',
        'Bisa dipakai di HP, PC & web',
      ],
      note: 'Login memakai akun yang kami kirim. Mohon jangan mengubah email atau password.',
      variants: [
        { id: '1-bulan', label: '1 Bulan', sub: 'Akun dari kami, siap login', price: 20000, original: 200000, default: true },
        { id: '1-tahun', label: '1 Tahun', sub: 'Paling hemat untuk kreator', price: 120000, original: 1200000, tag: 'Hemat' },
      ],
    },
    {
      id: 'youtube-premium', aliases: ['youtube', 'yt premium', 'yt music', 'yt'],
      logo: 'assets/img/brands/youtube.svg', logoStyle: 'mono',
      name: 'YouTube Premium',
      tagline: 'YouTube tanpa iklan + YouTube Music',
      category: 'streaming',
      icon: 'play',
      colors: ['#FF0033', '#C2002A'],
      tags: ['Tanpa iklan', 'Akun sendiri'],
      process: '5–15 menit',
      warranty: 'Full garansi',
      features: [
        'Nonton YouTube tanpa iklan',
        'Putar video di background & saat layar mati',
        'Download video untuk ditonton offline',
        'Termasuk YouTube Music Premium',
        'Pakai akun Google kamu sendiri — langganan & riwayat tetap aman',
      ],
      note: 'Aktivasi lewat undangan Family ke akun Google kamu. Pastikan akun belum tergabung di Family lain.',
      variants: [
        { id: '1-bulan', label: '1 Bulan', sub: 'Pakai akun Google kamu', price: 20000, original: 69000, needsEmail: true, emailLabel: 'Email akun Google / YouTube kamu', default: true },
        { id: '1-tahun', label: '1 Tahun', sub: 'Lebih hemat setahun penuh', price: 120000, original: 828000, needsEmail: true, emailLabel: 'Email akun Google / YouTube kamu', tag: 'Hemat' },
      ],
    },
    {
      id: 'canva-pro', aliases: ['canva'],
      logo: 'assets/img/brands/canva.svg', logoStyle: 'mono',
      name: 'Canva Pro',
      tagline: 'Desain pro, jutaan template & aset premium',
      category: 'editing',
      icon: 'palette',
      colors: ['#00C4CC', '#7D2AE8'],
      badge: 'Lifetime',
      tags: ['Seumur hidup', 'Akun sendiri'],
      process: '5–15 menit',
      warranty: 'Full garansi',
      features: [
        'Jutaan template, foto, video & elemen premium',
        'Magic Studio: fitur AI untuk desain & tulisan',
        'Hapus background sekali klik',
        'Brand Kit, resize desain instan & penyimpanan cloud besar',
        'Pakai akun Canva kamu sendiri — desain lama tetap aman',
      ],
      note: 'Aktivasi lewat undangan tim Canva ke email kamu. Jangan keluar dari tim supaya Pro tetap aktif.',
      variants: [
        { id: 'lifetime', label: 'Lifetime (seumur hidup)', sub: 'Sekali bayar, aktif selamanya', price: 30000, original: 769000, needsEmail: true, emailLabel: 'Email akun Canva kamu', default: true },
      ],
    },
    {
      id: 'zoom-pro', aliases: ['zoom', 'zoom meeting', 'zoom pro', 'meeting'],
      logo: 'assets/img/brands/zoom.svg', logoStyle: 'mono',
      name: 'Zoom Pro',
      tagline: 'Meeting online tanpa batas 40 menit',
      category: 'ai',
      icon: 'zap',
      colors: ['#0B5CFF', '#0842C7'],
      tags: ['Hingga 30 jam', '100 peserta'],
      process: '5–15 menit',
      warranty: 'Full garansi',
      features: [
        'Meeting hingga 30 jam, tanpa batas 40 menit',
        'Hingga 100 peserta per meeting',
        'Rekam meeting ke cloud',
        'Zoom AI Companion: ringkasan & catatan otomatis',
        'Whiteboard, breakout room & polling',
      ],
      note: 'Diaktifkan di akun Zoom kamu sendiri. Pastikan email sudah terdaftar di Zoom.',
      variants: [
        { id: '30-hari', label: '30 Hari', sub: 'Pakai akun Zoom kamu', price: 20000, original: 230000, needsEmail: true, emailLabel: 'Email akun Zoom kamu', default: true },
        { id: '1-tahun', label: '1 Tahun', sub: 'Paling hemat untuk rapat rutin', price: 100000, original: 2300000, needsEmail: true, emailLabel: 'Email akun Zoom kamu', tag: 'Hemat' },
      ],
    },
    {
      id: 'scribd-premium', aliases: ['scribd', 'skribd', 'dokumen', 'ebook'],
      logo: 'assets/img/brands/scribd.svg', logoStyle: 'mono',
      name: 'Scribd Premium',
      tagline: 'Baca & download jutaan dokumen tanpa batas',
      category: 'reading',
      icon: 'package',
      colors: ['#1E7B85', '#145A62'],
      tags: ['Download dokumen', 'Tanpa iklan'],
      process: '5–15 menit',
      warranty: 'Full garansi',
      features: [
        'Akses jutaan dokumen, jurnal, makalah & materi kuliah',
        'Download dokumen sepuasnya',
        'Baca tanpa iklan',
        'Simpan & baca offline di aplikasi',
        'Bisa di HP, tablet & web',
      ],
      note: 'Login memakai akun yang kami kirim. Mohon jangan mengubah email atau password.',
      variants: [
        { id: '1-bulan', label: '1 Bulan', sub: 'Akun dari kami, siap login', price: 10000, original: 70000, default: true },
        { id: '1-tahun', label: '1 Tahun', sub: 'Untuk kebutuhan baca setahun', price: 120000, original: 840000, tag: 'Hemat' },
      ],
    },

    // ---- Segera hadir (belum bisa dibeli) ----
    { id: 'netflix', aliases: ['netflix', 'netplix'], name: 'Netflix Premium', tagline: 'Film & series 4K tanpa batas', category: 'streaming', icon: 'tv', colors: ['#E50914', '#9F0710'], logo: 'assets/img/brands/netflix.svg', logoStyle: 'mono', comingSoon: true },
  ];

  /**
   * Kode voucher (huruf besar). type: 'percent' | 'flat'
   * promote: true → kodenya ditampilkan sebagai saran di halaman checkout.
   */
  const VOUCHERS = {
    WAKPREM: { type: 'percent', value: 10, max: 10000, minSubtotal: 30000, label: 'Diskon 10% (maks. Rp10.000)', promote: true },
    HEMAT5K: { type: 'flat', value: 5000, minSubtotal: 50000, label: 'Potongan Rp5.000' },
  };

  /**
   * Metode pembayaran. feePercent / feeFlat = biaya layanan yang dibebankan
   * ke pembeli (isi 0 kalau mau ditanggung toko). `midtrans` = kode
   * enabled_payments di Midtrans Snap.
   * `manual: true` = dipakai di mode 'gopay-qris' (QRIS statis GoPay Merchant,
   * dikonfirmasi admin). Metode lain dipakai di mode 'demo' / 'midtrans'.
   */
  const PAYMENT_METHODS = [
    { id: 'qris-gopay', group: 'qris', name: 'QRIS', short: 'QRIS', color: '#00AED6', desc: 'Scan pakai DANA, OVO, GoPay, ShopeePay, LinkAja & semua m-banking', feePercent: 0, manual: true, recommended: true },
    { id: 'qris', group: 'qris', name: 'QRIS', short: 'QRIS', color: '#111827', desc: 'DANA, OVO, GoPay, ShopeePay, LinkAja & m-banking', feePercent: 0.7, midtrans: ['other_qris'], recommended: true },
    { id: 'gopay', group: 'ewallet', name: 'GoPay', short: 'GoPay', color: '#00AED6', desc: 'Aplikasi Gojek / GoPay', feePercent: 2, midtrans: ['gopay'] },
    { id: 'shopeepay', group: 'ewallet', name: 'ShopeePay', short: 'SPay', color: '#EE4D2D', desc: 'Aplikasi Shopee', feePercent: 2, midtrans: ['shopeepay'] },
    { id: 'bca', group: 'va', name: 'BCA Virtual Account', short: 'BCA', color: '#0060AF', desc: 'm-BCA, KlikBCA, ATM', feeFlat: 4000, midtrans: ['bca_va'], vaPrefix: '12960' },
    { id: 'bni', group: 'va', name: 'BNI Virtual Account', short: 'BNI', color: '#F15A23', desc: 'BNI Mobile, ATM', feeFlat: 4000, midtrans: ['bni_va'], vaPrefix: '8808' },
    { id: 'bri', group: 'va', name: 'BRI Virtual Account', short: 'BRI', color: '#00529C', desc: 'BRImo, ATM', feeFlat: 4000, midtrans: ['bri_va'], vaPrefix: '26215' },
    { id: 'mandiri', group: 'va', name: 'Mandiri Bill Payment', short: 'mandiri', color: '#003D79', desc: 'Livin’ by Mandiri, ATM', feeFlat: 4000, midtrans: ['echannel'], vaPrefix: '70012' },
    { id: 'permata', group: 'va', name: 'Permata Virtual Account', short: 'Permata', color: '#B0182B', desc: 'PermataMobile X, ATM', feeFlat: 4000, midtrans: ['permata_va'], vaPrefix: '8778' },
  ];

  const PAYMENT_GROUPS = { qris: 'QRIS', ewallet: 'E-Wallet', va: 'Virtual Account' };

  const MAX_QTY = 10;

  function findProduct(id) {
    return PRODUCTS.find((p) => p.id === id) || null;
  }
  function findVariant(product, variantId) {
    return (product && product.variants && product.variants.find((v) => v.id === variantId)) || null;
  }
  function findMethod(id) {
    return PAYMENT_METHODS.find((m) => m.id === id) || null;
  }
  function rp(n) {
    return 'Rp' + Math.round(n).toLocaleString('id-ID');
  }

  /** ID pesanan, contoh: WP-261102-AB12C */
  function makeOrderId() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let r = '';
    for (let i = 0; i < 5; i++) r += chars[Math.floor(Math.random() * chars.length)];
    return `WP-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${r}`;
  }

  /**
   * Kode unik (Rp1–299) yang ditambahkan ke total QRIS manual supaya setiap
   * pembayaran mudah dicocokkan di aplikasi GoPay Merchant. `usedTotals` =
   * total pesanan lain yang masih menunggu, supaya nominalnya tidak kembar.
   */
  function pickUniqueCode(baseTotal, usedTotals) {
    const used = new Set(usedTotals || []);
    for (let i = 0; i < 60; i++) {
      const code = 1 + Math.floor(Math.random() * 299);
      if (!used.has(baseTotal + code)) return code;
    }
    return 1 + Math.floor(Math.random() * 299);
  }

  /**
   * Hitung total pesanan. Dipakai di browser & server supaya hasilnya sama.
   * items: [{ productId, variantId, qty, targetEmail }]
   */
  function calcTotals(items, voucherCode, methodId) {
    const lines = [];
    const errors = [];

    for (const it of items || []) {
      const p = findProduct(it.productId);
      const v = findVariant(p, it.variantId);
      if (!p || !v || p.comingSoon) {
        errors.push('Ada produk yang sudah tidak tersedia.');
        continue;
      }
      const qty = v.needsEmail ? 1 : Math.max(1, Math.min(MAX_QTY, parseInt(it.qty, 10) || 1));
      lines.push({
        productId: p.id,
        variantId: v.id,
        name: p.name,
        variantLabel: v.label,
        price: v.price,
        qty,
        total: v.price * qty,
        targetEmail: v.needsEmail ? String(it.targetEmail || '').trim() : '',
      });
    }

    const subtotal = lines.reduce((s, l) => s + l.total, 0);

    let discount = 0;
    let voucher = null;
    let voucherError = null;
    const code = String(voucherCode || '').trim().toUpperCase();
    if (code) {
      const vc = VOUCHERS[code];
      if (!vc) voucherError = 'Kode voucher tidak ditemukan';
      else if (subtotal < (vc.minSubtotal || 0)) voucherError = 'Minimal belanja ' + rp(vc.minSubtotal);
      else {
        discount = vc.type === 'percent' ? Math.floor((subtotal * vc.value) / 100) : vc.value;
        if (vc.max) discount = Math.min(discount, vc.max);
        discount = Math.min(discount, subtotal);
        voucher = { code, label: vc.label };
      }
    }

    const method = findMethod(methodId);
    const base = subtotal - discount;
    let fee = 0;
    if (method && base > 0) fee = Math.ceil((method.feeFlat || 0) + (base * (method.feePercent || 0)) / 100);

    return { lines, subtotal, discount, voucher, voucherError, fee, method, total: base + fee, errors };
  }

  const api = {
    CATEGORIES, PRODUCTS, VOUCHERS, PAYMENT_METHODS, PAYMENT_GROUPS, MAX_QTY,
    findProduct, findVariant, findMethod, calcTotals, rp, makeOrderId, pickUniqueCode,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WAKPREM_CATALOG = api;
})(typeof window !== 'undefined' ? window : globalThis);
