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
