const fmt=n=>Number(n||0).toLocaleString('id-ID',{maximumFractionDigits:0});
const money=n=>'Rp '+Number(n||0).toLocaleString('id-ID',{maximumFractionDigits:0});
const pct=n=>n==null?'—':(Number(n)*100).toLocaleString('id-ID',{maximumFractionDigits:1})+'%';
const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
let DATA, bucketChart, rrChart, riskChart, disbChart, cycleChart;
const buckets=['DPD 0','DPD 1–30','DPD 31–60','DPD 61–90','DPD 90+'];
const keyMap={'DPD 0':'dpd_0','DPD 1–30':'dpd_1_30','DPD 31–60':'dpd_31_60','DPD 61–90':'dpd_61_90','DPD 90+':'dpd_90'};
const $=id=>document.getElementById(id);
async function init(){try{const r=await fetch('data/data.json');if(!r.ok)throw new Error('data.json tidak ditemukan');DATA=await r.json();$('sourceInfo').textContent=`Cutoff ${DATA.overall.snapshot_cutoff} • Progres ${DATA.overall.week_progress} • Dibuat ${DATA.meta.generated_at}`;populateFilters();render();document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));$('quality').classList.toggle('hide',b.dataset.tab!=='quality');$('disb').classList.toggle('hide',b.dataset.tab!=='disb')});['region','area','branch','search'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',()=>{if(id==='region')updateArea();if(id==='region'||id==='area')updateBranch();render()}));}catch(e){$('sourceInfo').textContent='Gagal memuat data. Pastikan folder data/data.json ikut di-upload. '+e.message;}}
function populateFilters(){const regions=[...new Set(DATA.branches.map(x=>x.region_name))].sort();$('region').innerHTML='<option value="">Semua Regional</option>'+regions.map(x=>`<option>${esc(x)}</option>`).join('');updateArea();updateBranch()}
function updateArea(){let r=$('region').value;let a=[...new Set(DATA.branches.filter(x=>!r||x.region_name===r).map(x=>x.area_name))].sort();$('area').innerHTML='<option value="">Semua Area</option>'+a.map(x=>`<option>${esc(x)}</option>`).join('');}
function updateBranch(){let r=$('region').value,a=$('area').value;let b=[...new Set(DATA.branches.filter(x=>(!r||x.region_name===r)&&(!a||x.area_name===a)).map(x=>x.branch_name))].sort();$('branch').innerHTML='<option value="">Semua Branch</option>'+b.map(x=>`<option>${esc(x)}</option>`).join('');}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function filtered(){let r=$('region').value,a=$('area').value,b=$('branch').value,s=$('search').value.toLowerCase().trim();return DATA.branches.filter(x=>(!r||x.region_name===r)&&(!a||x.area_name===a)&&(!b||x.branch_name===b)&&(!s||x.branch_name.toLowerCase().includes(s)));}
function sum(rows,k){return rows.reduce((a,x)=>a+(Number(x[k])||0),0)}
function cardsHTML(items){return items.map((x,i)=>`<div class="card"><div class="label"><span class="dot" style="background:${x.color||'#66a8ff'}"></span>${x.label}</div><div class="value">${x.value}</div><div class="foot">${x.foot||''}</div></div>`).join('')}
function render(){const rows=filtered();const total=sum(rows,'active_loan_count'),mitra=sum(rows,'unique_mitra'),os=sum(rows,'total_os_new'),arrears=sum(rows,'total_tunggakan'),paid=sum(rows,'paid_noa');$('cards').innerHTML=cardsHTML([{label:'Active Loan',value:fmt(total),foot:'Loan ID unik; status bukan CLOSED',color:'#66a8ff'},{label:'Mitra Unik',value:fmt(mitra),foot:'Customer number unik per cabang agregat',color:'#4ed9d0'},{label:'DPD 0 / Lancar',value:fmt(sum(rows,'dpd_0_noa')),foot:pct(total?sum(rows,'dpd_0_noa')/total:0)+' dari active loan',color:'#44d19d'},{label:'DPD 1–60',value:fmt(sum(rows,'dpd_1_30_noa')+sum(rows,'dpd_31_60_noa')),foot:'Gabungan tunggakan awal',color:'#ffc857'},{label:'DPD 90+',value:fmt(sum(rows,'dpd_90_noa')),foot:pct(total?sum(rows,'dpd_90_noa')/total:0)+' dari active loan',color:'#ff6f7d'}]);
renderBucket(rows);renderRR(rows);renderRisk(rows);renderTable(rows);renderBPTable();renderMovement(rows);renderDisb(rows)}
function renderBucket(rows){let vals=buckets.map(b=>sum(rows,keyMap[b]+'_noa'));if(bucketChart)bucketChart.destroy();bucketChart=new Chart($('bucketChart'),{type:'bar',data:{labels:buckets,datasets:[{label:'Active Loan',data:vals,backgroundColor:['#44d19d','#ffc857','#ffad66','#ff8a7a','#ff6f7d'],borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#9caec8'},grid:{display:false}},y:{ticks:{color:'#9caec8'},grid:{color:'#263650'}}}}})}
function renderRR(rows){let vals=buckets.map(b=>{let k=keyMap[b];let noa=sum(rows,k+'_noa'),paid=sum(rows,k+'_paid_noa');return noa?paid/noa*100:0});if(rrChart)rrChart.destroy();rrChart=new Chart($('rrChart'),{type:'bar',data:{labels:buckets,datasets:[{label:'Paid NOA / NOA (%)',data:vals,backgroundColor:'#66a8ff',borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.raw.toFixed(1)+'%'}}},scales:{x:{ticks:{color:'#9caec8'},grid:{display:false}},y:{beginAtZero:true,max:100,ticks:{color:'#9caec8',callback:v=>v+'%'},grid:{color:'#263650'}}}}})}
function renderRisk(rows){let top=[...rows].sort((a,b)=>(b.dpd_90_noa||0)-(a.dpd_90_noa||0)).slice(0,10);if(riskChart)riskChart.destroy();riskChart=new Chart($('riskChart'),{type:'bar',data:{labels:top.map(x=>x.branch_name),datasets:[{label:'DPD 90+',data:top.map(x=>x.dpd_90_noa||0),backgroundColor:'#ff6f7d',borderRadius:4}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#9caec8'},grid:{color:'#263650'}},y:{ticks:{color:'#9caec8'},grid:{display:false}}}}})}
function renderTable(rows){
 $('branchCount').textContent=rows.length+' branch';
 $('branchTable').innerHTML=[...rows].sort((a,b)=>(b.pqi_branch||0)-(a.pqi_branch||0)).map(x=>{
 const rate=(paid,total)=>total?paid/total:0;
 const statusClass=x.branch_status==='Aspiration'||x.branch_status==='Emerging Performer'?'positive':(x.branch_status==='Need Turnaround'?'negative':'warn');
 return `<tr><td><span class="${statusClass}">${esc(x.branch_status)}</span></td><td>${esc(x.region_name)}</td><td>${esc(x.area_name)}</td><td><b>${esc(x.branch_name)}</b></td>
 <td class="num">${fmt(x.active_loan_count)}</td><td class="num">${fmt(x.paid_noa)}</td>
 <td class="num">${fmt(x.dpd_0_noa)}</td><td class="num">${fmt(x.dpd_0_paid_noa)}</td><td class="num ${rate(x.dpd_0_paid_noa,x.dpd_0_noa)>=.98?'positive':'warn'}">${pct(rate(x.dpd_0_paid_noa,x.dpd_0_noa))}</td>
 <td class="num">${fmt(x.dpd_1_30_noa)}</td><td class="num">${fmt(x.dpd_1_30_paid_noa)}</td><td class="num ${rate(x.dpd_1_30_paid_noa,x.dpd_1_30_noa)>=.55?'positive':'warn'}">${pct(rate(x.dpd_1_30_paid_noa,x.dpd_1_30_noa))}</td>
 <td class="num">${fmt(x.dpd_31_60_noa)}</td><td class="num">${fmt(x.dpd_31_60_paid_noa)}</td><td class="num ${rate(x.dpd_31_60_paid_noa,x.dpd_31_60_noa)>=.13?'positive':'warn'}">${pct(rate(x.dpd_31_60_paid_noa,x.dpd_31_60_noa))}</td>
 <td class="num">${fmt(x.dpd_61_90_noa)}</td><td class="num positive">${fmt(x.dpd_61_90_paid_noa)}</td><td class="num">${fmt(x.dpd_90_noa)}</td><td class="num positive">${fmt(x.dpd_90_paid_noa)}</td>
 <td class="num"><b>${pct(x.pqi_branch)}</b></td><td class="num">${fmt(x.noa_per_bp)}</td></tr>`;
 }).join('');
}
function renderBPTable(){
 const s=$('search').value.toLowerCase().trim();
 const rows=(DATA.bps||[]).filter(x=>
   (!$('region').value||x.region_name===$('region').value)&&
   (!$('area').value||x.area_name===$('area').value)&&
   (!$('branch').value||x.branch_name===$('branch').value)&&
   (!s||String(x.branch_name||'').toLowerCase().includes(s)||String(x.bp_name||'').toLowerCase().includes(s)||String(x.bp_id||'').toLowerCase().includes(s))
 );
 const configs=[
  ['DPD 0','dpd_0',0.98],['DPD 1–30','dpd_1_30',0.55],['DPD 31–60','dpd_31_60',0.13]
 ];
 const cell=(x,k,target)=>{
   const n=Number(x[k+'_mitra']||0), paid=Number(x[k+'_paid_mitra']||0);
   const targetPaid=target==null?null:Math.ceil(n*target);
   const gap=targetPaid==null?null:Math.max(targetPaid-paid,0);
   const rate=n?paid/n:0;
   return `<td class="num">${fmt(n)}</td><td class="num ${paid>0?'positive':''}">${fmt(paid)}</td>`+
    (targetPaid==null?`<td class="num">—</td><td class="num">—</td>`:
     `<td class="num ${rate>=target?'positive':'warn'}">${pct(rate)}</td><td class="num ${gap>0?'negative':'positive'}">${fmt(gap)}</td>`);
 };
 $('bpCount').textContent=fmt(rows.length)+' BP';
 $('bpTable').innerHTML=[...rows].sort((a,b)=>{
   const ga=Math.max(Math.ceil((a.dpd_0_mitra||0)*.98)-(a.dpd_0_paid_mitra||0),0)+Math.max(Math.ceil((a.dpd_1_30_mitra||0)*.55)-(a.dpd_1_30_paid_mitra||0),0)+Math.max(Math.ceil((a.dpd_31_60_mitra||0)*.13)-(a.dpd_31_60_paid_mitra||0),0);
   const gb=Math.max(Math.ceil((b.dpd_0_mitra||0)*.98)-(b.dpd_0_paid_mitra||0),0)+Math.max(Math.ceil((b.dpd_1_30_mitra||0)*.55)-(b.dpd_1_30_paid_mitra||0),0)+Math.max(Math.ceil((b.dpd_31_60_mitra||0)*.13)-(b.dpd_31_60_paid_mitra||0),0);
   return gb-ga;
 }).map(x=>{
   return `<tr><td>${esc(x.area_name)}</td><td>${esc(x.branch_name)}</td><td><b>${esc(x.bp_name)}</b><br><span style="color:var(--muted);font-size:9px">${esc(x.bp_id)}</span></td>
 <td class="num">${fmt(x.active_loan_count)}</td><td class="num">${fmt(x.dpd_0_paid_mitra+x.dpd_1_30_paid_mitra+x.dpd_31_60_paid_mitra+x.dpd_61_90_paid_mitra+x.dpd_90_paid_mitra)}</td>
 ${cell(x,'dpd_0',.98)}${cell(x,'dpd_1_30',.55)}${cell(x,'dpd_31_60',.13)}
 <td class="num">${fmt(x.dpd_61_90_mitra)}</td><td class="num positive">${fmt(x.dpd_61_90_paid_mitra)}</td>
 <td class="num">${fmt(x.dpd_90_mitra)}</td><td class="num positive">${fmt(x.dpd_90_paid_mitra)}</td></tr>`;
 }).join('');
}
function renderMovement(rows){const flow=sum(rows,'flow_forward'),rollback=sum(rows,'rollback'),stay=sum(rows,'stay');$('movementSummary').innerHTML=`<div class="cards" style="grid-template-columns:repeat(3,1fr);margin:0"><div class="card"><div class="label">Flow Forward*</div><div class="value negative">${fmt(flow)}</div><div class="foot">Label yang terdeteksi memburuk</div></div><div class="card"><div class="label">Rollback*</div><div class="value positive">${fmt(rollback)}</div><div class="foot">Label yang terdeteksi membaik</div></div><div class="card"><div class="label">Stay*</div><div class="value">${fmt(stay)}</div><div class="foot">Label tetap</div></div></div><p class="notes">*Klasifikasi dihitung dari kata kunci movement_label dan dapat saling overlap pada label yang memuat beberapa istilah. Validasi mapping sebelum digunakan sebagai angka resmi.</p>`}
function renderDisb(rows){const d=DATA.disbursement;const relevant=d.branches.filter(x=>(!$('region').value||x.region_name===$('region').value)&&(! $('area').value||x.area_name===$('area').value)&&(! $('branch').value||x.branch_name===$('branch').value)&&(! $('search').value||x.branch_name.toLowerCase().includes($('search').value.toLowerCase())));const total=sum(relevant,'total_applications'),plaf=sum(relevant,'total_plafond_pipeline');const cairKey=Object.keys(relevant[0]||{}).find(k=>k.startsWith('sudah_cair_loans'));const waitKey=Object.keys(relevant[0]||{}).find(k=>k.startsWith('menunggu_pencairan_loans'));const failKey=Object.keys(relevant[0]||{}).find(k=>k.startsWith('gagal_dicairkan_loans'));const cairPlaf=Object.keys(relevant[0]||{}).find(k=>k.startsWith('sudah_cair_plafond'));$('disbCards').innerHTML=cardsHTML([{label:'Total Application',value:fmt(total),foot:'Loan ID unik pada file Daily KP'},{label:'Sudah Cair',value:fmt(sum(relevant,cairKey||'')),foot:money(sum(relevant,cairPlaf||'')),color:'#44d19d'},{label:'Menunggu Pencairan',value:fmt(sum(relevant,waitKey||'')),foot:'Perlu follow-up',color:'#ffc857'},{label:'Gagal Dicairkan',value:fmt(sum(relevant,failKey||'')),foot:'Perlu investigasi',color:'#ff6f7d'},{label:'Plafon Pipeline',value:money(plaf),foot:'Bukan seluruhnya realisasi cair',color:'#66a8ff'}]);const status=d.status_summary;const labels=Object.keys(status);if(disbChart)disbChart.destroy();disbChart=new Chart($('disbChart'),{type:'doughnut',data:{labels,datasets:[{data:labels.map(k=>status[k].loans),backgroundColor:['#44d19d','#ffc857','#ff6f7d','#66a8ff','#4ed9d0']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#9caec8'}}}}});const ntb=sum(relevant,'ntb_loans'),etb=sum(relevant,'etb_loans');if(cycleChart)cycleChart.destroy();cycleChart=new Chart($('cycleChart'),{type:'bar',data:{labels:['NTB','ETB'],datasets:[{label:'Loan',data:[ntb,etb],backgroundColor:['#4ed9d0','#66a8ff'],borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#9caec8'},grid:{display:false}},y:{ticks:{color:'#9caec8'},grid:{color:'#263650'}}}}});$('disbBranchCount').textContent=relevant.length+' branch';$('disbTable').innerHTML=[...relevant].sort((a,b)=>(b.total_plafond_pipeline||0)-(a.total_plafond_pipeline||0)).map(x=>`<tr><td>${esc(x.region_name)}</td><td>${esc(x.area_name)}</td><td><b>${esc(x.branch_name)}</b></td><td class="num">${fmt(x.bp_count||0)}</td><td class="num">${fmt(x.noa_disbursement_per_bp||0)}</td><td class="num">${fmt(x.total_applications)}</td><td class="num positive">${fmt(x.sudah_cair_loans||0)}</td><td class="num warn">${fmt(x.menunggu_pencairan_loans||0)}</td><td class="num negative">${fmt(x.gagal_dicairkan_loans||0)}</td><td class="num">${money(x.total_plafond_pipeline)}</td><td class="num">${money(x.sudah_cair_plafond||0)}</td><td class="num">${fmt(x.ntb_loans)}</td><td class="num">${fmt(x.etb_loans)}</td></tr>`).join('')}
init();