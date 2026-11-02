/**
 * PENGATURAN TOKO WAK PREM
 * Ubah nilai di bawah sesuai data toko kamu.
 */
window.WAKPREM_CONFIG = {
  storeName: 'Wak Prem',
  domain: 'wakprem.com',

  supportEmail: 'halo@wakprem.com',
  operationalHours: '08.00–23.00 WIB', // jam admin online (dipakai chat CS & halaman pesanan)

  /**
   * Tempat menyimpan pesanan & live chat:
   * 'demo' → disimpan di browser ini saja. Untuk mencoba, buka /admin.html di
   *          tab lain (browser yang sama) untuk konfirmasi pesanan & balas chat.
   * 'api'  → lewat server (folder api/ + Upstash Redis). Wajib saat sudah online.
   *          Lihat README.
   */
  server: 'api',

  liveChat: {
    pollMs: 3000, // seberapa sering cek pesan baru (ms)
  },

  payment: {
    /**
     * 'kriskris'   → QRIS otomatis lewat kriskris.id (outlet GoBiz). QR berisi nominal,
     *                lunas terdeteksi otomatis. Wajib server: 'api' + env KRISKRIS_* (lihat README).
     *                Selama server: 'api', QR-nya tiruan & "lunas" disimulasikan dari /admin.html.
     * 'gopay-qris' → QRIS statis dari aplikasi GoPay Merchant. Pembeli bayar
     *                dengan nominal unik, lalu admin konfirmasi di /admin.html.
     * 'midtrans'   → pembayaran otomatis lewat Midtrans (perlu akun Midtrans).
     * 'demo'       → pembayaran simulasi (untuk coba-coba).
     */
    mode: 'kriskris',

    qris: {
      // Khusus 'gopay-qris': simpan gambar QRIS dari aplikasi GoPay Merchant (menu QRIS → Unduh/Bagikan)
      // ke file ini. Potong supaya hanya kotak QR + nama toko yang terlihat.
      image: 'assets/img/qris-gopay.png',
      merchantName: 'Wak Prem', // nama toko yang muncul saat pembeli scan
    },

    expiryMinutes: 30, // batas waktu bayar QRIS manual (samakan dengan env ORDER_EXPIRY_MINUTES); kriskris selalu 15 menit

    // Khusus mode 'midtrans'
    midtransClientKey: '',      // contoh: 'SB-Mid-client-xxxx' (sandbox) / 'Mid-client-xxxx' (production)
    midtransProduction: false,  // true kalau sudah pakai key production
    apiBase: '/api',
  },
};
