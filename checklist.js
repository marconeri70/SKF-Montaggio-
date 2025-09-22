/* Checklist Montaggio · CH 24
   Funzioni:
   - Stato in localStorage
   - Riepilogo 5S con percentuali in tempo reale (clicca e salta alla sezione)
   - Punteggio per voce 0/1/3/5 (bottoni azzurri)
   - Data: evidenzia ritardo se < oggi; inoltre se si "salta un giorno"
     rispetto a lastEntry[S] -> segna overdue alla riapertura
   - Popup "i" colorato a tema S
   - Comprimi / Espandi
   - PIN su azioni sensibili: duplicazione (+) e cestino (rosso) – chiede PIN ogni volta
*/

const STORAGE_KEY = 'skf5s:montaggio-ch24';
const PIN_CODE = '2486'; // PIN reale (richiesto ad ogni azione sensibile)

const COLORS = {
  '1S':'#7c4dff','2S':'#ef5350','3S':'#f2b532','4S':'#22c55e','5S':'#1e54ff'
};
const DESC = {
  '1S':'Eliminare ciò che non serve. Rimuovi il superfluo e crea un’area essenziale.',
  '2S':'Un posto per tutto e tutto al suo posto. Organizza in modo visibile.',
  '3S':'Pulire e prevenire lo sporco. Mantieni cause e fonti sotto controllo.',
  '4S':'Regole e segnali chiari. Standard e visual management.',
  '5S':'Disciplina e miglioramento continuo. Abitudine alla verifica.'
};

function todayStr(){
  const d = new Date();
  return d.toISOString().slice(0,10);
}
function parseDate(s){ return new Date(s+'T00:00:00'); }
function daysBetween(a,b){
  const A = parseDate(a), B = parseDate(b);
  return Math.round((B-A)/(1000*60*60*24));
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){ return null; }
}
function saveState(s){ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

function ensureState(){
  const s = loadState();
  if(s) return s;
  const init = {
    area:'CH 24', reparto:'Montaggio',
    scores:{'1S':0,'2S':0,'3S':0,'4S':0,'5S':0},
    items:{'1S':[newItem()], '2S':[newItem()], '3S':[newItem()], '4S':[newItem()], '5S':[newItem()]},
    lastEntry:{}
  };
  saveState(init);
  return init;
}

function newItem(){
  return { title:'', operator:'', notes:'', date: todayStr(), score:null, overdue:false };
}

function askPin(){
  const v = prompt('Inserisci PIN per procedere:');
  return v === PIN_CODE;
}

function renderSummary(state){
  const sum = document.getElementById('summary');
  sum.innerHTML = ['1S','2S','3S','4S','5S'].map(S=>{
    const v = state.scores[S]||0;
    const color = COLORS[S];
    return `<button class="chip ${S.toLowerCase()}" style="box-shadow:inset 0 0 0 2px ${color}" data-jump="${S}">${S} ${v}%</button>`;
  }).join('');
  sum.querySelectorAll('[data-jump]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-jump');
      document.getElementById('sec-'+id)?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
}

function avgOf(items){
  const nums = items.map(it=> typeof it.score==='number' ? it.score : null).filter(v=> v!==null);
  if(!nums.length) return 0;
  // Trasforma 0/1/3/5 in %
  const perc = nums.map(v => Math.round((v/5)*100));
  return Math.round( perc.reduce((a,b)=>a+b,0)/perc.length );
}

function computeAll(state){
  // aggiorna score per S
  for(const S of ['1S','2S','3S','4S','5S']){
    state.scores[S] = avgOf(state.items[S]||[]);
  }
  // kpi in alto
  const avg = Math.round((Object.values(state.scores).reduce((a,b)=>a+b,0))/5);
  document.getElementById('avgScore').textContent = `${avg}%`;

  const late = countLate(state);
  document.getElementById('lateCount').textContent = late;
}

function countLate(state){
  let n=0;
  for(const S of ['1S','2S','3S','4S','5S']){
    const arr = state.items[S]||[];
    if(arr.some(it=> it.overdue===true)) n++;
  }
  return n;
}

function checkOverdueFlags(state){
  const t = todayStr();
  for(const S of ['1S','2S','3S','4S','5S']){
    const arr = state.items[S]||[];
    // se l'ultima data compilata è più vecchia di 1 giorno -> ritardo
    const last = state.lastEntry[S];
    if(last && daysBetween(last, t) > 1){
      // segna come overdue la prima voce aperta
      if(arr.length){ arr[0].overdue = true; }
    }
    // inoltre: se una voce ha data < oggi => overdue
    arr.forEach(it=>{
      it.overdue = (it.date && it.date < t) ? true : it.overdue;
    });
  }
}

function openInfo(S){
  const dlg = document.getElementById('infoDialog');
  document.getElementById('infoDot').style.background = COLORS[S];
  document.getElementById('infoTitle').textContent = `${S} — ${['','Selezionare','Sistemare','Splendere','Standardizzare','Sostenere'][+S[0]]}`;
  document.getElementById('infoText').textContent = DESC[S];
  dlg.showModal();
}

function renderSections(state){
  const host = document.getElementById('sections');
  host.innerHTML = '';

  for(const S of ['1S','2S','3S','4S','5S']){
    const items = state.items[S]||[];
    const color = COLORS[S];
    const sec = document.createElement('div');
    sec.className = `card s-card ${S.toLowerCase()}`;
    sec.id = `sec-${S}`;

    const titleTxt = {
      '1S':'1S — Selezionare',
      '2S':'2S — Sistemare',
      '3S':'3S — Splendere',
      '4S':'4S — Standardizzare',
      '5S':'5S — Sostenere'
    }[S];

    const head = document.createElement('div');
    head.className = 's-head';
    head.innerHTML = `
      <div style="width:34px;height:14px;border-radius:6px;background:${color}"></div>
      <div class="s-title ${S.toLowerCase()}">${titleTxt}</div>
      <div class="s-tools">
        <div class="s-val">Valore: <b>${state.scores[S]||0}%</b></div>
        <button class="s-btn i-btn" title="Info">i</button>
        <button class="s-btn plus-btn" title="Duplica voce">+</button>
      </div>
    `;
    sec.appendChild(head);

    const details = document.createElement('details');
    details.className = 'details';
    details.open = true;
    details.innerHTML = `<summary>Dettagli</summary>`;
    const body = document.createElement('div');
    body.className = 'body';

    items.forEach((it, idx)=>{
      const card = document.createElement('div');
      card.className = `card ${it.overdue?'overdue':''}`;
      card.style.marginTop = '10px';

      card.innerHTML = `
        <div class="row">
          <input class="input" data-key="operator" placeholder="Responsabile / Operatore" value="${it.operator||''}" />
        </div>
        <div class="row" style="margin-top:8px">
          <textarea class="input" data-key="notes" placeholder="Note...">${it.notes||''}</textarea>
        </div>
        <div class="row" style="margin-top:8px;flex-wrap:wrap">
          <div class="score">
            <div class="p ${it.score===0?'active':''}" data-score="0">0</div>
            <div class="p ${it.score===1?'active':''}" data-score="1">1</div>
            <div class="p ${it.score===3?'active':''}" data-score="3">3</div>
            <div class="p ${it.score===5?'active':''}" data-score="5">5</div>
          </div>
          <input type="date" class="input" data-key="date" value="${it.date||todayStr()}" style="max-width:210px" />
          <button class="s-btn trash-btn" title="Elimina voce">🗑</button>
        </div>
      `;
      // event handlers
      // testo
      card.querySelectorAll('[data-key]').forEach(el=>{
        el.addEventListener('change', e=>{
          const key = el.getAttribute('data-key');
          it[key] = el.value;
          if(key==='date'){
            const t = todayStr();
            it.overdue = it.date < t;
            card.classList.toggle('overdue', it.overdue);
          }
          saveState(state); computeAll(state); renderSummary(state);
        });
      });
      // punteggi (chiedi PIN per ogni click che modifica)
      card.querySelectorAll('.p').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const val = +btn.getAttribute('data-score');
          if(it.score === val) return;
          if(!askPin()) return;
          it.score = val;
          state.lastEntry[S] = todayStr();
          saveState(state);
          renderAll(); // ricalcola e ridisegna
        });
      });
      // cestino con PIN
      card.querySelector('.trash-btn').addEventListener('click', ()=>{
        if(!askPin()) return;
        items.splice(idx,1);
        if(!items.length) items.push(newItem());
        saveState(state);
        renderAll();
      });

      body.appendChild(card);
    });

    details.appendChild(body);
    sec.appendChild(details);
    host.appendChild(sec);

    // head buttons
    head.querySelector('.i-btn').addEventListener('click', ()=> openInfo(S));
    head.querySelector('.plus-btn').addEventListener('click', ()=>{
      if(!askPin()) return;
      items.push(newItem());
      saveState(state);
      renderAll();
    });
  });

  // hash -> vai alla S
  const hash = location.hash.replace('#','');
  if(hash && document.getElementById('sec-'+hash)){
    document.getElementById('sec-'+hash).scrollIntoView({behavior:'smooth'});
  }
}

function renderAll(){
  const state = ensureState();
  checkOverdueFlags(state);
  computeAll(state);
  renderSummary(state);
  renderSections(state);
  saveState(state);
}

document.addEventListener('DOMContentLoaded', ()=>{
  // toggle all
  document.getElementById('toggleAll').addEventListener('click', ()=>{
    document.querySelectorAll('.details').forEach(d=> d.open = !d.open);
  });
  // lock button: chiede PIN prima di ogni vera azione – lo manteniamo come “icona informativa”
  const lockBtn = document.getElementById('lockBtn');
  lockBtn.addEventListener('click', ()=>{
    alert('Le modifiche richiedono PIN e vengono richieste al momento dell’azione (punteggi, duplica, elimina).');
  });

  renderAll();
});
