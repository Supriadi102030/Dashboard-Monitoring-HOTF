#!/usr/bin/env python3
"""
Daily refresh helper for Portfolio Quality Monitoring Jatim 6.
Run from this folder after replacing the five Excel source files in ./input.
Requires Python 3.10+, pandas, numpy, openpyxl.
"""
from pathlib import Path
import json, math, shutil
import pandas as pd
import numpy as np

ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "input"
OUT = ROOT / "Portfolio_Quality_Monitoring_GitHub" / "data" / "data.json"
FILES = {
    "current": "current.xlsx",
    "daily_kp": "daily_kp.xlsx",
    "31_60": "31-60.xlsx",
    "61_90": "61-90.xlsx",
    "90_plus": "90+.xlsx",
}
TARGETS = {"DPD 0": .98, "DPD 1–30": .55, "DPD 31–60": .13}

def num(s):
    return pd.to_numeric(s, errors="coerce").fillna(0)

def main():
    missing = [f for f in FILES.values() if not (INPUT/f).exists()]
    if missing:
        raise SystemExit("File sumber belum lengkap di folder input: " + ", ".join(missing))
    old = json.loads(OUT.read_text(encoding="utf-8"))
    current = pd.read_excel(INPUT/FILES["current"])
    sources = [current]
    for k in ("31_60", "61_90", "90_plus"):
        sources.append(pd.read_excel(INPUT/FILES[k]))
    raw = pd.concat(sources, ignore_index=True)
    raw = raw.drop_duplicates(subset=["loan_id"], keep="first").copy()
    raw["loan_state_norm"] = raw["loan_state"].astype(str).str.upper()
    closed_count = int((raw["loan_state_norm"] == "CLOSED").sum())
    active = raw[raw["loan_state_norm"] != "CLOSED"].copy()
    active["dpd_num"] = num(active["dpd_new"])
    active["bucket"] = np.select(
        [active["dpd_num"] <= 0, active["dpd_num"].between(1,30),
         active["dpd_num"].between(31,60), active["dpd_num"].between(61,90),
         active["dpd_num"] > 90],
        ["DPD 0","DPD 1–30","DPD 31–60","DPD 61–90","DPD 90+"], default="DPD 0")
    active["paid_flag"] = active["payment_min_1x"].astype(str).str.strip().str.lower().isin(["yes","true","1","y"])
    active["customer_number"] = active["customer_number"].fillna("").astype(str)
    active["bp_name"] = active["agent_fullname"].fillna(active["bp_username"]).fillna("BP Tidak Teridentifikasi").astype(str)
    active["bp_id"] = active["agent_id"].fillna(active["bp_username"]).fillna(active["bp_name"]).astype(str)
    for col in ("region_name","area_name","branch_name"):
        active[col] = active[col].fillna("").astype(str)
    group_cols = ["region_name","area_name","branch_name"]
    branches=[]
    for keys,g in active.groupby(group_cols, dropna=False):
        row=dict(zip(group_cols,keys))
        row["island_remap_by_ops"] = str(g["island_remap_by_ops"].iloc[0])
        row["active_loan_count"] = int(g["loan_id"].nunique())
        row["unique_mitra"] = int(g["customer_number"].nunique())
        for col,key in [("os_new","total_os_new"),("total_tunggakan","total_tunggakan"),("total_payment","total_payment"),("total_payment_min_1x","total_payment_min_1x")]:
            row[key] = float(num(g[col]).sum()) if col in g else 0
        row["paid_noa"] = int(g.loc[g["paid_flag"],"loan_id"].nunique())
        row["rr_overall_min1x"] = row["paid_noa"]/row["active_loan_count"] if row["active_loan_count"] else 0
        for bucket,prefix in [("DPD 0","dpd_0"),("DPD 1–30","dpd_1_30"),("DPD 31–60","dpd_31_60"),("DPD 61–90","dpd_61_90"),("DPD 90+","dpd_90")]:
            q=g[g["bucket"]==bucket]
            row[prefix+"_noa"] = int(q["loan_id"].nunique())
            row[prefix+"_paid_noa"] = int(q.loc[q["paid_flag"],"loan_id"].nunique())
            row[prefix+"_os"] = float(num(q["os_new"]).sum())
            row[prefix+"_rr"] = row[prefix+"_paid_noa"]/row[prefix+"_noa"] if row[prefix+"_noa"] else 0
        labels=g["movement_label"].fillna("").astype(str).str.lower()
        row["flow_forward"]=int(labels.str.contains("flow forward|roll forward|worsen|deteriorat",regex=True).sum())
        row["rollback"]=int(labels.str.contains("rollback|roll back|improv|cure",regex=True).sum())
        row["stay"]=int(labels.str.contains("stay|same|no change",regex=True).sum())
        # PQI and status, matching dashboard definition
        rr0=row["dpd_0_paid_noa"]/row["dpd_0_noa"] if row["dpd_0_noa"] else 0
        n060=sum(row[p+"_noa"] for p in ("dpd_0","dpd_1_30","dpd_31_60"))
        p060=sum(row[p+"_paid_noa"] for p in ("dpd_0","dpd_1_30","dpd_31_60"))
        rr060=p060/n060 if n060 else 0
        row["pqi_branch"]=.5*rr0+.5*rr060
        branches.append(row)
    # BP-level data
    bps=[]
    for keys,g in active.groupby(["region_name","area_name","branch_name","bp_id","bp_name"],dropna=False):
        row=dict(zip(["region_name","area_name","branch_name","bp_id","bp_name"],keys))
        row["active_loan_count"]=int(g["loan_id"].nunique())
        row["unique_mitra"]=int(g["customer_number"].nunique())
        for bucket,prefix in [("DPD 0","dpd_0"),("DPD 1–30","dpd_1_30"),("DPD 31–60","dpd_31_60"),("DPD 61–90","dpd_61_90"),("DPD 90+","dpd_90")]:
            q=g[g["bucket"]==bucket]
            cust=q.groupby("customer_number",dropna=False)["paid_flag"].any()
            row[prefix+"_mitra"]=int(cust.size)
            row[prefix+"_paid_mitra"]=int(cust.sum())
            row[prefix+"_rr"]=float(cust.mean()) if len(cust) else None
        bps.append(row)
    # status classification, based on number of unique BP in branch
    bp_counts={}
    for x in bps:
        bp_counts[(x["region_name"],x["area_name"],x["branch_name"])] = bp_counts.get((x["region_name"],x["area_name"],x["branch_name"]),set()) | {x["bp_id"]}
    for b in branches:
        n=len(bp_counts.get((b["region_name"],b["area_name"],b["branch_name"]),set()))
        b["bp_count"]=n
        b["noa_per_bp"]=b["active_loan_count"]/n if n else 0
        pqi=b["pqi_branch"]; nper=b["noa_per_bp"]
        if pqi>.915 and nper>40: status="Aspiration"
        elif pqi>.915 and nper>=15: status="Emerging Performer"
        elif pqi>.915 and nper<15: status="Under Perform Sale"
        elif pqi<=.915 and nper>=15: status="Under Perform Collection"
        else: status="Need Turnaround"
        b["branch_status"]=status
    # update summary
    overall=old.get("overall",{})
    overall["snapshot_cutoff"]=str(pd.to_datetime(active["week"].dropna().iloc[0],errors="coerce").date()) if "week" in active and active["week"].notna().any() and pd.notna(pd.to_datetime(active["week"].dropna().iloc[0],errors="coerce")) else str(pd.Timestamp.now().date())
    overall["total_source_rows"]=int(len(raw))
    overall["unique_loan_ids"]=int(raw["loan_id"].nunique())
    overall["duplicate_loan_ids_removed"]=int(len(pd.concat(sources,ignore_index=True))-raw["loan_id"].nunique())
    overall["active_loans"]=int(active["loan_id"].nunique())
    overall["unique_mitra"]=int(active["customer_number"].nunique())
    overall["total_os_new"]=float(num(active["os_new"]).sum())
    overall["total_tunggakan"]=float(num(active["total_tunggakan"]).sum())
    overall["total_payment"]=float(num(active["total_payment"]).sum())
    overall["paid_noa"]=int(active.loc[active["paid_flag"],"loan_id"].nunique())
    overall["overall_rr_min1x"]=overall["paid_noa"]/overall["active_loans"] if overall["active_loans"] else 0
    overall["closed_loans_excluded"]=closed_count
    overall["regions"]=sorted(active["region_name"].unique().tolist())
    overall["areas"]=sorted(active["area_name"].unique().tolist())
    overall["branches"]=sorted(active["branch_name"].unique().tolist())
    overall["bucket_totals"]={}
    for bucket,prefix in [("DPD 0","dpd_0"),("DPD 1–30","dpd_1_30"),("DPD 31–60","dpd_31_60"),("DPD 61–90","dpd_61_90"),("DPD 90+","dpd_90")]:
        q=active[active["bucket"]==bucket]
        noa=int(q["loan_id"].nunique()); paid=int(q.loc[q["paid_flag"],"loan_id"].nunique())
        overall["bucket_totals"][bucket]={"noa":noa,"paid_noa":paid,"rr":paid/noa if noa else 0,"os":float(num(q["os_new"]).sum()),"tunggakan":float(num(q["total_tunggakan"]).sum()),"payment":float(num(q["total_payment"]).sum())}
    # Daily KP disbursement summary is regenerated too.
    dk=pd.read_excel(INPUT/FILES["daily_kp"])
    dk=dk.drop_duplicates(subset=["loan_id"],keep="first")
    for col in ("regional","area","branch","customer_number","loan_id","status_cair","kategori_cycle"):
        if col not in dk: dk[col]=""
    dk["plafond_num"]=num(dk["plafond"])
    dk["regional"]=dk["regional"].fillna("").astype(str); dk["area"]=dk["area"].fillna("").astype(str); dk["branch"]=dk["branch"].fillna("").astype(str)
    def status_key(v):
        v=str(v).strip().lower()
        if "gagal" in v: return "gagal_dicairkan"
        if "menunggu" in v: return "menunggu_pencairan"
        if "cair" in v: return "sudah_cair"
        return "lainnya"
    dk["status_key"]=dk["status_cair"].map(status_key)
    disb_br=[]
    for keys,g in dk.groupby(["regional","area","branch"],dropna=False):
        row={"region_name":keys[0],"area_name":keys[1],"branch_name":keys[2],"island_remap_by_ops":"Jawa 2","total_applications":int(g["loan_id"].nunique()),"total_plafond_pipeline":float(g["plafond_num"].sum()),"unique_mitra":int(g["customer_number"].nunique())}
        for k in ("gagal_dicairkan","menunggu_pencairan","sudah_cair"):
            q=g[g["status_key"]==k]
            row[k+"_loans"]=int(q["loan_id"].nunique())
            row[k+"_plafond"]=float(q["plafond_num"].sum())
        cyc=g["kategori_cycle"].fillna("").astype(str).str.upper()
        row["ntb_loans"]=int(g[cyc.str.contains("NTB")]["loan_id"].nunique())
        row["etb_loans"]=int(g[cyc.str.contains("ETB")]["loan_id"].nunique())
        disb_br.append(row)
    status_summary=[]
    for k in ("gagal_dicairkan","menunggu_pencairan","sudah_cair"):
        q=dk[dk["status_key"]==k]
        status_summary.append({"status":k.replace("_"," ").title(),"loans":int(q["loan_id"].nunique()),"plafond":float(q["plafond_num"].sum()),"unique_mitra":int(q["customer_number"].nunique())})
    disb={"total_loans":int(dk["loan_id"].nunique()),"total_mitra":int(dk["customer_number"].nunique()),"total_plafond":float(dk["plafond_num"].sum()),"status_summary":status_summary,"branches":disb_br}
    old["overall"]=overall; old["branches"]=branches; old["bps"]=bps; old["disbursement"]=disb
    old["meta"]["generated_at"]=pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")
    old["meta"]["source_date"]=overall["snapshot_cutoff"]
    OUT.write_text(json.dumps(old,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print(f"Updated: {OUT}")
    print(f"Active loans: {overall['active_loans']:,}; BP rows: {len(bps):,}; Branches: {len(branches):,}; Disbursement rows: {len(disb_br):,}")
    print("Now upload the updated data.json to GitHub repository folder data/ and wait for Pages deployment.")

if __name__ == "__main__":
    main()
