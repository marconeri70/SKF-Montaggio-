/* ====== Chiavi storage (Montaggio) ====== */
const NS = 'skf5s:montaggio';
const DATA_KEY = `${NS}:data`;        // dati checklist (percentuali/ritardi)
const CH_NAME_KEY = `${NS}:chName`;   // titolo canale

/* ====== PIN ====== */
const PIN_KEY = `${NS}:pin`;
const DEFAULT_PIN = '2468';
const getPin = () => localStorage.getItem(PIN_KEY) || DEFAULT_PIN;

async function askPin(message='Inserisci PIN'){
  const dlg = document.getElementById('dlg-pin');
  document.getElementById('pin-msg').textContent = message;
  document.getElementById('pin-input').value='';
  dlg.showModal();
  const result = await new Promise(res=>{
    const ok = document.getElementById('pin-ok');
    const onOk = e => { dlg.close(); res(true); };
    ok.addEventListener('click', onOk, {once:true});
    dlg.addEventListener('close',()=>res(false),{once:true});
  });
  if(!result) return false;
  return document.getElementById('pin-input').value === getPin();
}

/* ====== CH name ====== */
function getCH(){ return localStorage.getItem(CH_NAME_KEY) || 'CH 24 — Montaggio'; }
function setCH(name){ localStorage.setItem(CH_NAME_KEY, name); renderCH(); }
function renderCH(){ document.querySelectorAll('[data-ch]').forEach(el=>el.textContent=getCH()); }

/* ====== Dati (vengono scritti dalla checklist) ====== */
function loadData(){
  try{
    const d = JSON.parse(localStorage.getItem(DATA_KEY));
    return d || {scores:{'1S':0,'2S':0,'3S':0,'4S':0,'5S':0}, late:[]};
  }catch{ return {scores:{'1S':0,'2S':0,'3S':0,'4S':0,'5S':0}, late:[]}; }
}

/* ====== Grafico Canvas senza sovrapposizioni ====== */
function drawChart(){
  const {scores, late} = loadData();
  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const W = canvas.clientWidth, H = canvas.height;
  canvas.width = W * DPR; canvas.height = H * DPR; ctx.scale(DPR,DPR);
  ctx.clearRect(0,0,W,H);

  const labels = ['1S','2S','3S','4S','5S','Ritardi'];
  const vals = [scores['1S']||0,scores['2S']||0,scores['3S']||0,scores['4S']||0,scores['5S']||0,(late||[]).length*20];
  const colors = ['#7e57c2','#ef5350','#f1b21a','#22c55e','#2563eb','#ef4444'];

  const pad = {l:36,r:16,t:24,b:40};
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const max = 100;
  const n = labels.length;
  const gap = 18;
  const barW = Math.min(60, (innerW - gap*(n-1)) / n);

  // asse Y (orizzontali soft)
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
  for(let v=0; v<=100; v+=20){
    const y = pad.t + innerH - (v/max)*innerH;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W-pad.r, y); ctx.stroke();
    ctx.fillStyle = '#94a3b8'; ctx.font = '12px system-ui';
    ctx.fillText(v+'%', 4, y+4);
  }

  labels.forEach((lab,i)=>{
    const x = pad.l + i*(barW+gap);
    const v = vals[i];
    const h = (v/max)*innerH;
    const y = pad.t + innerH - h;

    // barra
    ctx.fillStyle = colors[i];
    ctx.fillRect(x, y, barW, h);

    // percentuale sopra (con sfondo bianco piccolo per evitare "mozzature")
    const txt = (i===5? (late.length||0) : v)+'%';
    const tw = ctx.measureText(txt).width;
    ctx.fillStyle='#fff'; ctx.fillRect(x + barW/2 - (tw/2+6), y-20, tw+12, 18);
    ctx.fillStyle='#111827'; ctx.font='12px system-ui';
    ctx.fillText(txt, x + barW/2 - tw/2, y-6);

    // etichetta sotto
    ctx.fillStyle = '#111827';
    const lbw = ctx.measureText(lab).width;
    ctx.fillText(lab, x + barW/2 - lbw/2, pad.t + innerH + 16);
  });

  // bottoni sezioni in ritardo
  const cont = document.getElementById('lateButtons');
  cont.innerHTML = '';
  const map = {'1S':'#7e57c2','2S':'#ef5350','3S':'#f1b21a','4S':'#22c55e','5S':'#2563eb'};
  (late||[]).forEach(k=>{
    const b = document.createElement('a');
    b.className='late';
    b.style.color = map[k] || '#111827';
    b.textContent = `${k} in ritardo`;
    b.href = 'checklist.html#'+k;
    cont.appendChild(b);
  });
}

/* ====== Export (JSON) con PIN ====== */
async function exportForSupervisor(){
  if(!(await askPin('PIN per esportare i dati'))) return;
  const payload = {
    app:'SKF-5S', area:'Montaggio', ch:getCH(),
    timestamp:new Date().toISOString(),
    data: loadData()
  };
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `SKF-5S-Montaggio-${getCH().replace(/\s+/g,'_')}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ====== Avvio ====== */
function init(){
  renderCH();
  drawChart();
  document.getElementById('btn-export').addEventListener('click', exportForSupervisor);
  document.getElementById('btn-lock').addEventListener('click', async ()=>{
    if(!(await askPin('PIN per rinominare il canale'))) return;
    const name = prompt('Nuovo nome canale:', getCH());
    if(name && name.trim()) setCH(name.trim());
  });
  // ridisegna al resize
  window.addEventListener('resize', drawChart);
}
// ridisegna se la checklist aggiorna localStorage
window.addEventListener('storage', e=>{ if(e.key===DATA_KEY) drawChart(); });

document.addEventListener('DOMContentLoaded', init);
