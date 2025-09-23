/** =========================================================
 *  SKF 5S – APP JS (Montaggio)
 *  - Popup “i” con scroll + chip interattivi che appendono alle Note
 *  - Duplica scheda con “+” previa richiesta PIN (duplica visiva)
 *  - Ritardi calcolati dalla data (oggi escluso → se data < oggi = ritardo)
 *  - PIN per cambio CH dall’icona lucchetto o Export
 *  - Grafico con colonna “Ritardi” e pulsanti “S in ritardo”
 *  - PWA Service Worker (sw.js)
 *  - Tutto configurabile via CONFIG e INFO_TEXT
 *  ========================================================= */

/** ========== CONFIGURAZIONE (MONTAGGIO) ========== */
const CONFIG = {
  PIN: "2468",               // PIN per azioni protette (modifica CH, +, elimina, export)
  CHANNEL_DEFAULT: "CH 24",  // canale di default
  AREA: "Montaggio"          // etichetta area per i titoli
};

// Colori istituzionali per le 5S
const COLORS = {
  s1: "#7c3aed", // viola
  s2: "#ef4444", // rosso
  s3: "#f59e0b", // giallo
  s4: "#10b981", // verde
  s5: "#2563eb"  // blu
};

/** ========== TESTI INFO (MONTAGGIO) ==========
 *  Ogni S ha un testo lungo. I punti (1) (2) ... verranno
 *  trasformati in chip cliccabili nel popup che appenderanno alle Note.
 *  Adatta liberamente i testi alle regole/processi del Montaggio.
 */
const INFO_TEXT = {
  s1: "(1) L'area pedonale è libera da ostacoli e da rischi di inciampo. (2) Non sono presenti materiali/strumenti non identificati sul pavimento. (3) In area sono presenti solo i materiali e attrezzature necessari. (4) È presente solo materiale necessario al lavoro corrente; obsoleti/rilavorazioni/scarti sono segregati. (5) Solo documenti e visualizzazioni necessari e in buone condizioni. (6) Area etichetta rossa, processo e team definiti. (7) Processo etichetta rossa funzionante. (8) Lavagna 5S aggiornata (piano, prima/dopo, punteggi, SPL). (9) Evidenze che 1S è sostenibile (checklist/piano periodico/audit). (10) 5S e 1S compresi; responsabilità chiare. (11) Tutti partecipano alle attività.",
  s2: "(1) Area e team definiti; comprensione 5S e 1S. (2) Nessun oggetto non necessario in zona. (3) Sicurezza: attrezzature identificate e accessibili. (4) Interruttori/uscite emergenza visibili e accessibili. (5) Stazioni qualità organizzate. (6) SWC seguito. (7) Posizioni prefissate con min/max per utenze, strumenti, pulizie, consumabili, mobili. (8) Posizioni definite per bidoni, rifiuti, oli con identificazioni chiare. (9) WIP/OK/KO/quarantena con posizioni e identificazioni chiare. (10) Materie prime/imballi con posizioni e identificazioni. (11) Layout con confini, corsie pedoni/carrelli, posizioni, aree DPI. (12) File/documenti identificati e organizzati al punto d’uso. (13) Miglioramenti: one-touch, poka-yoke, ergonomia. (14) Evidenze di sostenibilità 2S (check periodici). (15) 5S/2S compresi e responsabilità chiare. (16) Tutti partecipano.",
  s3: "(1) Non ci sono cose inutili. (2) Miglioramenti 2S mantenuti. (3) Verifiche regolari e azioni correttive. (4) Team comprende 5S, 1S e 2S. (5) Pavimenti/pareti/scale puliti (niente olio, trucioli, imballi, ecc.). (6) Segnaletica sicurezza/qualità pulita e leggibile. (7) Documenti in buono stato e protetti. (8) Illuminazione/ventilazione/aria condizionata in efficienza e pulite. (9) Fonti di sporco identificate e note. (10) Piani per eliminare/contenere la fonte di sporco. (11) Azioni eseguite secondo piano. (12) Miglioramenti per ridurre pulizia (eliminare fonte di sporco). (13) Riciclo rifiuti attivo con corretta differenziazione. (14) Demarcazioni rese permanenti. (15) Evidenze di sostenibilità 3S (routine e piani periodici). (16) 5S/3S compresi e responsabilità chiare; tutti partecipano.",
  s4: "(1) Visual management per anomalie/capacità (Min/Max, imballi, magazzino, componenti). (2) Codifiche colori standard per lubrificazioni, tubi, valvole; display mappati e aggiornati. (3) Standard 5S consolidati e aggiornati, materiale training e guida al miglioramento. (4) Schede controllo/istruzioni 5S integrate nella gestione quotidiana.",
  s5: "(1) Tutti formati sugli standard 5S e coinvolti. (2) 5S come abitudine; standard rispettati da tutti. (3) Layered audit su programma definito. (4) Foto prima/dopo mantenute come riferimento. (5) Obiettivi/risultati 5S esposti."
};

/** ========== STORAGE helper ========== */
const storageKey = (k) => `skf5s:${CONFIG.AREA}:${k}`;
const getJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const setJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

/** ========== PWA Service Worker ========== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(()=>{}));
}

/** ========== STATO ========== */
let state = getJSON(storageKey("state"), {
  channel: CONFIG.CHANNEL_DEFAULT,
  points: { s1:0, s2:0, s3:0, s4:0, s5:0 },
  notes:  { s1:"", s2:"", s3:"", s4:"", s5:"" },
  dates:  { s1:null, s2:null, s3:null, s4:null, s5:null }
});

/** ========== PIN dialog (lucchetto / export) ========== */
function openPinDialog(){
  const dlg = document.getElementById("pinDialog");
  if (!dlg) return;

  const pinInput = document.getElementById("pinInput");
  const chInput  = document.getElementById("channelInput");
  pinInput.value = "";
  chInput.value  = state.channel ?? CONFIG.CHANNEL_DEFAULT;

  const confirm = document.getElementById("pinConfirmBtn");
  const cancel  = document.getElementById("pinCancel");

  const onConfirm = () => {
    const ok = pinInput.value === CONFIG.PIN;
    if (!ok) { alert("PIN errato"); return; }
    state.channel = chInput.value.trim() || CONFIG.CHANNEL_DEFAULT;
    setJSON(storageKey("state"), state);
    refreshTitles();
    dlg.close();
  };

  const onCancel  = () => dlg.close();

  confirm.onclick = onConfirm;
  cancel.onclick  = onCancel;

  dlg.showModal();
}

/** ========== Utility titoli dinamici ========== */
function refreshTitles(){
  const chartTitle = document.getElementById("chartTitle");
  if (chartTitle) chartTitle.textContent = `Andamento ${state.channel} — ${CONFIG.AREA}`;

  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) pageTitle.textContent = `${state.channel} — ${CONFIG.AREA}`;
}

/** ========== HOME (prima pagina) ========== */
function setupHome(){
  refreshTitles();
  renderChart();

  document.getElementById("lockBtn")?.addEventListener("click", openPinDialog);
  document.getElementById("exportBtn")?.addEventListener("click", openPinDialog);
}

/** ========== CHECKLIST (seconda pagina) ========== */
function setupChecklist(){
  refreshTitles();

  document.getElementById("lockBtn")?.addEventListener("click", openPinDialog);

  // badge riassuntivi cliccabili
  const summary = document.getElementById("summaryBadges");
  if (summary) {
    summary.innerHTML = "";
    ["s1","s2","s3","s4","s5"].forEach(k=>{
      const v = state.points[k] ?? 0;
      const el = document.createElement("button");
      el.className = `s-badge ${k}`;
      el.textContent = `${k.toUpperCase()} ${v*20}%`;
      el.addEventListener("click", ()=> {
        document.getElementById(`sheet-${k}`)?.scrollIntoView({behavior:"smooth", block:"start"});
      });
      summary.appendChild(el);
    });
  }

  // comprimi / espandi tutte
  document.getElementById("toggleAll")?.addEventListener("click", ()=>{
    document.querySelectorAll(".s-details").forEach(det=> det.open = !det.open);
  });

  const wrap = document.getElementById("sheets");
  if (!wrap) return;

  const defs = [
    {k:"s1", name:"1S — Selezionare",   color:COLORS.s1},
    {k:"s2", name:"2S — Sistemare",     color:COLORS.s2},
    {k:"s3", name:"3S — Splendere",     color:COLORS.s3},
    {k:"s4", name:"4S — Standardizzare",color:COLORS.s4},
    {k:"s5", name:"5S — Sostenere",     color:COLORS.s5},
  ];

  const todayStr = ()=> new Date().toISOString().slice(0,10);

  wrap.innerHTML = "";
  defs.forEach(({k,name,color})=>{
    const val  = state.points[k] ?? 0;
    const late = isLate(k);

    const card = document.createElement("article");
    card.className = "sheet" + (late ? " late" : "");
    card.id = `sheet-${k}`;
    card.innerHTML = `
      <div class="sheet-head">
        <span class="s-color" style="background:${color}"></span>
        <h3 class="s-title" style="color:${color}">${name}</h3>
        <span class="s-value">Valore: ${(val*20)}%</span>
        <button class="icon info" aria-label="Info" data-k="${k}">i</button>
        <button class="icon add" aria-label="Duplica">+</button>
      </div>

      <details class="s-details" open>
        <summary>▼ Dettagli</summary>

        <label class="field">
          <span>Responsabile / Operatore</span>
          <input placeholder="Inserisci il nome..." value="">
        </label>

        <label class="field">
          <span>Note</span>
          <textarea rows="3" placeholder="Note...">${state.notes[k]??""}</textarea>
        </label>

        <div class="field">
          <span>Data</span>
          <div class="row" style="display:flex;gap:10px;align-items:center">
            <input type="date" value="${state.dates[k]??todayStr()}" data-date="${k}">
            <div class="points">
              ${[0,1,3,5].map(p=>`
                <button data-k="${k}" data-p="${p}" class="${val===p?'active':''}">${p}</button>
              `).join("")}
            </div>
            <button class="icon danger del" title="Elimina">🗑</button>
          </div>
        </div>
      </details>
    `;
    wrap.appendChild(card);
  });

  // punteggi (delegato)
  wrap.addEventListener("click",(e)=>{
    const btn = e.target.closest(".points button");
    if(!btn) return;
    const k = btn.dataset.k;
    const p = Number(btn.dataset.p);
    state.points[k] = p;
    setJSON(storageKey("state"), state);
    document.querySelectorAll(`.points button[data-k="${k}"]`)
      .forEach(b=>b.classList.toggle("active", Number(b.dataset.p)===p));
    document.querySelector(`#sheet-${k} .s-value`).textContent = `Valore: ${p*20}%`;
    updateStatsAndLate();
  });

  // date → ritardo
  wrap.addEventListener("change",(e)=>{
    const inp = e.target.closest('input[type="date"][data-date]');
    if(!inp) return;
    const k = inp.dataset.date;
    state.dates[k] = inp.value;
    setJSON(storageKey("state"), state);
    updateStatsAndLate();
  });

  // elimina con PIN
  wrap.addEventListener("click",(e)=>{
    const del = e.target.closest(".del");
    if(!del) return;
    if (prompt("Inserisci PIN per eliminare") !== CONFIG.PIN) return;
    const k = del.closest(".sheet").id.replace("sheet-","");
    state.points[k]=0; state.notes[k]=""; state.dates[k]=null;
    setJSON(storageKey("state"), state);
    del.closest(".sheet").querySelectorAll(".points button").forEach(b=>b.classList.remove("active"));
    del.closest(".sheet").querySelector(".s-value").textContent="Valore: 0%";
    del.closest(".sheet").querySelector('textarea').value="";
    del.closest(".sheet").querySelector('input[type="date"]').value=new Date().toISOString().slice(0,10);
    updateStatsAndLate();
  });

  // info “i”
  wrap.addEventListener("click",(e)=>{
    const infoBtn = e.target.closest(".info");
    if(!infoBtn) return;
    openInfo(infoBtn.dataset.k);
  });

  // chiudi popup info (bottone)
  document.getElementById("infoCloseBtn")?.addEventListener("click", ()=> {
    const d = document.getElementById("infoDialog");
    if (d?.open) d.close();
  });

  // clic fuori dal box → chiudi
  document.getElementById("infoDialog")?.addEventListener("click", (e) => {
    const dlg = e.currentTarget;
    const box = dlg.querySelector(".modal-box");
    if (!box.contains(e.target)) dlg.close();
  });

  // "+" → PIN e duplicazione visiva
  wrap.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".add");
    if (!addBtn) return;

    if (prompt("Inserisci PIN per aggiungere") !== CONFIG.PIN) return;

    const card = addBtn.closest(".sheet");
    if (!card) return;

    const clone = card.cloneNode(true);
    const title = clone.querySelector(".s-title");
    if (title) title.textContent = title.textContent + " (copia)";
    clone.id = card.id + "-copy-" + Math.floor(Math.random()*10000);
    card.after(clone);
  });

  updateStatsAndLate();
}

/** ========== RITARDI & STATISTICHE ========== */
function isLate(k){
  const d = state.dates[k];
  if(!d) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const chosen = new Date(d); chosen.setHours(0,0,0,0);
  return chosen < today;
}

function updateStatsAndLate(){
  const arr = Object.values(state.points);
  const avg = arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length*20) : 0;
  document.getElementById("avgScore")?.replaceChildren(document.createTextNode(`${avg}%`));

  const lateList = Object.keys(state.dates).filter(k=> isLate(k));
  document.getElementById("lateCount")?.replaceChildren(document.createTextNode(String(lateList.length)));

  ["s1","s2","s3","s4","s5"].forEach(k=>{
    document.getElementById(`sheet-${k}`)?.classList.toggle("late", isLate(k));
  });
}

/** ========== INFO POPUP ========== */
// Converte il testo lungo in array di punti dai (1) (2) ...
function parseNumbered(text) {
  return text.split(/\(\d+\)\s*/).map(s => s.trim()).filter(Boolean);
}

let currentInfoKey = null; // s1..s5 del popup aperto

function openInfo(k){
  currentInfoKey = k;

  const dlg   = document.getElementById("infoDialog");
  const box   = dlg.querySelector(".modal-box");
  const title = document.getElementById("infoTitle");
  const body  = document.getElementById("infoText");   // contenitore scorrevole

  title.textContent = `${k.toUpperCase()} — Info`;
  box.style.borderTop = `6px solid ${COLORS[k] || '#0a57d5'}`;

  const items = parseNumbered(INFO_TEXT[k] ?? "");
  const chips = document.createElement("div");
  chips.className = "info-chips";

  const list = document.createElement("ol");
  list.style.margin = "0 0 10px 22px";
  list.style.padding = "0";

  items.forEach((t, idx) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "info-chip";
    b.dataset.text = t;
    b.innerHTML = `<span class="n" style="background:${COLORS[k]}">${idx+1}</span><span>${t}</span>`;
    chips.appendChild(b);

    const li = document.createElement("li");
    li.textContent = t;
    list.appendChild(li);
  });

  body.innerHTML = "";
  body.appendChild(chips);
  body.appendChild(list);

  // delega click: appende alle Note della S corrente e salva
  const onChipClick = (e) => {
    const chip = e.target.closest(".info-chip");
    if (!chip) return;
    const txt = chip.dataset.text || "";
    const ta = document.querySelector(`#sheet-${currentInfoKey} textarea`);
    if (!ta) return;
    const prefix = ta.value && !ta.value.endsWith("\n") ? "\n" : "";
    ta.value = `${ta.value}${prefix}- ${txt}`;
    state.notes[currentInfoKey] = ta.value;
    setJSON(storageKey("state"), state);
  };
  chips.addEventListener("click", onChipClick, { once: true }); // una volta per apertura

  dlg.showModal();
}

/** ========== GRAFICO (HOME) + Pulsanti "S in ritardo" ========== */
let chart;
function renderChart(){
  const ctx = document.getElementById("progressChart");
  if(!ctx || typeof Chart === "undefined") return;

  const vals = ["s1","s2","s3","s4","s5"].map(k=> (state.points[k]??0)*20 );
  const delayedN = Object.keys(state.dates).filter(k=> isLate(k)).length;

  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type:"bar",
    data:{
      labels:["1S","2S","3S","4S","5S","Ritardi"],
      datasets:[{
        data:[...vals, delayedN],
        backgroundColor:[COLORS.s1,COLORS.s2,COLORS.s3,COLORS.s4,COLORS.s5,"#ef4444"]
      }]
    },
    options:{
      responsive:true,
      plugins:{
        legend:{ display:false },
        tooltip:{ enabled:true },
        datalabels: undefined
      },
      scales:{
        y:{ beginAtZero:true, max:100, ticks:{ callback:v=>v+"%" } },
        x:{ ticks:{ maxRotation:0 } }
      }
    }
  });

  // Pulsanti “S in ritardo”
  const late = [];
  ["s1","s2","s3","s4","s5"].forEach((k,i)=>{ if(isLate(k)) late.push({k, label:`${i+1}S in ritardo`}); });
  const box = document.getElementById("lateBtns");
  if (box) {
    box.innerHTML = "";
    late.forEach(({k,label})=>{
      const b = document.createElement("button");
      b.className = `late-btn ${k}`;
      b.textContent = label;
      b.addEventListener("click", ()=> { window.location.href = `checklist.html#sheet-${k}`; });
      box.appendChild(b);
    });
  }
}

/** ========== ROUTER ========== */
document.addEventListener("DOMContentLoaded", ()=>{
  refreshTitles();

  const page = document.body.dataset.page;
  if (page === "home")      setupHome();
  if (page === "checklist") setupChecklist();
});
