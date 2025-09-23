/* ====== CH name with PIN ====== */
const CH_KEY = 'skf_ch_name';
const PIN_KEY = 'skf_pin';          // store hashed (simple) – here demo plain to keep offline
const DEFAULT_CH = 'CH 24 — Montaggio';
const DEFAULT_PIN = '2468';

function getCH(){ return localStorage.getItem(CH_KEY) || DEFAULT_CH; }
function setCH(name){ localStorage.setItem(CH_KEY, name || DEFAULT_CH); renderCH(); }

function getPIN(){ return localStorage.getItem(PIN_KEY) || DEFAULT_PIN; }
function askPIN(msg='Inserisci PIN'){ const p = prompt(msg); return p === getPIN(); }

function askRenameCH(){
  if(!askPIN('PIN per rinominare il canale')) return;
  const current = getCH();
  const val = prompt('Nuovo nome canale (es. "CH 24 — Montaggio")', current);
  if(val && val.trim()) setCH(val.trim());
}

function renderCH(){
  document.querySelectorAll('[data-ch]').forEach(el=> el.textContent = getCH());
}

/* ====== Demo data structure in localStorage ====== */
const LS_DATA = 'skf5s_data';
function loadData(){
  const raw = localStorage.getItem(LS_DATA);
  if(raw) try { return JSON.parse(raw); } catch(e){}
  // initial empty structure
  const base = {
    ch: getCH(),
    sections: [
      { key:'1S', color:'s1', title:'1S — Selezionare', value:0, items:[] },
      { key:'2S', color:'s2', title:'2S — Sistemare',   value:0, items:[] },
      { key:'3S', color:'s3', title:'3S — Splendere',   value:0, items:[] },
      { key:'4S', color:'s4', title:'4S — Standardizzare', value:0, items:[] },
      { key:'5S', color:'s5', title:'5S — Sostenere',   value:0, items:[] }
    ]
  };
  localStorage.setItem(LS_DATA, JSON.stringify(base));
  return base;
}
function saveData(d){ d.ch = getCH(); localStorage.setItem(LS_DATA, JSON.stringify(d)); }

/* ====== HOME (index) ====== */
let _homeChart;
function renderHomeChart(canvasId, lateButtonsId){
  const d = loadData();
  // compute late
  const lateBy = { '1S':0,'2S':0,'3S':0,'4S':0,'5S':0 };
  d.sections.forEach(s=>{
    s.items.forEach(it=>{
      if(isLate(it.date)) lateBy[s.key]++;
    });
  });

  const labels = ['1S','2S','3S','4S','5S','Ritardi'];
  const values = [
    percent(d.sections[0].value),
    percent(d.sections[1].value),
    percent(d.sections[2].value),
    percent(d.sections[3].value),
    percent(d.sections[4].value),
    lateTotal(lateBy)
  ];
  const colors = ['#7c4dff','#ef4444','#f59e0b','#22c55e','#2563eb','#ef4444'];

  const ctx = document.getElementById(canvasId).getContext('2d');
  if(_homeChart) _homeChart.destroy();
  _homeChart = new Chart(ctx,{
    type:'bar',
    data:{ labels, datasets:[{ data: values, backgroundColor: colors, borderWidth:0 }]},
    options:{
      scales:{ y:{ beginAtZero:true, grid:{display:false}, ticks:{ callback:v=> v+'%' } },
               x:{ grid:{display:false} } },
      plugins:{
        legend:{display:false},
        tooltip:{callbacks:{label:(ctx)=> ctx.parsed.y + (ctx.label==='Ritardi'?'':'%')}},
        datalabels:false
      }
    }
  });

  // Late buttons
  const lateWrap = document.getElementById(lateButtonsId);
  lateWrap.innerHTML = '';
  Object.entries(lateBy).forEach(([k,cnt])=>{
    if(cnt>0){
      const btn = document.createElement('button');
      btn.className = 'btn ghost '+colorClass(k);
      btn.textContent = `${k} in ritardo (${cnt})`;
      btn.onclick = ()=> location.href = `checklist.html#${k}`;
      lateWrap.appendChild(btn);
    }
  });
}
function percent(v){ return Math.max(0, Math.min(100, Number(v)||0)); }
function lateTotal(map){ return Object.values(map).reduce((a,b)=>a+b,0); }
function colorClass(key){ return { '1S':'s1','2S':'s2','3S':'s3','4S':'s4','5S':'s5' }[key]||''; }

/* ====== CHECKLIST ====== */
function mountChecklist(cfg){
  const els = {
    pills: document.getElementById(cfg.pillsEl),
    cards: document.getElementById(cfg.cardsEl),
    avg:   document.getElementById(cfg.avgEl),
    late:  document.getElementById(cfg.lateEl),
    toggle:document.getElementById(cfg.toggleBtn),
    lock:  document.getElementById(cfg.lockBtn)
  };
  let unlocked = false;

  const data = loadData();

  // pills
  function renderPills(){
    els.pills.innerHTML = '';
    data.sections.forEach(s=>{
      const pill = document.createElement('button');
      pill.className = `pill ${s.color}`;
      pill.textContent = `${s.key} ${percent(s.value)}%`;
      pill.onclick = ()=> {
        document.getElementById(`card-${s.key}`).scrollIntoView({behavior:'smooth',block:'start'});
      };
      els.pills.appendChild(pill);
    });
  }

  // late count + avg
  function recomputeStats(){
    let sum = 0, count = 0, late = 0;
    data.sections.forEach(s=>{
      sum += percent(s.value); count++;
      s.items.forEach(i=> { if(isLate(i.date)) late++; });
    });
    els.avg.textContent  = Math.round(sum/(count||1)) + '%';
    els.late.textContent = late;
    saveData(data);
  }

  // cards
  function renderCards(){
    els.cards.innerHTML = '';
    data.sections.forEach(s=>{
      const card = document.createElement('article');
      card.className = `card-s ${s.color}`;
      card.id = `card-${s.key}`;

      if(s.items.some(i=>isLate(i.date))) card.classList.add('late');

      card.innerHTML = `
        <div class="title">
          <div class="dot ${s.color}" style="width:44px;height:16px;border-radius:6px;background:var(--${s.color});"></div>
          <div class="ttext">${s.title}</div>
          <span class="badge">Valore: ${percent(s.value)}%</span>
          <button class="info" aria-label="Info" data-info>i</button>
          <button class="add" data-add title="Duplica scheda (+, PIN)">+</button>
        </div>
        <details class="details" open>
          <summary>Dettagli</summary>
          <div class="row">
            <input type="text" placeholder="Responsabile / Operatore" data-field="who" />
            <textarea rows="2" placeholder="Note..." data-field="note"></textarea>
            <div class="pts">
              ${[0,1,3,5].map(v=>`<button class="p" data-pt="${v}">${v}</button>`).join('')}
              <input type="date" data-field="date" />
              <button class="del" data-del title="Elimina (PIN)">🗑</button>
            </div>
          </div>
        </details>
      `;

      // events
      const ptBtns = card.querySelectorAll('[data-pt]');
      ptBtns.forEach(b=>{
        b.addEventListener('click',()=>{
          if(!unlocked && !askPIN('PIN per modificare')) return;
          ptBtns.forEach(x=>x.classList.remove('active'));
          b.classList.add('active');
          s.value = Number(b.dataset.pt) * 20;  // 0/1/3/5 => 0/20/60/100
          card.querySelector('.badge').textContent = `Valore: ${percent(s.value)}%`;
          renderPills();
          recomputeStats();
        });
      });

      card.querySelector('[data-field="date"]').addEventListener('change', (e)=>{
        if(!unlocked && !askPIN('PIN per modificare')) { e.preventDefault(); return; }
        const v = e.target.value;
        // store last date item
        const todayItem = { date:v, who:'', note:'' };
        s.items = [todayItem]; // singolo record giornaliero semplice
        // late highlight
        if(isLate(v)) card.classList.add('late'); else card.classList.remove('late');
        recomputeStats();
      });

      card.querySelector('[data-del]').addEventListener('click', ()=>{
        if(!askPIN('PIN per eliminare')) return;
        s.value = 0; s.items = [];
        renderPills(); recomputeStats(); renderCards();
      });

      card.querySelector('[data-add]').addEventListener('click', ()=>{
        if(!askPIN('PIN per duplicare')) return;
        const idx = data.sections.findIndex(x=>x.key===s.key);
        const clone = JSON.parse(JSON.stringify(s));
        data.sections.splice(idx+1,0,clone);
        renderPills(); renderCards(); recomputeStats();
      });

      // info popup color themed
      card.querySelector('[data-info]').addEventListener('click', ()=>{
        alert(`${s.title}\n\n`+infoText(s.key));
      });

      els.cards.appendChild(card);
    });
  }

  // Toggle all details
  els.toggle.addEventListener('click', ()=>{
    document.querySelectorAll('.cards details').forEach(d=>{
      d.open = !d.open;
    });
  });

  els.lock.addEventListener('click', ()=>{
    if(askPIN('PIN per sbloccare le modifiche')) {
      unlocked = true;
      setTimeout(()=> unlocked=false, 90*1000); // auto-lock dopo 90s
    }
  });

  renderPills(); renderCards(); recomputeStats();

  // deep link da home: checklist.html#3S
  const hash = location.hash.replace('#','').toUpperCase();
  if(hash){
    const t = document.getElementById(`card-${hash}`);
    if(t) setTimeout(()=> t.scrollIntoView({behavior:'smooth',block:'start'}),100);
  }
}

/* ====== Utils ====== */
function infoText(key){
  switch(key){
    case '1S': return 'Eliminare il superfluo, tenere solo ciò che serve.';
    case '2S': return 'Un posto per tutto e tutto al suo posto.';
    case '3S': return 'Pulire e prevenire lo sporco alla fonte.';
    case '4S': return 'Standardizzare con regole e segnali chiari.';
    case '5S': return 'Sostenere con disciplina e abitudini stabili.';
    default: return '';
  }
}
function isLate(iso){
  if(!iso) return false;
  // Regola richiesta: in ritardo se la data è prima di OGGI (anche ieri).
  const d = new Date(iso); d.setHours(0,0,0,0);
  const t = new Date();    t.setHours(0,0,0,0);
  return d < t;
}

/* ====== Export Supervisor (JSON) ====== */
function exportForSupervisor(){
  if(!askPIN('PIN per esportare')) return;
  const d = loadData();
  d.ch = getCH(); // assicurare nome aggiornato
  const blob = new Blob([JSON.stringify(d,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${d.ch.replaceAll(' ','_')}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
