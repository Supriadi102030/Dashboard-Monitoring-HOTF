# Portfolio Quality Monitoring — Jawa 2

Static dashboard for GitHub Pages built from the five daily Excel inputs:
- current_27 okt
- daily kp_27 okt
- 31-60_27 okt
- 61-90_27 okt
- 90+_27 okt

## Upload to GitHub Pages
1. Extract the ZIP.
2. Upload the contents of this folder to the root of your GitHub repository.
3. In Settings → Pages, select Deploy from a branch → `main` → `/(root)`.
4. Open the published GitHub Pages URL.

## Files
- `index.html`: dashboard UI
- `app.js`: charts, filters, aggregation display
- `data/data.json`: branch-level portfolio and disbursement aggregates
- `data/branch_summary.csv`: branch portfolio summary
- `data/disbursement_by_branch.csv`: disbursement summary by branch

## Data logic
- The four DPD files are combined and deduplicated by `loan_id`; when duplicate IDs exist, the current file takes precedence.
- Current DPD bucket is determined by `dpd_new`, not by the filename.
- Loans with `loan_state = CLOSED` are excluded from Active Loan headline metrics.
- `Paid NOA` uses `payment_min_1x = Yes`; the dashboard's RR flag is Paid NOA / Active NOA and is a provisional indicator, not guaranteed to match the official RR definition.
- Disbursement status and plafond come from the Daily KP file. Pipeline plafond must not be interpreted as fully disbursed amount.
- Data is aggregated to branch level; customer names, phone numbers, and customer identifiers are not included in the dashboard JSON.

## Daily refresh
Replace `data/data.json` and the CSV summary files with freshly processed outputs from the latest five Excel files. The dashboard does not automatically ingest Excel files in GitHub Pages.


## Tambahan BP Breakdown dan Target DPD
- `data/data.json` kini mencakup agregasi per BP (`bps`) berdasarkan Regional, Area, Branch, dan nama/ID BP.
- Target: DPD 0 = 98%; DPD 1–30 = 55%; DPD 31–60 = 13%.
- Target Paid Mitra = pembulatan ke atas (mitra unik pada bucket × target).
- Gap Mitra = maksimum(Target Paid Mitra − Paid Mitra, 0).
- DPD 61–90 dan DPD 90+ tidak diberi target; pembayaran mitra ditampilkan sebagai kontribusi positif.
- Paid Mitra dihitung sebagai customer_number unik dengan `payment_min_1x = Yes` pada bucket tersebut.
- Data saat ini adalah snapshot 25–27 Oktober 2026. Perbandingan/pergerakan antar-minggu membutuhkan file snapshot dari minggu sebelumnya.
- Sebelum mengunggah ke repository publik, pastikan nama/ID BP dan metrik operasional boleh dipublikasikan. Jika tidak, gunakan repository private atau hilangkan identitas BP.


## Branch Performance, PQI, dan Status
- Branch Performance dan BP Breakdown memakai header bertingkat: Total Pinjaman, Aktif/Terbayar, Rate, Gap, PQI.
- PQI Branch = 50% × RR DPD 0 + 50% × RR DPD 0–60.
- RR DPD 0–60 = total Paid NOA pada DPD 0, 1–30, dan 31–60 dibagi total NOA pada tiga bucket tersebut.
- Status: PQI > 91,5% dan NOA/BP > 40 = Aspiration; PQI > 91,5% dan NOA/BP >= 15 = Emerging Performer; PQI > 91,5% dan NOA/BP < 15 = Under Perform Sale; PQI <= 91,5% dan NOA/BP >= 15 = Under Perform Collection; selain itu = Need Turnaround.
- Perhitungan NOA/BP sementara menggunakan Active Loan / jumlah BP unik per branch karena file sumber portfolio tidak memuat field NOA/BP resmi yang terverifikasi. Validasi sebelum digunakan sebagai klasifikasi resmi.


## Daily Update (refresh dari Excel terbaru)
ZIP juga menyertakan `update_daily.py`, `Update_Daily_Data.bat`, `requirements.txt`, dan folder `input`.
1. Simpan lima file Excel terbaru ke folder `input` dengan nama persis: `current.xlsx`, `daily_kp.xlsx`, `31-60.xlsx`, `61-90.xlsx`, dan `90+.xlsx` (hapus/replace file placeholder jika ada).
2. Jalankan `Update_Daily_Data.bat` di Windows. Script mengolah data dan memperbarui `Portfolio_Quality_Monitoring_GitHub/data/data.json`.
3. Upload/replace folder `data` (minimal `data.json`) pada repository GitHub yang dipakai GitHub Pages.
4. Tunggu deployment selesai lalu refresh dashboard.
Catatan: GitHub Pages bersifat static dan tidak bisa menulis balik ke repository secara langsung dari browser. Karena itu, pembaruan tidak terjadi otomatis hanya dengan membuka dashboard. Script ini membuat proses refresh harian lebih mudah, tetapi pengguna tetap perlu mengunggah hasilnya ke GitHub. Jangan unggah data pribadi/PII ke repository publik.


## Koreksi Tampilan Dashboard
- PQI hanya ditampilkan dan dihitung pada level Branch, tidak pada tabel BP.
- Kolom Status Branch dipindahkan menjadi kolom pertama pada tabel Branch Performance.
- Rumus status tetap: Aspiration = PQI > 91,5% dan NOA/BP > 40; Emerging Performer = PQI > 91,5% dan NOA/BP >= 15; Under Perform Sale = PQI > 91,5% dan NOA/BP < 15; Under Perform Collection = PQI <= 91,5% dan NOA/BP >= 15; selainnya Need Turnaround.
- PQI Branch = 50% × RR DPD 0 + 50% × RR DPD 0–60.


## Disbursement by Branch: BP Count dan NOA Disbursement/BP
- `Jumlah BP` = jumlah BP unik dari data portfolio pada branch tersebut.
- `NOA Disbursement/BP` = jumlah aplikasi/loan ID unik pada Daily KP ÷ jumlah BP unik.
- Jika jumlah BP tidak tersedia atau nol, nilai NOA Disbursement/BP ditampilkan 0; cocokkan penamaan branch/area antara file portfolio dan Daily KP.

## Daily upload otomatis ke GitHub Pages
Repository root harus berisi `index.html`, `app.js`, `data/`, `input/`, `update_daily.py`, `requirements.txt`, dan `.github/workflows/daily-update.yml`.
1. Upload lima Excel terbaru ke folder `input/` dengan nama persis `current.xlsx`, `daily_kp.xlsx`, `31-60.xlsx`, `61-90.xlsx`, dan `90+.xlsx`. Gunakan repository private karena file sumber dapat mengandung data sensitif.
2. Commit perubahan. GitHub Actions `Daily Portfolio Data Refresh` akan memproses data dan menulis hasil ke `data/data.json`.
3. Pastikan repository Settings → Actions → General mengizinkan workflow menulis ke repository (workflow menggunakan `contents: write`).
4. Cek tab Actions hingga workflow sukses. GitHub Pages kemudian menyajikan `data/data.json` terbaru.
5. Setiap hari, replace kelima file di `input/` dan commit. Jangan mengganti nama file.
Catatan: setiap upload/commit ke folder input dapat memicu workflow. Pastikan kelima file berada di folder input sebelum memeriksa hasil workflow. Browser dashboard tidak mengunggah langsung karena GitHub memerlukan autentikasi; menu Upload Data Harian menjelaskan alur upload repository.
