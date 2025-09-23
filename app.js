const NS = 'skf5s:montaggio';
const DATA_KEY = `${NS}:data`;
const CH_NAME_KEY = `${NS}:chName`;
const PIN_KEY = `${NS}:pin`;
const DEFAULT_PIN = '2468';
const getPin = () => localStorage.getItem(PIN_KEY) || DEFAULT_PIN;

async function askPin(message='Inserisci PIN'){
  const dlg = document.getElementById('dlg-pin');
  document.getElementById('pin-msg').textContent = message;
  document.getElementById('pin-input').value='';
  dlg.showModal();
  const ok = await new Promise(res=>{
    const go = document.getElementById('pin-ok');
    const on=()=>{ dlg.close(); res(true); };
    go.addEventListener('click', on, {once:true});
    dlg.addEventListener('close', ()=>res(false), {once:true});
  });
  if(!ok) return false;
  return document.getElementById('pin-input').value === getPin();
}

function getCH(){ return localStorage.getItem(CH_NAME_KEY) || 'CH 24 — Montaggio'; }
function setCH(n){ localStorage.setItem(CH_NAME_KEY, n); renderCH(); }
function renderCH(){ document.querySelectorAll('[data-ch]').forEach(el=>el.textContent=getCH()); }

function loadData(){
  try{
    const d = JSON.parse(localStorage.getItem(DATA_KEY));
    return d || {scores:{'1S':0,'2S':0,'3S':0,'4S':0,'5S':0}, late:[]};
  }catch{ return {scores:{'1S':0,'2S':0,'3S':0,'4S':0,'5S':0}, late:[]}; }
}

/* === Grafico responsive Canvas === */
function drawChart(){
  const {scores, late} = loadData();
  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');

  // altezza dinamica su mobile
  const W = canvas.parentElement.clientWidth - 2;
  const H = (W < 520 ? 240 : 260);
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  canvas.style.width = W+'px'; canvas.style.height = H+'px';
  canvas.width = W*DPR; canvas.height = H*DPR; ctx.scale(DPR,DPR);
  ctx.clearRect(0,0,W,H);

  const labels = ['1S','2S','3S','4S','5S','Ritardi'];
  const vals = [scores['1S']||0,scores['2S']||0,scores['3S']||0,scores['4S']||0,scores['5S']||0,(late||[]).length*20];
  const colors = ['#7e57c2','#ef5350','#f1b21a','#22c55e','#2563eb','#ef4444'];

  const isMobile = W < 520;
  const pad = {l: isMobile? 32:36, r:16, t:isMobile? 18:24, b:isMobile? 34:40};
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const n = labels.length; const gap = isMobile? 12:18;
  const barW = Math.min(isMobile? 42:60, (innerW - gap*(n-1)) / n);

  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
  ctx.fillStyle = '#94a3b8'; ctx.font = (isMobile? '11px':'12px')+' system-ui';
  for(let v=0; v<=100; v+=20){
    const y = pad.t + innerH - (v/100)*innerH;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W-pad.r, y); ctx.stroke();
    ctx.fillText(v+'%', 4, y+4);
  }

  ctx.font = (isMobile? '12px':'12px')+' system-ui';
  labels.forEach((lab,i)=>{
    const x = pad.l + i*(barW+gap);
    const v = vals[i];
    const h = (v/100)*innerH;
    const y = pad.t + innerH - h;

    ctx.fillStyle = colors[i];
    ctx.fillRect(x, y, barW, h);

    const txt = (i===5? (late.length||0) : v) + '%';
    const tw = ctx.measureText(txt).width;
    ctx.fillStyle='#fff';
    ctx.fillRect(x + barW/2 - (tw/2+6), y-18, tw+12, 16);
    ctx.fillStyle='#111827';
    ctx.fillText(txt, x + barW/2 - tw/2, y-5);

    const lbw = ctx.measureText(lab).width;
    ctx.fillText(lab, x + barW/2 - lbw/2, pad.t + innerH + 14);
  });

  // bottoni "S in ritardo"
  const cont = document.getElementById('lateButtons');
  cont.innerHTML = '';
  const map = {'1S':'#7e57c2','2S':'#ef5350','3S':'#f1b21a','4S':'#22c55e','5S':'#2563eb'};
  (late||[]).forEach(k=>{
    const b = document.createElement('a');
    b.className='late'; b.style.color = map[k] || '#111827';
    b.textContent = `${k} in ritardo`; b.href = 'checklist.html#'+k;
    cont.appendChild(b);
  });
}

/* Export + lock (identici) */
async function exportForSupervisor(){
  if(!(await askPin('PIN per esportare i dati'))) return;
  const payload = {app:'SKF-5S', area:'Montaggio', ch:getCH(), timestamp:new Date().toISOString(), data:loadData()};
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `SKF-5S-Montaggio-${getCH().replace(/\s+/g,'_')}.json`; a.click(); URL.revokeObjectURL(a.href);
}

function init(){
  renderCH(); drawChart();
  document.getElementById('btn-export').addEventListener('click', exportForSupervisor);
  document.getElementById('btn-lock').addEventListener('click', async ()=>{
    if(!(await askPin('PIN per rinominare il canale'))) return;
    const name = prompt('Nuovo nome canale:', getCH());
    if(name && name.trim()) setCH(name.trim());
  });
  window.addEventListener('resize', drawChart);
}
window.addEventListener('storage', e=>{ if(e.key===DATA_KEY) drawChart(); });
document.addEventListener('DOMContentLoaded', init);
