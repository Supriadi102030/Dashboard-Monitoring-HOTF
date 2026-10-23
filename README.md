# Portfolio Quality Monitoring — Jawa 2

Dashboard HTML/JavaScript untuk monitoring kualitas portofolio **Regional Jawa 2**. Data belum disertakan karena belum ada file data aktual yang diunggah; dashboard tidak menggunakan angka contoh/fiktif.

## Filter dashboard
- Tanggal snapshot (default: snapshot terbaru)
- Regional (default otomatis ke `Jawa 2` jika tersedia)
- Area
- Branch
- Segment `NTB` / `ETB`

Dashboard hanya memuat baris Regional Jawa 2 saat CSV di-upload. Isi kolom `regional` dengan `Jawa 2` secara konsisten.

## Cara menggunakan
1. Upload folder/file dari ZIP ini ke repository GitHub.
2. Aktifkan GitHub Pages melalui **Settings → Pages → Deploy from a branch → main → /(root)**.
3. Buka dashboard, lalu pilih **Upload data CSV** untuk memuat snapshot aktual.
4. Untuk update harian, ekspor snapshot baru dari Superset/DWH sesuai template lalu upload di browser. Jika ingin dataset tersedia otomatis bagi semua pengguna dashboard, commit/append file CSV terbaru ke repository. Dashboard saat ini belum memiliki koneksi langsung/otomatis ke DWH.

## Format CSV
Gunakan `data/portfolio_daily_template.csv` sebagai header:

| Kolom | Definisi |
|---|---|
| `snapshot_date` | Tanggal snapshot `YYYY-MM-DD` |
| `regional` | Isi `Jawa 2` |
| `area` | Nama area di bawah Regional Jawa 2 |
| `branch` | Nama cabang/branch |
| `borrower_id` | ID unik Mitra/peminjam yang konsisten |
| `dpd` | DPD numerik pada snapshot |
| `ntb_etb` | `NTB` atau `ETB` sesuai definisi internal |
| `current_flag` | `1` jika Mitra berstatus lancar/current, selain itu `0` |
| `paid_flag` | `1` jika Mitra memenuhi definisi paid pada periode ukur, selain itu `0` |
| `due_amount` | Nilai tagihan yang menjadi denominator RR DPD 0 |
| `paid_amount` | Nilai pembayaran yang diakui pada tagihan terkait |
| `outstanding` | Outstanding pada tanggal snapshot |

Satu baris idealnya mewakili satu Mitra per tanggal snapshot. Jika data sumber berada pada level pinjaman/fasilitas, agregasikan atau sesuaikan deduplikasi agar MTU tidak terhitung ganda.

## Metrik
- Current Paid / Mitra Lancar: jumlah Mitra unik dengan `current_flag = 1`.
- DPD 0, 1–30, 31–60, 61–90, 90+: bucket DPD yang saling eksklusif.
- NTB/ETB: jumlah Mitra, current, distribusi DPD, outstanding, RR, % paid, dan PQI per segment.
- `RR DPD 0` sementara dihitung sebagai total `paid_amount` pada DPD 0 dibagi total `due_amount` pada DPD 0.
- `% Mitra Paid` sementara dihitung sebagai Mitra `paid_flag = 1` di antara Mitra dengan DPD 0–60.
- `PQI = (50% × RR DPD 0) + (50% × % Mitra Paid)`.
- PQI sehat jika `>= 0,92`; target acuan RR DPD 0 = 98% dan Mitra Paid = 85%.

**Validasi wajib:** gambar acuan tidak menetapkan secara lengkap denominator RR, periode paid, perlakuan pembayaran parsial, atau aturan NTB/ETB. Konfirmasi definisi dengan owner metrik sebelum digunakan sebagai laporan resmi.

## Privasi
Jangan unggah data sensitif ke repository publik. Gunakan repository private dan ID Mitra yang disetujui perusahaan. File yang di-upload lewat browser diproses lokal dan tidak dikirim ke server oleh dashboard ini.


### File structure
- `index.html`: dashboard layout and styles.
- `app.js`: dashboard logic, CSV parsing, filters, metric calculations, and rendering.
- `data/portfolio_daily.csv`: dataset location/template for the daily portfolio snapshot.
