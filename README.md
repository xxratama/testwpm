# Wak Prem — wakprem.com

Website toko aplikasi premium dengan katalog, keranjang, checkout, dan pembayaran **langsung di website** (QRIS, GoPay, ShopeePay, Virtual Account) — tanpa lempar ke WhatsApp.

## Isi folder

```
index.html               ← halaman utama (satu halaman, semua fitur)
admin.html               ← INBOX CS: admin membalas live chat pelanggan
assets/css/style.css     ← desain (warna, font, layout, mode gelap)
assets/css/admin.css     ← desain halaman Inbox CS
assets/js/config.js      ← PENGATURAN TOKO: jam operasional, mode live chat, mode pembayaran
assets/js/catalog.js     ← KATALOG: produk, harga, paket, voucher, metode bayar & biaya
assets/js/chat.js        ← widget Chat CS (asisten otomatis + sambung ke admin)
assets/js/livechat.js    ← koneksi live chat (demo / server)
assets/js/orders.js      ← koneksi pesanan QRIS kriskris / GoPay (demo / server)
assets/js/admin.js       ← logika Inbox CS
assets/js/app.js         ← logika website (tidak perlu diubah)
api/                     ← server pesanan, kriskris, live chat & Midtrans (Vercel serverless)
```

## Fitur

- Katalog dengan filter kategori, pencarian, badge, harga coret, dan kartu "Segera hadir"
- Detail produk (sheet) — pilih paket, jumlah, link produk bisa dibagikan (`wakprem.com/#/produk/spotify-premium`)
- Keranjang, checkout dengan validasi form, email akun tujuan (untuk paket upgrade akun sendiri), voucher, biaya layanan per metode
- Halaman pembayaran: QRIS / VA, hitung mundur, salin nominal / nomor VA, simpan QR
- Halaman status pesanan dengan timeline, cek pesanan dengan ID, bukti bisa dicetak / disimpan PDF
- **Chat CS** di halaman awal: asisten otomatis 24 jam + tombol **Sambungkan ke admin** untuk live chat langsung di website
- **Inbox CS** (`/admin.html`) untuk admin membalas chat — bisa dari HP, ada notifikasi & balasan cepat
- Mode terang & gelap, responsif penuh (HP, tablet, desktop)

## Cara coba di komputer

Butuh server lokal sederhana (jangan dobel-klik `index.html`):

```bash
npx serve .
```

Lalu buka alamat yang muncul (misalnya http://localhost:3000).

## Menambah / mengubah produk

Buka `assets/js/catalog.js`, salin salah satu blok produk, lalu ubah:

| Kolom | Keterangan |
|---|---|
| `id` | unik, huruf kecil-strip, dipakai di link produk |
| `name`, `tagline`, `tags`, `features`, `note` | teks yang tampil |
| `category` | `ai`, `music`, `editing`, `streaming` (atau tambah di `CATEGORIES`) |
| `icon`, `colors` | ikon & 2 warna gradasi kartu |
| `badge` | label kecil, mis. `Terlaris` (opsional) |
| `variants` | daftar paket: `label`, `sub`, `price`, `original` (harga coret, opsional), `tag`, `default` |
| `needsEmail: true` | pembeli wajib isi email akun tujuan (paket upgrade akun sendiri) |
| `comingSoon: true` | tampil sebagai "Segera hadir", belum bisa dibeli |

### Logo produk

Logo disimpan di `assets/img/brands/` dan dipasang lewat kolom `logo` + `logoStyle` di `catalog.js`:
- `logoStyle: 'mono'` → logo jadi putih di atas warna brand (cocok untuk file logo satu warna)
- `logoStyle: 'color'` → logo asli berwarna di atas kotak putih (cocok untuk file logo resmi berwarna, PNG/SVG)

Sumber logo (semua berlisensi terbuka):
- Gemini, Apple Music, Spotify, Netflix, YouTube — [Simple Icons](https://simpleicons.org) v16.32.0 (CC0)
- ChatGPT, CapCut — [theSVG](https://github.com/glincker/thesvg) via Iconify (MIT)
- Canva — [Boxicons](https://boxicons.com) via Iconify (MIT)

Mau ganti dengan logo resmi berwarna dari press kit brand? Simpan filenya di folder itu, ubah `logo:` ke nama file baru, dan set `logoStyle: 'color'`.

Logo dipakai untuk menunjukkan produk yang dijual; merek tetap milik pemiliknya (sudah ada disclaimer di footer). Jangan pakai logo dengan cara yang terkesan sebagai mitra/toko resmi.

> ⚠️ Harga jual dan harga coret (`original`) yang ada sekarang hanya contoh. **Sesuaikan dengan harga kamu dan cek ulang harga resmi** sebelum go-live.

## Pembayaran QRIS otomatis lewat kriskris (mode sekarang)

`config.js` → `payment.mode: 'kriskris'`. Tiap pesanan dibuatkan **tagihan QRIS** di [kriskris.id](https://kriskris.id/panduan) yang terhubung ke outlet GoBiz kamu. QR-nya sudah berisi nominal, uang masuk langsung ke GoPay Merchant, dan pesanan berubah jadi **lunas otomatis**, tanpa perlu dicek manual.

**Alurnya:**
1. Pembeli checkout → server menghitung harga, lalu membuat tagihan di kriskris. Kriskris menambahkan **kode unik Rp10–99** (mis. Rp110.000 → **Rp110.050**).
2. Halaman bayar menampilkan QR dari kriskris + nominal + hitung mundur **15 menit** (batas dari kriskris).
3. Begitu dibayar, kriskris mengirim **callback** → pesanan jadi **Lunas**. Halaman pembeli pindah sendiri ke "Pembayaran berhasil!". Sebagai cadangan kalau callback telat, server juga menanyakan status ke kriskris (paling sering tiap 10 detik per pesanan) saat halaman pembeli mengecek.
4. Kamu dapat notifikasi (bunyi di `/admin.html`, dan Telegram kalau diatur). Pesanan muncul di **tab Pesanan → "Perlu dikirim"**.
5. Kirim akun ke email pembeli → klik **Akun sudah dikirim**.

Pembeli yang terlanjur bayar **setelah** tagihan kedaluwarsa bisa klik **Saya sudah bayar** di halaman pesanannya. Pesanan masuk ke tab **"Telat bayar"** untuk kamu cek manual di GoPay Merchant. Membatalkan pesanan yang belum dibayar dari admin juga membatalkan tagihannya di kriskris.

**Setup kriskris:**
1. Aktifkan server dulu (lihat **Mengaktifkan server** di bawah). Kriskris butuh `server: 'api'` karena API key tidak boleh ada di browser.
2. Dashboard kriskris → merchant kamu → tab **GoBiz**: hubungkan outlet GoPay Merchant.
3. Tab **Umum → API key**: isi label (mis. `wakprem produksi`) → **Buat key**. Salin **API key** dan **API secret** (hanya tampil sekali).
4. Tab **Umum → Callback**: isi URL `https://wakprem.com/api/kriskris-callback` → **Simpan callback**. Salin **secret callback** yang muncul (hanya tampil sekali).
5. Di Vercel → Settings → Environment Variables, tambahkan:

   | Nama | Isi |
   |---|---|
   | `KRISKRIS_API_KEY` | API key dari langkah 3 |
   | `KRISKRIS_API_SECRET` | API secret dari langkah 3 |
   | `KRISKRIS_CALLBACK_SECRET` | secret callback dari langkah 4 |
   | `SITE_URL` | `https://wakprem.com` (untuk link di notifikasi Telegram) |

6. Deploy ulang, lalu di dashboard kriskris klik **Kirim test**. Harus berhasil (server membalas 200).
7. Coba beli produk termurah dan bayar sungguhan untuk memastikan status berubah otomatis.

Kalau env `KRISKRIS_API_KEY` / `KRISKRIS_API_SECRET` belum diisi, server otomatis kembali ke QRIS statis manual (bagian berikut).

> Selama `server: 'demo'`, QR di halaman bayar hanya **tiruan** (tidak bisa dibayar). Untuk mencoba alurnya, buka `/admin.html#pesanan` di tab lain lalu klik **Tandai lunas**. Halaman pembeli akan lanjut otomatis.

**Batasan kriskris yang perlu diingat:** tagihan berlaku 15 menit; minimal Rp1.000; maksimal 60 request/menit per API key; kuota gratis 50 transaksi/bulan, setelah itu pakai kredit/deposit (lihat harga di kriskris.id). Kalau kuota habis atau GoBiz terputus, checkout menampilkan pesan "Pembayaran QRIS sedang tidak tersedia/gangguan". Cek dashboard kriskris kalau itu terjadi.

## Alternatif: QRIS statis GoPay Merchant (konfirmasi manual)

`config.js` → `payment.mode: 'gopay-qris'`. Pembeli membayar ke **QRIS statis toko kamu** dari aplikasi GoPay Merchant (GoBiz), lalu kamu konfirmasi manual. Tidak perlu daftar payment gateway lain.

**Alurnya:**
1. Pembeli checkout → website membuat pesanan dengan **kode unik** (Rp1–299 ditambahkan ke total, mis. Rp40.000 → **Rp40.123**) supaya tiap pembayaran mudah dicocokkan.
2. Halaman bayar menampilkan QRIS toko + nominal persis + hitung mundur (30 menit). Pembeli scan dari e-wallet / m-banking apa saja, lalu klik **Saya sudah bayar**.
3. Pesanan masuk ke **`/admin.html` → tab Pesanan → "Perlu dicek"** (ada bunyi + notifikasi, dan Telegram kalau diatur).
4. Cocokkan nominal persis di riwayat transaksi aplikasi GoPay Merchant → klik **Konfirmasi lunas**. Halaman pesanan pembeli langsung berubah jadi "Pembayaran dikonfirmasi!".
5. Kirim akun ke email pembeli (email akun tujuan tertera di kartu pesanan) → klik **Akun sudah dikirim**.

Tombol lain di kartu pesanan: **Belum masuk** (kembalikan ke belum bayar), **Batalkan**, dan **Tandai lunas** untuk pesanan kedaluwarsa yang ternyata dibayar telat.

**Memasang QRIS kamu:**
1. Buka aplikasi GoPay Merchant → menu **QRIS** → **Unduh / Bagikan QRIS**.
2. Potong gambarnya supaya hanya kotak QR (+ nama toko) yang terlihat, simpan sebagai `assets/img/qris-gopay.png`.
3. Sesuaikan `payment.qris.merchantName` di `config.js` dengan nama toko yang muncul saat QR di-scan.

Selama gambar belum dipasang, halaman bayar menampilkan kotak "QRIS belum dipasang".

> Saat sudah online, ubah `server: 'api'` di `config.js` (lihat bagian **Mengaktifkan server** di bawah) supaya pesanan tersimpan di server dan bisa kamu konfirmasi dari HP mana pun. Di mode `'demo'` pesanan hanya tersimpan di browser yang sama.

## Mengaktifkan server (pesanan & live chat)

1. Deploy folder ini ke [Vercel](https://vercel.com) (gratis): upload ke GitHub → Import di Vercel. Folder `api/` otomatis jadi server.
2. Di Vercel → **Storage / Marketplace → Upstash Redis** → buat database gratis dan hubungkan ke project. Env `KV_REST_API_URL` & `KV_REST_API_TOKEN` (atau `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`) terisi otomatis.
3. Tambahkan Environment Variable `ADMIN_PASSWORD` = password untuk masuk `/admin.html` (buat yang panjang & sulit ditebak).
4. (Opsional) `ORDER_EXPIRY_MINUTES` = batas waktu bayar QRIS manual di server (default 30, samakan dengan `payment.expiryMinutes`).
   Pakai kriskris? Tambahkan juga env `KRISKRIS_*` (lihat bagian kriskris di atas).
5. Di `assets/js/config.js` ubah `server: 'api'`, lalu deploy ulang.
6. Hubungkan domain `wakprem.com` di Vercel → Settings → Domains.

## Alternatif: pembayaran otomatis lewat Midtrans

Kalau nanti punya akun Midtrans, pembayaran bisa otomatis tanpa konfirmasi manual (`payment.mode: 'midtrans'`).

1. Daftar di [midtrans.com](https://midtrans.com) dan lengkapi verifikasi bisnis. Aktifkan metode QRIS, GoPay, ShopeePay, dan VA di dashboard.
2. Deploy ke Vercel (lihat **Mengaktifkan server**).
3. Di Vercel → Settings → Environment Variables, isi:
   - `MIDTRANS_SERVER_KEY` = Server Key dari dashboard Midtrans
   - `MIDTRANS_IS_PRODUCTION` = `true` (kosongkan selama masih tes di sandbox)
4. Di `assets/js/config.js` ubah:
   ```js
   mode: 'midtrans',
   midtransClientKey: 'Mid-client-xxxx',
   midtransProduction: true,
   ```
Tes dulu dengan key **sandbox** (`SB-Mid-...`, `midtransProduction: false`) memakai simulator pembayaran Midtrans.

### Memproses pesanan

Setiap pesanan yang dibayar muncul di **dashboard Midtrans** (Transactions) lengkap dengan nama, email, WhatsApp, produk, dan email akun tujuan (kolom *custom field 1*). Aktifkan notifikasi email di Midtrans supaya kamu langsung tahu ada pesanan masuk, lalu kirim detail akun ke email pembeli.


## Live chat dengan admin

Pengunjung klik **Tanya CS → Sambungkan ke admin**, isi nama (dan email/WA opsional), lalu chat langsung dengan admin di website. Admin membalas dari **`wakprem.com/admin.html`** (buka di HP/laptop, bisa di-bookmark ke layar utama).

Di Inbox CS admin bisa:
- melihat daftar chat aktif/selesai, jumlah belum dibaca, dan pencarian
- membaca percakapan pengunjung dengan asisten otomatis sebelum tersambung
- memakai balasan cepat (bisa diubah di `QUICK_REPLIES` dalam `assets/js/admin.js`)
- menandai chat selesai — pengunjung otomatis kembali ke asisten
- notifikasi browser + bunyi saat ada pesan baru (klik ikon lonceng)

### Mencoba (mode demo)

Saat ini `server` di `config.js` = `'demo'`: chat hanya tersimpan di browser yang sama. Buka website di satu tab dan `/admin.html` di tab lain, lalu coba chat bolak-balik.

### Mengaktifkan live chat asli

Ikuti **Mengaktifkan server** di atas, lalu buka `wakprem.com/admin.html` dan masuk dengan `ADMIN_PASSWORD`.

**Notifikasi ke Telegram (opsional, disarankan)** — supaya HP kamu bunyi setiap ada chat masuk **atau pembeli klik "Saya sudah bayar"**, walau halaman admin tidak dibuka:
1. Chat [@BotFather](https://t.me/BotFather) di Telegram → `/newbot` → salin token bot.
2. Kirim pesan apa saja ke bot kamu, lalu buka `https://api.telegram.org/bot<TOKEN>/getUpdates` dan salin angka `chat.id`.
3. Isi env `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, dan `SITE_URL` = `https://wakprem.com`. Notifikasi berisi isi pesan / detail pesanan + link langsung ke halaman admin.

Percakapan disimpan 30 hari. Ada batas anti-spam: maks. 10 chat baru per jam per IP dan 20 pesan per menit per percakapan.

## Pengaturan lain (`config.js`)

- `operationalHours` — jam admin online (tampil di Chat CS, FAQ & status pesanan)
- `server` — `'demo'` (simpan di browser) atau `'api'` (simpan di server)
- `payment.mode` — `'gopay-qris'`, `'midtrans'`, atau `'demo'`; `payment.qris` — gambar & nama QRIS
- `payment.expiryMinutes` — batas waktu pembayaran
- `liveChat.pollMs` — seberapa sering cek pesan baru
