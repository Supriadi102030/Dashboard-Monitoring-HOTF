# Portfolio Quality Monitoring — Jawa 2
Snapshot: 23 October 2026 (portfolio extract cutoff 17 October; progress period 18–23 October 2026).

## Files
- `index.html` — dashboard interface.
- `app.js` — filter, CSV parsing, aggregation, DPD and preliminary paid metrics.
- `portfolio_daily.csv` — pseudonymized borrower-level snapshot (26,172 unique borrowers). No names, phone numbers, NIK, addresses, customer numbers, or loan IDs.
- `portfolio_daily_template.csv` — template for future daily updates.
- `data/portfolio_branch_summary.csv` — aggregate branch-level portfolio metrics.
- `data/poi_ntb_funnel_by_branch.csv` — aggregated POI/NTB lead funnel by branch.
- `data/etb_interested_by_branch.csv` and `data/ntb_interested_by_branch.csv` — aggregated lead lists by branch.
- `Analisis_Portfolio_Quality_Jawa2_23_Okt_2026.xlsx` — detailed analysis workbook.

## Important metric caveats
1. The supplied portfolio files include current/DPD 1–30/31–60/61–90 extracts. There is no dedicated source extract for loans already in DPD 90+ at cutoff. The 639 loans that appear at DPD 90+ are only observed flows from the 61–90 extract; DPD 90+ is incomplete.
2. `paid_flag` is derived from `payment_min_1x` (Yes/No) across a borrower's loans in the weekly reporting period. Treat it as a preliminary weekly payment indicator, not automatically the official % Mitra Paid metric.
3. `due_amount` is set to 0 because the source files do not establish the official denominator for RR DPD 0. Therefore RR DPD 0 and PQI intentionally remain unavailable rather than using an unverified formula. Confirm the official amount due and payment window, then populate `due_amount`.
4. Portfolio-level NTB/ETB is set to `UNCLASSIFIED`. Do not infer NTB/ETB from `loan_kind` alone. The lead-funnel files are separate and should not be added to portfolio borrower totals.
5. The raw source spreadsheets contain personal data. Do not upload raw workbooks to a public GitHub repository. This package contains only pseudonymized borrower IDs and aggregated branch lead metrics.

## Dashboard update
1. Replace the root `portfolio_daily.csv` with the latest sanitized CSV.
2. Keep the CSV headers identical to `portfolio_daily_template.csv`.
3. Commit the updated file to GitHub. The dashboard automatically fetches this CSV on page load; refresh the published page after deployment.
4. CSV upload in the dashboard remains available for a temporary browser-only load.
5. GitHub Pages should deploy from branch `main`, folder `/ (root)`.

## Required CSV columns
`snapshot_date,regional,area,branch,borrower_id,dpd,ntb_etb,current_flag,paid_flag,due_amount,paid_amount,outstanding`

`dpd` is the worst `dpd_new` across the borrower's loans; `outstanding` and `paid_amount` are summed across the borrower's loans. Borrower IDs are pseudonymized.


## Dua segmentasi dashboard
- **Repayment / Portfolio Quality**: Current Paid, DPD aging, outstanding, RR DPD 0, % Mitra Paid, PQI, serta breakdown portfolio.
- **Disbursement**: status Sudah Cair/Gagal Dicairkan/Menunggu Pencairan, New Loan vs Subsequent Loan, POI NTB funnel, prospek NTB dan ETB berminat, serta detail per branch.

File disbursement agregat yang digunakan di browser ada di `data/daily_kp_by_branch.csv`, `data/poi_ntb_funnel_by_branch.csv`, `data/ntb_interested_by_branch.csv`, dan `data/etb_interested_by_branch.csv`. File agregat ini tidak memuat nama, NIK, alamat, atau nomor telepon. Filter Regional/Area/Branch diterapkan pada kedua segmentasi.


## Repayment table and PQI (updated)
- Repayment table separates DPD 0, DPD 1–30, DPD 31–60, DPD 61–90, and DPD 90+.
- Paid rate is calculated as unique Mitra with `paid_flag = 1` divided by unique Mitra in that DPD bucket.
- Target paid rates: DPD 0 = 98%, DPD 1–30 = 55%, DPD 31–60 = 15%.
- Targets for DPD 61–90 and DPD 90+ were not provided and are intentionally left blank/editable in the dashboard.
- Target Mitra Paid = ceiling(total Mitra in bucket × target). Gap = max(0, target Mitra Paid − actual Mitra Paid).
- Total repayment is the sum of `paid_amount` from the uploaded snapshot. Validate the source period and payment definition before comparing daily performance.
- PQI = 50% × RR DPD 0 + 50% × % Mitra Paid. RR DPD 0 = paid Mitra in DPD 0 / all Mitra in DPD 0. % Mitra Paid = paid Mitra in DPD 0–60 / all Mitra in DPD 0–60. Healthy threshold = 0.92.
- Disbursement section now includes total disbursement amount and unique Mitra NOA, split into NTB (loan cycle 1) and ETB (loan cycle > 1), from Daily KP source.
