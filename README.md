# 💰 SimpananMu

Aplikasi web pencatatan keuangan pribadi / usaha kecil, dibangun dengan React 19, Redux Toolkit, Tailwind CSS, Recharts, dan Vite.

## Fitur

- **Dashboard**: ringkasan pendapatan, pengeluaran, selisih, dan rasio tabungan bulan ini; saldo keseluruhan; grafik arus kas 6 bulan; grafik pengeluaran per kategori; progres anggaran dan target tabungan; transaksi terbaru.
- **Transaksi**: tambah, ubah, dan hapus transaksi dengan kategori dan catatan; pencarian, filter (jenis, kategori, rentang tanggal), pengurutan, paginasi; ekspor dan impor CSV.
- **Anggaran**: batas pengeluaran bulanan per kategori, dengan peringatan bila terlampaui; bisa melihat bulan-bulan sebelumnya.
- **Target Tabungan**: buat target, catat setoran/penarikan, dan lihat estimasi tabungan per bulan sampai tenggat.
- **Laporan**: laporan laba/rugi dengan preset periode, filter jenis dan kategori, rincian per kategori, unduh PDF, atau cetak langsung.
- **Penyimpanan lokal**: semua data tersimpan otomatis di `localStorage` browser.

## Menjalankan

```bash
npm install
npm run dev      # server pengembangan
npm run build    # build produksi ke folder dist/
npm run lint     # pemeriksaan ESLint
```

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
  components/   Halaman (Dashboard, TransactionList, BudgetPlanner, SavingsGoals, ReportGenerator) dan komponen UI
  store/        Redux slice: transaksi, anggaran & target tabungan, serta persistensi localStorage
  utils/        Fungsi format Rupiah/tanggal, filter, ringkasan, dan CSV
```
