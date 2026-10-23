# Portfolio Quality Monitoring — Jawa 2

Static GitHub Pages dashboard with separate Repayment / Portfolio Quality and Disbursement views.

## Files
- `index.html`, `app.js`: dashboard interface and calculations.
- `portfolio_daily.csv`: loan/portfolio snapshot, used for repayment buckets, PQI, and branch performance.
- `data/disbursement_daily.csv`: branch-level daily disbursement, split into NTB and ETB.
- `portfolio_daily_template.csv`: schema for updating repayment data.
- `data/disbursement_daily_template.csv`: schema for updating disbursement data.

## Repayment / Branch Performance
Branch table includes each DPD bucket, total Mitra/NOA, target paid rate, actual paid rate, and gap to target.
- DPD 0 target paid: 98%
- DPD 1–30 target paid: 55%
- DPD 31–60 target paid: 15%
- DPD 61–90 and DPD 90+: blank until management confirms the targets; can be entered in the dashboard.
- `paid_flag=1` means the Mitra/loan has payment activity in the current monitoring period. Validate this flag against the official collection definition.
- Gap NOA = max(0, ceiling(bucket NOA × target rate) − actual paid NOA).
- PQI = 50% × RR DPD 0 + 50% × % Mitra Paid DPD 0–60; healthy cutoff is 0.92. In this dashboard, RR DPD 0 is calculated from Mitra paid rate (paid Mitra / total Mitra in DPD 0) because the supplied source snapshot does not contain a clean scheduled-amount denominator for official monetary repayment rate.

## Branch Performance Classification
The rules follow the requested sequence:
1. PQI > cut and NOA/BP > High → Aspiration
2. PQI > cut and NOA/BP >= Low → Emerging Performer
3. PQI > cut and NOA/BP < Low → Under Performing Sales
4. PQI <= cut and NOA/BP >= Low → Under Performing Collection
5. Otherwise → Need Turnaround

Default thresholds in the dashboard are PQI cut = 0.92, NOA/BP Low = 700, and NOA/BP High = 1,000. These are editable assumptions and should be replaced with approved management thresholds. Because BP headcount is not included in the supplied portfolio file, the dashboard uses branch unique Mitra / the optional `bp_count` field if provided. Populate `bp_count` in the daily portfolio CSV for a true NOA per BP metric.

## Disbursement
- `total_disbursement_amount`: total plafond for loans with status “Sudah Cair”.
- `total_disbursement_noa`: distinct `customer_number` among “Sudah Cair”.
- NTB: source `kategori_cycle = New Loan`.
- ETB: source `kategori_cycle = Subsequent Loan`.
- NTB/ETB amounts sum `plafond` for the corresponding disbursed records.
- These source categories may not match `loan_cycle` numerically. Use `kategori_cycle` as the classification field unless the business owner confirms another definition.

## Daily update process
1. Prepare new daily snapshots with the exact columns in the template CSV files.
2. Replace `portfolio_daily.csv` in the repository root.
3. Replace `data/disbursement_daily.csv` in the `data/` folder.
4. Commit the changes to `main`.
5. GitHub Pages loads the latest CSV when users open or refresh the dashboard. A CSV upload from inside the dashboard is preview-only and does not write to GitHub.
6. Do not upload customer names, phone numbers, NIK, or other unnecessary personal information to a public repository. The provided dashboard CSV uses borrower/customer IDs for internal monitoring; if this repository is public, confirm approval or anonymize IDs before uploading.
