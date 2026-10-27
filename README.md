# KPI FO Tracker — Q4 2026 (GitHub Pages)

Dashboard statis berbasis HTML/CSS/JavaScript dengan data hasil ekstraksi dari sheet `Oct - BP`, `Oct - BM`, `Oct - AM`, dan `Oct - RM` pada workbook KPI FO Tracker.

## Cara upload ke GitHub
1. Buat repository GitHub. **Penting:** workbook berisi nama karyawan dan informasi kinerja internal. Gunakan repository **Private** atau sanitasi `data.json` sebelum memublikasikan ke repository publik.
2. Extract ZIP ini, lalu upload semua isi folder ke root repository: `index.html`, `styles.css`, `app.js`, `data.json`, dan `README.md`.
3. Buka **Settings → Pages**.
4. Pada Build and deployment, pilih **Deploy from a branch**, branch `main`, folder `/ (root)`, lalu Save.
5. Tunggu proses deployment dan buka URL GitHub Pages yang ditampilkan.

## Isi dashboard
- Filter role, regional, area, point, dan pencarian nama.
- KPI summary, distribusi skor, rata-rata per role, indikator repayment, watchlist, dan tabel performa.
- Export hasil filter ke CSV.

## Pembaruan data
`data.json` adalah dataset yang dibaca dashboard. Untuk memperbarui, ekstrak ulang data dari workbook terbaru ke struktur JSON yang sama lalu replace `data.json` di repository. Pastikan formula di sumber sudah direfresh sebelum ekspor; dashboard tidak menghitung ulang formula Excel.

## Catatan interpretasi
- Data diambil dari nilai tersimpan (cached values) workbook; beberapa formula eksternal/Google Sheets mungkin belum ter-refresh di Excel.
- Dashboard date pada workbook: 2026-10-21; cutoff data: 2026-10-24.
- Rata-rata repayment yang ditampilkan merupakan rata-rata sederhana dari nilai aktual per karyawan yang tersedia; untuk pelaporan resmi, sebaiknya hitung ulang dari numerator/denominator resmi, bukan merata-ratakan rate.
- Parameter repayment DPD 31–90 di workbook memiliki definisi yang perlu dikonfirmasi karena deskripsinya menyebut DPD 31–60.
- Data insentif tidak disimulasikan sebagai pembayaran final. Kartu Boom/Boost hanya menampilkan status pada sumber.
