/* ===== Namespace Montaggio ===== */
const NS = 'skf5s:montaggio';
const STORAGE = `${NS}:data`;
const CH_NAME_KEY = `${NS}:chName`;
const PIN_KEY = `${NS}:pin`;
const DEFAULT_PIN = '2468';
const SECTIONS = ['1S','2S','3S','4S','5S'];

const getPin = () => localStorage.getItem(PIN_KEY) || DEFAULT_PIN;
async function askPin(message='Inserisci PIN'){
  const dlg = document.getElementById('dlg-pin');
  document.getElementById('pin-msg').textContent = message;
  document.getElementById('pin-input').value='';
  dlg.showModal();
  const ok = await new Promise(res=>{
    const go = document.getElementById('pin-ok');
    const on = ()=>{ dlg.close(); res(true); };
    go.addEventListener('click', on, {once:true});
    dlg.addEventListener('close', ()=>res(false), {once:true});
  });
  if(!ok) return false;
  return document.getElementById('pin-input').value === getPin();
}

/* ===== Utils ===== */
const todayISO = () => new Date().toISOString().slice(0,10);
function daysBetween(aISO,bISO){
  const a = new Date(aISO+'T00:00:00'), b = new Date(bISO+'T00:00:00');
  return Math.round((b-a)/86400000);
}
function isOverdue(dateISO, lastSavedISO){
  // in ritardo se: data < oggi  OR  salto di almeno 1 giorno rispetto all'ultima rilevazione
  if(dateISO < todayISO()) return true;
  if(lastSavedISO && daysBetween(lastSavedISO, todayISO()) > 1) return true;
  return false;
}

/* ===== Stato ===== */
function load(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE)) || {};
  }catch{ localStorage.removeItem(STORAGE); return {}; }
}
function save(s){
  localStorage.setItem(STORAGE, JSON.stringify(s));
  // notifica alla home per aggiornare il grafico
  localStorage.setItem(STORAGE, JSON.stringify(s)); // doppio set per trigger storage
}

function ensureState(){
  const s = load();
  if(!s.sections){
    s.sections = {};
    SECTIONS.forEach(k=>{
      s.sections[k] = [{ score:0, notes:'', owner:'', date: todayISO(), lastSaved: todayISO() }];
    });
  }
  return s;
}

/* ===== CH name render ===== */
function renderCH(){
  const ch = localStorage.getItem(CH_NAME_KEY) || 'CH 24 — Montaggio';
  document.querySelectorAll('[data-ch]').forEach(el=>el.textContent=ch);
}

/* ===== UI ===== */
function sColor(k){ return ({'1S':'s1','2S':'s2','3S':'s3','4S':'s4','5S':'s5'})[k]; }
function sHex(k){ return ({'1S':'#7e57c2','2S':'#ef5350','3S':'#f1b21a','4S':'#22c55e','5S':'#2563eb'})[k]; }
function sText(k){
  return ({
    '1S':'Eliminare il superfluo.',
    '2S':'Un posto per tutto e tutto al suo posto.',
    '3S':'Pulire e prevenire lo sporco.',
    '4S':'Regole e segnali chiari.',
    '5S':'Abitudine e miglioramento continuo.'
  })[k];
}

function sectionCard(key, items, state){
  const wrap = document.createElement('section');
  wrap.className = 's-card';
  wrap.id = key;

  const last = items[items.length-1] || {score:0,date:todayISO(),lastSaved:todayISO()};
  const val = Math.round((last.score/5)*100);
  const overdue = isOverdue(last.date, last.lastSaved);

  wrap.innerHTML = `
    <div class="s-head ${overdue?'overdue':''}">
      <div class="s-bar ${sColor(key)}c"></div>
      <div class="s-title ${sColor(key)}txt">${key} — ${labelOf(key)}</div>
      <div class="s-val">Valore: ${val}%</div>
      <div class="s-actions">
        <button class="btn round small info-btn" title="Info ${key}" style="color:${sHex(key)}">i</button>
        <button class="btn round small" title="Duplica" id="dup">＋</button>
        <button class="btn round small trash" title="Elimina" id="del">🗑</button>
      </div>
    </div>
    <div class="s-body">
      <details class="mt8" open>
        <summary>Dettagli</summary>
        <label class="mt8">Responsabile / Operatore
          <input class="input owner" placeholder="Inserisci il nome..." value="${escapeHTML(last.owner||'')}">
        </label>
        <label class="mt8">Note
          <textarea class="notes" placeholder="Note...">${escapeHTML(last.notes||'')}</textarea>
        </label>
        <div class="row gap mt8">
          <div class="score">
            ${[0,1,3,5].map(p=>`<div class="p ${p===last.score?'active':''}" data-score="${p}">${p}</div>`).join('')}
          </div>
          <input type="date" class="input date" value="${last.date}">
        </div>
      </details>
    </div>
  `;

  // handlers
  wrap.querySelector('.info-btn').onclick = ()=>{
    const dlg = document.getElementById('dlg-info');
    const t = document.getElementById('info-title');
    const b = document.getElementById('info-body');
    t.textContent = `${key} — ${labelOf(key)}`;
    t.style.color = sHex(key);
    b.textContent = sText(key);
    dlg.showModal();
  };

  wrap.querySelector('#dup').onclick = async ()=>{
    if(!(await askPin('PIN per duplicare la scheda'))) return;
    items.push({score:last.score,notes:last.notes,owner:last.owner,date:todayISO(),lastSaved:todayISO()});
    save(state); render();
  };

  wrap.querySelector('#del').onclick = async ()=>{
    if(!(await askPin('PIN per eliminare la scheda'))) return;
    if(items.length>1){ items.pop(); save(state); render(); }
  };

  wrap.querySelectorAll('.score .p').forEach(p=>{
    p.onclick = ()=>{
      const v = Number(p.dataset.score);
      last.score = v;
      last.lastSaved = todayISO();
      save(state); render();
    };
  });

  wrap.querySelector('.owner').oninput = e => { last.owner = e.target.value; save(state); };
  wrap.querySelector('.notes').oninput = e => { last.notes = e.target.value; save(state); };
  wrap.querySelector('.date').onchange = e => { last.date = e.target.value; save(state); render(); };

  return wrap;
}

function labelOf(key){
  return ({'1S':'Selezionare','2S':'Sistemare','3S':'Splendere','4S':'Standardizzare','5S':'Sostenere'})[key];
}

function escapeHTML(s){ return (s||'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

function render(){
  renderCH();
  const state = ensureState();
  const wrap = document.getElementById('sections');
  wrap.innerHTML = '';
  let total=0, cnt=0;
  const lateSet = new Set();

  SECTIONS.forEach(k=>{
    const items = state.sections[k];
    const card = sectionCard(k, items, state);
    wrap.appendChild(card);

    const last = items[items.length-1];
    total += (last.score/5)*100; cnt++;
    if(isOverdue(last.date, last.lastSaved)) lateSet.add(k);
  });

  // KPI
  document.getElementById('avg').textContent = `${Math.round(total/cnt)}%`;
  document.getElementById('late').textContent = lateSet.size;

  // Badges top & click-to-scroll
  const sm = document.getElementById('summary'); sm.innerHTML='';
  SECTIONS.forEach(k=>{
    const last = state.sections[k].slice(-1)[0];
    const perc = Math.round((last.score/5)*100);
    const a = document.createElement('a');
    a.className = `tag ${sColor(k)} ${lateSet.has(k)?'outline':''}`;
    a.style.border = `2px solid ${sHex(k)}`;
    a.textContent = `${k} ${perc}%`;
    a.href = `#${k}`;
    sm.appendChild(a);
  });

  // aggiorna storage per la home
  const pack = {scores:{}, late:[...lateSet]};
  SECTIONS.forEach(k=>{
    const last = state.sections[k].slice(-1)[0];
    pack.scores[k] = Math.round((last.score/5)*100);
  });
  localStorage.setItem(STORAGE, JSON.stringify(pack));
}

// comprimi/espandi
function toggleAll(){
  const ds = document.querySelectorAll('details');
  const isOpen = [...ds].some(d=>d.open);
  ds.forEach(d=>d.open = !isOpen);
}

document.addEventListener('DOMContentLoaded', ()=>{
  render();
  document.getElementById('toggleAll').onclick = toggleAll;
  document.getElementById('btn-lock').onclick = async ()=>{
    const ok = await askPin('PIN richiesto per azioni protette');
    if(ok) alert('Sbloccato per questa azione.');
  };
});
