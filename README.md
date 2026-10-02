# 💰 SimpananMu

Aplikasi web pencatatan keuangan pribadi / usaha kecil, dibangun dengan React 19, Redux Toolkit, Tailwind CSS, Recharts, Vite, dan Google Gemini API.

## Fitur

- **Dashboard**: ringkasan pendapatan, pengeluaran, selisih, dan rasio tabungan bulan ini; saldo keseluruhan; grafik arus kas 6 bulan; grafik pengeluaran per kategori; progres anggaran dan target tabungan; transaksi terbaru.
- **Transaksi**: tambah, ubah, dan hapus transaksi dengan kategori dan catatan; pencarian, filter (jenis, kategori, rentang tanggal), pengurutan, paginasi; ekspor dan impor CSV.
- **Anggaran**: batas pengeluaran bulanan per kategori, dengan peringatan bila terlampaui; bisa melihat bulan-bulan sebelumnya.
- **Target Tabungan**: buat target, catat setoran/penarikan, dan lihat estimasi tabungan per bulan sampai tenggat.
- **Laporan**: laporan laba/rugi dengan preset periode, filter jenis dan kategori, rincian per kategori, unduh PDF, atau cetak langsung.
- **AI Buddy 💖**: chat asisten keuangan (Google Gemini) yang membaca data transaksi, anggaran, dan target tabunganmu untuk menyusun rencana hemat, usulan anggaran, dan perhitungan tabungan. Tanpa API key, Buddy tetap menjawab dalam *mode offline* dengan saran otomatis dari datamu.
- **Akun & database**: daftar/masuk dengan email + kata sandi; transaksi, anggaran, target tabungan, dan profil tersimpan per akun di **Upstash Redis**, jadi bisa dibuka dari perangkat mana pun. Perubahan saat offline disimpan dalam antrean dan dikirim begitu koneksi kembali. Data lama di browser (versi sebelumnya) ditawarkan untuk dipindahkan ke akun saat pertama masuk.

## Menjalankan

```bash
npm install
npm run dev      # server pengembangan
npm run build    # build produksi ke folder dist/
npm run lint     # pemeriksaan ESLint
```

## Desain

Tampilan mengikuti design system **Candy Chic Ledger**: kanvas krem hangat, aksen candy pink / peach / lilac, kartu berbentuk pil dengan bayangan blush, dan font Plus Jakarta Sans. Token desain (warna, tipografi, radius, bayangan) didefinisikan di `tailwind.config.js`, komponen dasar di `src/components/ui.jsx`, dan ikon memakai `lucide-react`. Di ponsel navigasi berupa dock bawah; di desktop berupa menu pil di header.

## Database (Upstash Redis)

Pola yang sama dengan project Gudang-Document: Upstash Redis diakses lewat REST API (`api/_lib/redis.js`), tanpa SDK.

1. Vercel → project → **Storage → Create Database → Upstash for Redis → Connect**. `KV_REST_API_URL` dan `KV_REST_API_TOKEN` terisi otomatis.
2. Redeploy. Selesai: halaman masuk muncul, dan setiap akun mulai dengan data kosong.

Lokal: salin `.env.example` menjadi `.env.local` lalu isi `KV_REST_API_URL` dan `KV_REST_API_TOKEN` dari dashboard Upstash (tab REST API), kemudian `npm run dev`.

Struktur kunci di Redis:

| Kunci | Isi |
|---|---|
| `simpananmu:users` | hash email → akun (nama, salt, hash scrypt kata sandi) |
| `simpananmu:session:{token}` | email pemilik sesi, kedaluwarsa 30 hari |
| `simpananmu:u:{email}:tx` / `:budgets` / `:goals` | hash per item (transaksi, anggaran per kategori, target) |
| `simpananmu:u:{email}:profile` | nama panggilan |
| `simpananmu:buddy:{email}:{tanggal}` | jumlah pertanyaan AI Buddy hari itu |

API: `POST /api/auth` (register, login, logout, me, password), `GET/POST /api/data` (ambil semua data / kirim operasi put-del-clear), `POST /api/chat` (AI Buddy, wajib login).

## Mengaktifkan AI Buddy

Fitur chat memanggil Google Gemini API lewat fungsi serverless `api/chat.js`, jadi API key tidak pernah terkirim ke browser.

1. Buat API key gratis di [Google AI Studio](https://aistudio.google.com/apikey).
2. Lokal: salin `.env.example` menjadi `.env.local`, isi `GEMINI_API_KEY`, lalu `npm run dev`.
3. Vercel: tambahkan `GEMINI_API_KEY` di **Project Settings → Environment Variables**, lalu redeploy.

Model default adalah `gemini-flash-latest` (selalu mengikuti model Flash terbaru dari Google). Untuk memakai model lain, isi `GEMINI_MODEL`. Tier gratis Gemini punya batas jumlah permintaan per menit dan per hari; jika habis, Buddy menampilkan pesan untuk mencoba lagi nanti. Pada tier gratis, Google dapat memakai isi percakapan untuk meningkatkan produknya (lihat ketentuan Gemini API).

Data keuangan ringkas (total bulanan, kategori, anggaran, target, 15 transaksi terakhir) dikirim ke Google Gemini bersama setiap pertanyaan. Buddy hanya untuk pengguna yang sudah masuk, dengan batas `BUDDY_DAILY_LIMIT` pertanyaan per akun per hari (default 30).

## Deploy ke Vercel

Repo sudah berisi `vercel.json` (build Vite, fallback SPA, fungsi `api/chat.js`).

1. Buka [vercel.com/new](https://vercel.com/new) lalu impor repo `SimpananMu` dari GitHub.
2. Framework terdeteksi sebagai **Vite**; biarkan pengaturan build default.
3. Hubungkan **Upstash for Redis** (lihat bagian Database), tambahkan environment variable `GEMINI_API_KEY`, lalu klik **Deploy**.

Setelah terhubung, setiap push ke `main` otomatis ter-deploy dan setiap pull request mendapat preview URL.

## Format CSV

Impor menerima file dengan header berikut (sama seperti hasil ekspor):

```
tanggal,deskripsi,kategori,jenis,nominal,catatan
2026-10-01,Penjualan Produk A,Penjualan,income,2500000,
```

`jenis` bernilai `income` (pendapatan) atau `expense` (pengeluaran); `tanggal` berformat `YYYY-MM-DD`.

## Struktur

```
src/
  components/   Halaman (Dashboard, TransactionList, BudgetPlanner, SavingsGoals, ReportGenerator, AiBuddy) dan komponen UI
  store/        Redux slice (transaksi, anggaran & target, profil) dan sinkronisasi ke /api/data
  utils/        Fungsi format Rupiah/tanggal, filter, ringkasan, CSV, dan konteks/saran AI
api/
  auth.js       Daftar, masuk, keluar, ganti kata sandi
  data.js       Data keuangan per akun
  chat.js       AI Buddy (Gemini)
  _lib/         Klien Upstash REST, sesi, helper HTTP
```
