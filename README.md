# 💰 SimpananMu

Aplikasi web pencatatan keuangan pribadi / usaha kecil, dibangun dengan React 19, Redux Toolkit, Tailwind CSS, Recharts, Vite, dan Google Gemini API.

## Fitur

- **Dashboard**: ringkasan pendapatan, pengeluaran, selisih, dan rasio tabungan bulan ini; saldo keseluruhan; grafik arus kas 6 bulan; grafik pengeluaran per kategori; progres anggaran dan target tabungan; transaksi terbaru.
- **Transaksi**: tambah, ubah, dan hapus transaksi dengan kategori dan catatan; pencarian, filter (jenis, kategori, rentang tanggal), pengurutan, paginasi; ekspor dan impor CSV.
- **Anggaran**: batas pengeluaran bulanan per kategori, dengan peringatan bila terlampaui; bisa melihat bulan-bulan sebelumnya.
- **Target Tabungan**: buat target, catat setoran/penarikan, dan lihat estimasi tabungan per bulan sampai tenggat.
- **Laporan**: laporan laba/rugi dengan preset periode, filter jenis dan kategori, rincian per kategori, unduh PDF, atau cetak langsung.
- **AI Buddy 💖**: chat asisten keuangan (Google Gemini) yang membaca data transaksi, anggaran, dan target tabunganmu untuk menyusun rencana hemat, usulan anggaran, dan perhitungan tabungan. Tanpa API key, Buddy tetap menjawab dalam *mode offline* dengan saran otomatis dari datamu.
- **Penyimpanan lokal**: semua data tersimpan otomatis di `localStorage` browser.

## Menjalankan

```bash
npm install
npm run dev      # server pengembangan
npm run build    # build produksi ke folder dist/
npm run lint     # pemeriksaan ESLint
```

## Mengaktifkan AI Buddy

Fitur chat memanggil Google Gemini API lewat fungsi serverless `api/chat.js`, jadi API key tidak pernah terkirim ke browser.

1. Buat API key gratis di [Google AI Studio](https://aistudio.google.com/apikey).
2. Lokal: salin `.env.example` menjadi `.env.local`, isi `GEMINI_API_KEY`, lalu `npm run dev`.
3. Vercel: tambahkan `GEMINI_API_KEY` di **Project Settings → Environment Variables**, lalu redeploy.

Model default adalah `gemini-flash-latest` (selalu mengikuti model Flash terbaru dari Google). Untuk memakai model lain, isi `GEMINI_MODEL`. Tier gratis Gemini punya batas jumlah permintaan per menit dan per hari; jika habis, Buddy menampilkan pesan untuk mencoba lagi nanti. Pada tier gratis, Google dapat memakai isi percakapan untuk meningkatkan produknya (lihat ketentuan Gemini API).

Data keuangan ringkas (total bulanan, kategori, anggaran, target, 15 transaksi terakhir) dikirim ke Google Gemini bersama setiap pertanyaan. Endpoint belum memiliki autentikasi atau rate limit, jadi siapa pun yang tahu URL-nya bisa memakai kuota API-mu; tambahkan proteksi sebelum dibagikan luas.

## Deploy ke Vercel

Repo sudah berisi `vercel.json` (build Vite, fallback SPA, fungsi `api/chat.js`).

1. Buka [vercel.com/new](https://vercel.com/new) lalu impor repo `SimpananMu` dari GitHub.
2. Framework terdeteksi sebagai **Vite**; biarkan pengaturan build default.
3. Tambahkan environment variable `GEMINI_API_KEY`, lalu klik **Deploy**.

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
  store/        Redux slice: transaksi, anggaran & target tabungan, serta persistensi localStorage
  utils/        Fungsi format Rupiah/tanggal, filter, ringkasan, CSV, dan konteks/saran AI
api/
  chat.js       Fungsi serverless (Vercel) untuk AI Buddy
```
