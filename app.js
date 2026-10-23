let data=[]; const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString('id-ID',{maximumFractionDigits:0});
const pct=n=>Number.isFinite(n)?(n*100).toLocaleString('id-ID',{maximumFractionDigits:1})+'%':'—';
const num=v=>{let n=Number(v);return Number.isFinite(n)?n:0};
function csvParse(text){let lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);if(lines.length<2)return[];const parse=s=>{let out=[],v='',q=false;for(let i=0;i<s.length;i++){let c=s[i];if(c==='"'&&q&&s[i+1]==='"'){v+='"';i++}else if(c==='"')q=!q;else if(c===','&&!q){out.push(v);v=''}else v+=c}out.push(v);return out};let heads=parse(lines.shift()).map(x=>x.trim());return lines.filter(x=>x.trim()).map(line=>{let vals=parse(line),o={};heads.forEach((h,i)=>o[h]=(vals[i]||'').trim());return o})}
function normalize(rows){return rows.map(r=>({...r,snapshot_date:r.snapshot_date||r.date,regional:r.regional||'',area:r.area||'',branch:r.branch||'',borrower_id:String(r.borrower_id||r.mitra_id||''),dpd:num(r.dpd),ntb_etb:String(r.ntb_etb||'UNCLASSIFIED').toUpperCase(),current_flag:num(r.current_flag),paid_flag:num(r.paid_flag),due_amount:num(r.due_amount),paid_amount:num(r.paid_amount),outstanding:num(r.outstanding)})).filter(r=>r.snapshot_date&&r.borrower_id)}
function unique(a){return [...new Set(a.filter(Boolean))].sort()}
function fillSelect(id,vals,all){let el=$(id),old=el.value;el.innerHTML='';let op=document.createElement('option');op.value='';op.textContent=all;el.append(op);vals.forEach(v=>{let o=document.createElement('option');o.value=v;o.textContent=v;el.append(o)});if(vals.includes(old))el.value=old}
function refreshFilters(){
 fillSelect('date',unique(data.map(x=>x.snapshot_date)).reverse(),'Tanggal terbaru (default)');
 const regions=unique(data.map(x=>x.regional)); fillSelect('region',regions,'Semua regional');
 if(regions.includes('Jawa Timur 6')) $('region').value='Jawa Timur 6';
 refreshLowerFilters();
}
function refreshLowerFilters(){
 let r=data; if($('region').value) r=r.filter(x=>x.regional===$('region').value);
 fillSelect('area',unique(r.map(x=>x.area)),'Semua area');
 if($('area').value) r=r.filter(x=>x.area===$('area').value);
 fillSelect('branch',unique(r.map(x=>x.branch)),'Semua branch');
}
function latestRows(rows){if(!$('date').value){let latest=unique(rows.map(r=>r.snapshot_date)).sort().pop();return rows.filter(r=>r.snapshot_date===latest)}return rows.filter(r=>r.snapshot_date===$('date').value)}
function filtered(){let r=latestRows(data);for(let k of ['region','area','branch'])if($(k).value)r=r.filter(x=>x[{region:'regional',area:'area',branch:'branch'}[k]]===$(k).value);if($('segment').value)r=r.filter(x=>x.ntb_etb===$('segment').value);return r}
function uniq(r){return new Map(r.map(x=>[x.borrower_id,x])).values()}
function aggregate(rows){
 let r=[...uniq(rows)];
 let d0=r.filter(x=>x.dpd===0);
 let eligible=r.filter(x=>x.dpd>=0&&x.dpd<=60);
 let paid0=d0.filter(x=>x.paid_flag===1).length;
 let paidEligible=eligible.filter(x=>x.paid_flag===1).length;
 let rr=d0.length?paid0/d0.length:NaN;
 let mp=eligible.length?paidEligible/eligible.length:NaN;
 return {r,mtu:r.length,current:r.filter(x=>x.current_flag===1).length,
  paidamt:r.reduce((s,x)=>s+x.paid_amount,0),
  outstanding:r.reduce((s,x)=>s+x.outstanding,0),
  rr,mp,pqi:Number.isFinite(rr)&&Number.isFinite(mp)?(rr+mp)/2:NaN,
  dpds:[r.filter(x=>x.dpd===0).length,r.filter(x=>x.dpd>=1&&x.dpd<=30).length,r.filter(x=>x.dpd>=31&&x.dpd<=60).length,r.filter(x=>x.dpd>=61&&x.dpd<=90).length,r.filter(x=>x.dpd>90).length],
  buckets:[
   {label:'DPD 0',target:.98,rows:r.filter(x=>x.dpd===0)},
   {label:'DPD 1–30',target:.55,rows:r.filter(x=>x.dpd>=1&&x.dpd<=30)},
   {label:'DPD 31–60',target:.15,rows:r.filter(x=>x.dpd>=31&&x.dpd<=60)},
   {label:'DPD 61–90',target:targetValue('target6190'),rows:r.filter(x=>x.dpd>=61&&x.dpd<=90)},
   {label:'DPD 90+',target:targetValue('target90'),rows:r.filter(x=>x.dpd>90)}
  ]
 };
}
function targetValue(id){
 const el=$(id); if(!el||el.value==='')return NaN;
 const v=Number(el.value);return Number.isFinite(v)?Math.max(0,Math.min(100,v))/100:NaN;
}
function card(label,value,hint){return `<div class="card"><div class="label">${label}</div><div class="value">${value}</div><div class="hint">${hint}</div></div>`}
function table(headers,rows){return '<table><thead><tr>'+headers.map(h=>`<th>${h}</th>`).join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((v,i)=>`<td>${v}</td>`).join('')+'</tr>').join('')+'</tbody></table>'}
function render(){
 let rows=filtered(),a=aggregate(rows),den=a.mtu||1;
 if(!rows.length){
  $('cards').innerHTML='';
  $('dpdchart').innerHTML='<div class="empty">Belum ada data untuk filter ini. Upload CSV snapshot harian.</div>';
  $('pqi').innerHTML='<div class="empty">PQI akan dihitung setelah data tersedia.</div>';
  ['repaymentTable','pqiTable','segmenttable','detail'].forEach(id=>$(id).innerHTML='<div class="empty">Belum ada data sesuai filter.</div>');
  return;
 }
 $('cards').innerHTML=[
  card('Total Mitra',fmt(a.mtu),'Mitra unik pada filter terpilih'),
  card('Mitra melakukan pembayaran',fmt(rows.filter(x=>x.paid_flag===1).length),pct(rows.filter(x=>x.paid_flag===1).length/den)+' dari Mitra terpilih'),
  card('Total repayment', 'Rp '+fmt(a.paidamt),'Total pembayaran pada periode sumber'),
  card('Outstanding', 'Rp '+fmt(a.outstanding),'Outstanding terbaru')
 ].join('');
 const labels=['DPD 0','DPD 1–30','DPD 31–60','DPD 61–90','DPD 90+'];
 $('dpdchart').innerHTML=labels.map((l,i)=>`<div class="barrow"><span>${l}</span><div class="track"><div class="bar" style="width:${a.dpds[i]/den*100}%"></div></div><b>${fmt(a.dpds[i])}</b></div>`).join('');
 const bucketRows=a.buckets.map(b=>{
  const n=b.rows.length, paid=b.rows.filter(x=>x.paid_flag===1).length, rate=n?paid/n:NaN;
  const target=Number.isFinite(b.target)?b.target:NaN;
  const targetCount=Number.isFinite(target)?Math.ceil(n*target):NaN;
  const gap=Number.isFinite(targetCount)?Math.max(0,targetCount-paid):NaN;
  const payment=b.rows.reduce((s,x)=>s+x.paid_amount,0);
  const status=!Number.isFinite(target)?'<span class="pill warn">Target belum ditetapkan</span>':(rate>=target?'<span class="pill healthy">Tercapai</span>':'<span class="pill bad">Perlu dikejar</span>');
  return [b.label,fmt(n),fmt(paid),pct(rate),Number.isFinite(target)?pct(target):'Belum ditetapkan',Number.isFinite(targetCount)?fmt(targetCount):'—',Number.isFinite(gap)?fmt(gap):'—','Rp '+fmt(payment),status];
 });
 $('repaymentTable').innerHTML=table(['Bucket DPD','Total Mitra','Mitra Paid','Paid Rate','Target Paid','Target Mitra Paid','Gap Mitra','Total Repayment','Status'],bucketRows);
 const cls=Number.isFinite(a.pqi)&&a.pqi>=.92?'healthy':'bad';
 $('pqi').innerHTML=`<div class="cards" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:8px"><div class="card"><div class="label">RR DPD 0</div><div class="value">${pct(a.rr)}</div><div class="hint">Target 98%</div></div><div class="card"><div class="label">% Mitra Paid DPD 0–60</div><div class="value">${pct(a.mp)}</div><div class="hint">Target 85%</div></div><div class="card"><div class="label">PQI</div><div class="value">${Number.isFinite(a.pqi)?a.pqi.toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2}):'—'}</div><span class="pill ${cls}">${Number.isFinite(a.pqi)?(a.pqi>=.92?'Sehat':'Perlu perbaikan'):'Data belum cukup'}</span></div></div>`;
 const groups={};rows.forEach(r=>{const k=[r.regional,r.area,r.branch].join('|');(groups[k]??=[]).push(r)});
 const pqiRows=Object.entries(groups).map(([k,v])=>{const x=aggregate(v);return [...k.split('|'),fmt(x.dpds[0]),fmt(x.r.length?x.r.filter(z=>z.dpd===0&&z.paid_flag===1).length:0),pct(x.rr),fmt(x.r.filter(z=>z.dpd>=0&&z.dpd<=60).length),fmt(x.r.filter(z=>z.dpd>=0&&z.dpd<=60&&z.paid_flag===1).length),pct(x.mp),Number.isFinite(x.pqi)?x.pqi.toFixed(2):'—',Number.isFinite(x.pqi)?`<span class="pill ${x.pqi>=.92?'healthy':'bad'}">${x.pqi>=.92?'Sehat':'Perlu perbaikan'}</span>`:'<span class="pill warn">Data belum cukup</span>']});
 $('pqiTable').innerHTML=pqiRows.length?table(['Regional','Area','Branch','Total DPD 0','DPD 0 Paid','RR DPD 0','Total Mitra DPD 0–60','Mitra Paid DPD 0–60','% Mitra Paid','PQI','Status'],pqiRows):'<div class="empty">Tidak ada data PQI.</div>';
 const segs=[['NTB','NTB'],['ETB','ETB'],['Belum diklasifikasi','UNCLASSIFIED']].map(([label,s])=>{let x=aggregate(rows.filter(r=>r.ntb_etb===s));return [label,fmt(x.mtu),fmt(x.current),...x.dpds.map(fmt),fmt(x.outstanding),pct(x.rr),pct(x.mp),Number.isFinite(x.pqi)?x.pqi.toFixed(2):'—']});
 $('segmenttable').innerHTML=table(['Segment','Mitra','Current Paid','DPD 0','DPD 1–30','DPD 31–60','DPD 61–90','DPD 90+','Outstanding','RR DPD 0','% Mitra Paid','PQI'],segs);
 const detail=Object.entries(groups).map(([k,v])=>{const x=aggregate(v);return [...k.split('|'),fmt(x.mtu),fmt(x.current),...x.dpds.map(fmt),fmt(x.outstanding),pct(x.rr),pct(x.mp),Number.isFinite(x.pqi)?x.pqi.toFixed(2):'—',`<span class="pill ${Number.isFinite(x.pqi)&&x.pqi>=.92?'healthy':'bad'}">${Number.isFinite(x.pqi)?(x.pqi>=.92?'Sehat':'Perbaikan'):'N/A'}</span>`]});
 $('detail').innerHTML=detail.length?table(['Regional','Area','Cabang','Mitra','Current Paid','DPD 0','DPD 1–30','DPD 31–60','DPD 61–90','DPD 90+','Outstanding','RR DPD 0','% Mitra Paid','PQI','Status'],detail):'<div class="empty">Tidak ada data sesuai filter.</div>';
}
$('file').addEventListener('change',async e=>{let f=e.target.files[0];if(!f)return;try{let rows=normalize(csvParse(await f.text()));if(!rows.length)throw Error('CSV kosong atau kolom wajib belum sesuai.');data=rows;if(!data.length)throw Error('CSV tidak memiliki baris data yang valid. Pastikan kolom wajib tersedia.');refreshFilters();$('notice').textContent=`Data dimuat: ${data.length.toLocaleString('id-ID')} baris dataset Jawa 2 dari ${f.name}. Snapshot terbaru ditampilkan secara default. NTB/ETB portofolio belum diklasifikasi; PQI belum tersedia tanpa denominator RR DPD 0.`;render()}catch(err){alert('Gagal membaca CSV: '+err.message)}});
$('date').addEventListener('change',render);$('segment').addEventListener('change',render);
$('applyTargets').addEventListener('click',render);$('target6190').addEventListener('change',render);$('target90').addEventListener('change',render);$('region').addEventListener('change',()=>{refreshLowerFilters();render();renderDisbursement()});$('area').addEventListener('change',()=>{refreshLowerFilters();render();renderDisbursement()});$('branch').addEventListener('change',()=>{render();renderDisbursement()});
$('download').onclick=()=>{let csv='snapshot_date,regional,area,branch,borrower_id,dpd,ntb_etb,current_flag,paid_flag,due_amount,paid_amount,outstanding\n';let blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='portfolio_daily_template.csv';a.click();URL.revokeObjectURL(url)};
async function loadDefaultData(){
 try{
  const res=await fetch('./portfolio_daily.csv',{cache:'no-store'});
  if(!res.ok) throw new Error('CSV default belum tersedia');
  const rows=normalize(csvParse(await res.text()));
  if(!rows.length) throw new Error('CSV default kosong atau header tidak sesuai');
  data=rows;
  refreshFilters();
  $('notice').textContent=`Data otomatis dimuat dari portfolio_daily.csv: ${data.length.toLocaleString('id-ID')} baris dari dataset Jawa 2. RR DPD 0/PQI belum tersedia sampai denominator resmi dikonfirmasi.`;
  render();
 }catch(err){refreshFilters();render();}
}
loadDefaultData();


// --- Disbursement segmentation: aggregate CSVs contain no direct personal identifiers ---
let disbKP=[], poiRows=[], ntbRows=[], etbRows=[];
async function readCSVPath(path){try{const res=await fetch(path,{cache:'no-store'});if(!res.ok)throw Error(path+' tidak ditemukan');return csvParse(await res.text())}catch(e){console.warn(e.message);return []}}
const nval=(r,...keys)=>{for(const k of keys){if(r[k]!==undefined&&r[k]!==''&&r[k]!==null)return num(r[k])}return 0};
const sval=(r,...keys)=>{for(const k of keys){if(r[k]!==undefined&&r[k]!==null&&r[k]!=='')return String(r[k]).trim()}return ''};
function selectedBranchRows(rows){return rows.filter(r=>{const reg=sval(r,'regional');const area=sval(r,'area');const branch=sval(r,'branch');return (!$('region').value||reg===$('region').value)&&(!$('area').value||area===$('area').value)&&(!$('branch').value||branch===$('branch').value)})}
function sum(rows,key){return rows.reduce((a,r)=>a+nval(r,key),0)}
function renderBars(elId,items){const total=Math.max(1,...items.map(x=>x.value));$(elId).innerHTML=items.map(x=>`<div class="barrow"><span>${x.label}</span><div class="track"><div class="bar" style="width:${Math.max(0,x.value/total*100)}%"></div></div><b>${fmt(x.value)}</b></div>`).join('')||'<div class="empty">Data belum tersedia.</div>'}
function renderDisbursement(){
 const kp=selectedBranchRows(disbKP), poi=selectedBranchRows(poiRows), ntb=selectedBranchRows(ntbRows), etb=selectedBranchRows(etbRows);
 if(!disbKP.length){$('disbCards').innerHTML='<div class="empty">Dataset disbursement belum ditemukan. Pastikan folder data terunggah di GitHub.</div>';return}
 const total=sum(kp,'total_pengajuan'), cair=sum(kp,'sudah_cair_count'), gagal=sum(kp,'gagal_dicairkan_count'), tunggu=sum(kp,'menunggu_pencairan_count'), plafond=sum(kp,'total_plafond'), cairPlafond=sum(kp,'sudah_cair_plafond'), noa=sum(kp,'disbursed_noa'), ntbNoa=sum(kp,'ntb_disbursed_noa'), etbNoa=sum(kp,'etb_disbursed_noa');
 $('disbCards').innerHTML=[card('Total pengajuan / loan records',fmt(total),'Jumlah record pada Daily KP'),card('Sudah cair',fmt(cair),pct(total?cair/total:NaN)+' dari total record'),card('Gagal dicairkan',fmt(gagal),pct(total?gagal/total:NaN)+' dari total record'),card('Menunggu pencairan',fmt(tunggu),pct(total?tunggu/total:NaN)+' dari total record'),card('Plafond total', 'Rp '+fmt(plafond),'Nilai plafond dari Daily KP'),card('Total Disbursement', 'Rp '+fmt(cairPlafond),'Plafond status sudah cair'),card('Mitra Disbursement (NOA)',fmt(noa),'Customer number unik dengan status sudah cair'),card('NOA Disbursement NTB',fmt(ntbNoa),'Mitra baru · loan cycle 1'),card('NOA Disbursement ETB',fmt(etbNoa),'Mitra existing · subsequent loan cycle > 1')].join('');
 renderBars('disbStatusChart',[{label:'Sudah cair',value:cair},{label:'Gagal',value:gagal},{label:'Menunggu',value:tunggu}]);renderBars('disbCycleChart',[{label:'New Loan / NTB',value:sum(kp,'ntb_count')},{label:'Subsequent Loan',value:sum(kp,'subsequent_count')}]);
 const pRows=poi.map(r=>[sval(r,'regional'),sval(r,'area'),sval(r,'branch'),fmt(nval(r,'total_leads')),fmt(nval(r,'unique_phone')),fmt(nval(r,'interested')),fmt(nval(r,'followed_up')),fmt(nval(r,'disbursed')),pct(nval(r,'interest_rate')),pct(nval(r,'disbursement_rate'))]);
 $('poiTable').innerHTML=pRows.length?table(['Regional','Area','Branch','Total leads','Unique phone','Interested','Follow-up','Disbursed','Interest rate','Disbursement rate'],pRows):'<div class="empty">Tidak ada data POI NTB pada filter ini.</div>';
 const nRows=ntb.map(r=>[sval(r,'area'),sval(r,'branch'),fmt(nval(r,'ntb_interested')),fmt(nval(r,'ntb_approved')),fmt(nval(r,'ntb_tertarik')),fmt(nval(r,'ntb_diajukan')),fmt(nval(r,'ntb_disbursed'))]);
 $('ntbTable').innerHTML=nRows.length?table(['Area','Branch','Prospek','Approved','Tertarik','Diajukan','Sudah disbursed'],nRows):'<div class="empty">Tidak ada data NTB pada filter ini.</div>';
 const eRows=etb.map(r=>[sval(r,'regional'),sval(r,'area'),sval(r,'branch'),fmt(nval(r,'etb_interested')),fmt(nval(r,'active_loan_total')),'Rp '+fmt(nval(r,'plafond_sum'))]);
 $('etbTable').innerHTML=eRows.length?table(['Regional','Area','Branch','ETB berminat','Loan aktif','Total plafond'],eRows):'<div class="empty">Tidak ada data ETB pada filter ini.</div>';
 const group={};kp.forEach(r=>{const k=[sval(r,'regional'),sval(r,'area'),sval(r,'branch')].join('|');if(!group[k])group[k]={regional:sval(r,'regional'),area:sval(r,'area'),branch:sval(r,'branch'),total:0,cair:0,gagal:0,tunggu:0,ntb:0,sub:0,plafond:0,cairPlafond:0,noa:0,ntbNoa:0,etbNoa:0};let x=group[k];x.total+=nval(r,'total_pengajuan');x.cair+=nval(r,'sudah_cair_count');x.gagal+=nval(r,'gagal_dicairkan_count');x.tunggu+=nval(r,'menunggu_pencairan_count');x.ntb+=nval(r,'ntb_count');x.sub+=nval(r,'subsequent_count');x.plafond+=nval(r,'total_plafond');x.cairPlafond+=nval(r,'sudah_cair_plafond');x.noa+=nval(r,'disbursed_noa');x.ntbNoa+=nval(r,'ntb_disbursed_noa');x.etbNoa+=nval(r,'etb_disbursed_noa')});
 const dRows=Object.values(group).sort((a,b)=>b.cairPlafond-a.cairPlafond).map(x=>[x.regional,x.area,x.branch,fmt(x.total),fmt(x.cair),pct(x.total?x.cair/x.total:NaN),'Rp '+fmt(x.cairPlafond),fmt(x.noa),fmt(x.ntbNoa),fmt(x.etbNoa),fmt(x.gagal),fmt(x.tunggu)]);
 $('disbDetail').innerHTML=dRows.length?table(['Regional','Area','Branch','Total record','Loan cair','Cair rate','Total disbursement','NOA disbursement','NOA NTB','NOA ETB','Gagal','Menunggu'],dRows):'<div class="empty">Tidak ada data sesuai filter.</div>';
}
function setTab(tab){const repayment=tab==='repayment';$('repaymentView').classList.toggle('active',repayment);$('disbursementView').classList.toggle('active',!repayment);$('tabRepayment').classList.toggle('active',repayment);$('tabDisbursement').classList.toggle('active',!repayment);if(!repayment)renderDisbursement()}
$('tabRepayment').addEventListener('click',()=>setTab('repayment'));$('tabDisbursement').addEventListener('click',()=>setTab('disbursement'));
(async function loadDisbursementData(){[disbKP,poiRows,ntbRows,etbRows]=await Promise.all([readCSVPath('./data/daily_kp_by_branch.csv'),readCSVPath('./data/poi_ntb_funnel_by_branch.csv'),readCSVPath('./data/ntb_interested_by_branch.csv'),readCSVPath('./data/etb_interested_by_branch.csv')]);renderDisbursement()})();
