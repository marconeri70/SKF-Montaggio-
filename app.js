/* ==============
   SKF 5S – Montaggio
   Stato + Logica pagine
   ============== */

const CONFIG = {
  STORAGE_KEY: "skf5s-montaggio",
  DEFAULT_CHANNEL: "CH 24",
  DEFAULT_AREA: "Montaggio",
  // PIN configurabile: cambia qui e salva
  PIN: "2468",
  // testo punteggi
  SCORE_HELP:
    "0 = Non conforme • 1 = Parzialmente • 3 = Quasi • 5 = Conforme",
  // Info per la ❓ di ogni S
  INFO: {
    s1: "Eliminare ciò che non serve. Rimuovi superfluo e crea area di lavoro essenziale, ordinata e sicura.",
    s2: "Un posto per tutto e tutto al suo posto. Ordina, etichetta e rendi evidente.",
    s3: "Pulire e prevenire lo sporco. Trova la causa e rimuovila.",
    s4: "Standardizzare: regole, procedure e segnali chiari e visivi.",
    s5: "Sostenere: disciplina, audit e miglioramento continuo."
  }
};

const COLORS = {
  s1: "#6f49d9", s2: "#e45757", s3: "#f0b429", s4: "#2ea84f", s5: "#2f6de3"
};

function loadState() {
  const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  // Stato iniziale
  const init = {
    channel: CONFIG.DEFAULT_CHANNEL,
    area: CONFIG.DEFAULT_AREA,
    unlocked: false,
    // valori % iniziali e schede
    scores: { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 },
    sheets: {
      s1: { entries: [{ who: "", notes: "", date: todayStr(), score: 0 }] },
      s2: { entries: [{ who: "", notes: "", date: todayStr(), score: 0 }] },
      s3: { entries: [{ who: "", notes: "", date: todayStr(), score: 0 }] },
      s4: { entries: [{ who: "", notes: "", date: todayStr(), score: 0 }] },
      s5: { entries: [{ who: "", notes: "", date: todayStr(), score: 0 }] }
    }
  };
  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(init));
  return init;
}
function saveState(st){ localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(st)); }
function todayStr(){ const d=new Date(); return d.toISOString().slice(0,10); }
function isLate(dateStr){
  // Ritardo se la data è antecedente a OGGI
  try{
    const d = new Date(dateStr+"T00:00:00");
    const t = new Date(todayStr()+"T00:00:00");
    return d < t;
  }catch{ return false; }
}

const state = loadState();

/* ====== NAV / PAGES ====== */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "home") initHome();
  if (page === "checklist") initChecklist();

  // PWA
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
});

/* ====== LOCK / PIN shared ====== */
function openPinDialog(thenDo = ()=>{}) {
  const dlg = document.getElementById("pinDialog");
  const pinInput = document.getElementById("pinInput");
  const chInput = document.getElementById("channelInput");
  if (!dlg) return;

  pinInput.value = "";
  chInput.value = state.channel;

  dlg.showModal();
  const confirm = document.getElementById("pinConfirmBtn");
  confirm.onclick = (ev) => {
    ev.preventDefault();
    if (pinInput.value === CONFIG.PIN) {
      // applica eventuale cambio canale
      const newCh = (chInput.value || "").trim();
      if (newCh) {
        state.channel = newCh;
        saveState(state);
      }
      state.unlocked = true;
      saveState(state);
      dlg.close();
      thenDo();
      // richiama render dei titoli canale ove necessario
      const ct = document.getElementById("chartTitle");
      if (ct) ct.textContent = `Andamento ${state.channel} — ${state.area}`;
      const pt = document.getElementById("pageTitle");
      if (pt) pt.textContent = `${state.channel} — ${state.area}`;
    } else {
      alert("PIN errato.");
    }
  };
}

/* ====== HOME ====== */
let chartRef = null;

function initHome(){
  // Testata lock
  document.getElementById("lockBtn").addEventListener("click", () => openPinDialog());

  // Titolo grafico
  const ct = document.getElementById("chartTitle");
  ct.textContent = `Andamento ${state.channel} — ${state.area}`;

  // Chart
  drawChartHome();
  // Bottoni ritardi
  renderLateButtons();

  // Export —— protetto da PIN
  document.getElementById("exportBtn").addEventListener("click", () => {
    openPinDialog(() => {
      const payload = buildSupervisorExport();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-${state.channel.replace(/\s+/g,'_')}-${state.area}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  });
}

function calcPercentages(){
  // media per ciascuna S sull’ultima entry
  const out = {};
  ["s1","s2","s3","s4","s5"].forEach(k=>{
    const entries = state.sheets[k].entries;
    const last = entries[entries.length-1] || {score:0};
    const pct = Math.round( (last.score/5)*100 );
    out[k] = pct;
  });
  return out;
}

function drawChartHome(){
  const data = calcPercentages();
  const ctx = document.getElementById("progressChart");
  const labels = ["1S","2S","3S","4S","5S","Ritardi"];
  const values = [data.s1,data.s2,data.s3,data.s4,data.s5, countLateAll()];
  const colors = [COLORS.s1,COLORS.s2,COLORS.s3,COLORS.s4,COLORS.s5,"#e45757"];

  if (chartRef) chartRef.destroy();
  chartRef = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderRadius: 8
      }]
    },
    options: {
      responsive:true,
      plugins:{
        legend:{display:false},
        tooltip:{enabled:true},
        datalabels:false
      },
      scales:{
        y:{beginAtZero:true,max:100,grid:{color:"#00000008"}},
        x:{grid:{display:false}}
      }
    }
  });
}

function countLateAll(){
  let c=0;
  ["s1","s2","s3","s4","s5"].forEach(k=>{
    const e = state.sheets[k].entries;
    const last = e[e.length-1];
    if (last && isLate(last.date)) c++;
  });
  return c;
}

function renderLateButtons(){
  const wrap = document.getElementById("lateBtns");
  wrap.innerHTML = "";
  ["s1","s2","s3","s4","s5"].forEach(k=>{
    const e = state.sheets[k].entries;
    const last = e[e.length-1];
    if (last && isLate(last.date)) {
      const btn = document.createElement("button");
      btn.className = `late-btn ${k}`;
      btn.textContent = `${k.toUpperCase()} in ritardo`;
      btn.onclick = () => { window.location.href = `checklist.html#${k}`; };
      wrap.appendChild(btn);
    }
  });
}

function buildSupervisorExport(){
  const data = calcPercentages();
  return {
    meta: {
      channel: state.channel,
      area: state.area,
      exportedAt: new Date().toISOString()
    },
    scores: data,
    late: countLateAll(),
    raw: state.sheets
  };
}

/* ====== CHECKLIST ====== */
function initChecklist(){
  // lock
  document.getElementById("lockBtn").addEventListener("click", ()=> openPinDialog(()=>renderChecklist(true)));
  // titoli
  const pt = document.getElementById("pageTitle");
  pt.textContent = `${state.channel} — ${state.area}`;

  renderChecklist();
}

function renderChecklist(justUnlocked=false){
  // Badge riassuntivi
  const badges = document.getElementById("summaryBadges");
  const pct = calcPercentages();
  badges.innerHTML = "";
  (["s1","s2","s3","s4","s5"]).forEach(k=>{
    const chip = document.createElement("span");
    chip.className = `chip ${k}`;
    chip.textContent = `${k.toUpperCase()} ${pct[k]}%`;
    chip.onclick = ()=>{
      document.getElementById(`sheet-${k}`).scrollIntoView({behavior:"smooth",block:"start"});
    };
    badges.appendChild(chip);
  });

  // Schede
  const mount = document.getElementById("sheets");
  mount.innerHTML = "";
  const names = {
    s1:"Selezionare", s2:"Sistemare", s3:"Splendere", s4:"Standardizzare", s5:"Sostenere"
  };

  ["s1","s2","s3","s4","s5"].forEach(k=>{
    const entries = state.sheets[k].entries;
    const last = entries[entries.length-1];

    const sheet = document.createElement("article");
    sheet.className = `sheet ${isLate(last.date) ? "late":""}`;
    sheet.id = `sheet-${k}`;

    sheet.innerHTML = `
      <div class="sheet-head">
        <div class="sheet-title">
          <span class="color-pill" style="background:${COLORS[k]}"></span>
          <div><span class="chip ${k}" style="color:#fff">${k.toUpperCase()} — ${names[k]}</span></div>
        </div>
        <div class="sheet-actions">
          <span class="value-badge">Valore: ${pct[k]}%</span>
          <button class="i-btn ${k}" data-k="${k}" title="Informazioni">i</button>
          <button class="icon-round add" title="Duplica voce">+</button>
        </div>
      </div>

      <details class="details" open>
        <summary>Dettagli</summary>

        <div class="field">
          <span>Responsabile / Operatore</span>
          <input class="inp-who" placeholder="Inserisci il nome..." value="${last.who||""}" />
        </div>

        <div class="field">
          <span>Note</span>
          <textarea class="inp-notes" rows="3" placeholder="Note...">${last.notes||""}</textarea>
        </div>

        <div class="score-row">
          <button class="score-btn" data-v="0">0</button>
          <button class="score-btn" data-v="1">1</button>
          <button class="score-btn" data-v="3">3</button>
          <button class="score-btn" data-v="5">5</button>

          <input class="date" type="date" value="${last.date}" />
          <button class="icon-round trash" title="Elimina voce">🗑</button>
        </div>
        <div class="explain">${CONFIG.SCORE_HELP}</div>
      </details>
    `;
    // Attiva stato bottoni
    sheet.querySelectorAll(".score-btn").forEach(b=>{
      if (Number(b.dataset.v)===Number(last.score)) b.classList.add("active");
    });

    // Eventi
    sheet.querySelector(".inp-who").onchange = (e)=>{
      last.who = e.target.value; saveState(state); updateAll();
    };
    sheet.querySelector(".inp-notes").onchange = (e)=>{
      last.notes = e.target.value; saveState(state); updateAll();
    };
    sheet.querySelector(".date").onchange = (e)=>{
      last.date = e.target.value; saveState(state); updateAll();
    };
    sheet.querySelectorAll(".score-btn").forEach(b=>{
      b.onclick = ()=>{
        last.score = Number(b.dataset.v);
        saveState(state); updateAll();
      };
    });

    // info modal
    sheet.querySelector(".i-btn").onclick = (ev)=>{
      const k = ev.currentTarget.dataset.k;
      openInfo(names[k], CONFIG.INFO[k], k);
    };

    // duplica
    sheet.querySelector(".add").onclick = ()=>{
      requirePIN(()=>{
        state.sheets[k].entries.push({who:"",notes:"",date:todayStr(),score:0});
        saveState(state); renderChecklist();
      });
    };
    // elimina
    sheet.querySelector(".trash").onclick = ()=>{
      requirePIN(()=>{
        if (state.sheets[k].entries.length>1) state.sheets[k].entries.pop();
        saveState(state); renderChecklist();
      });
    };

    mount.appendChild(sheet);
  });

  document.getElementById("avgScore").textContent = calcAvg()+"%";
  document.getElementById("lateCount").textContent = countLateAll();

  // toggle all details
  document.getElementById("toggleAll").onclick = ()=>{
    const open = [...document.querySelectorAll(".details")].some(d=>d.open);
    document.querySelectorAll(".details").forEach(d=>d.open = !open);
  };

  // deep link #sX
  if (!justUnlocked && location.hash){
    const id = `sheet-${location.hash.replace("#","")}`;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({behavior:"smooth",block:"start"});
  }
}

function calcAvg(){
  const p = calcPercentages();
  return Math.round((p.s1+p.s2+p.s3+p.s4+p.s5)/5);
}

function updateAll(){
  // refresh % riassunto, card valori, late highlight, chart home se presente
  if (document.body.dataset.page==="checklist"){
    renderChecklist(true);
  } else {
    drawChartHome();
    renderLateButtons();
  }
}

/* PIN richiesto per azioni critiche (duplica/cancella) */
function requirePIN(cb){
  if (state.unlocked) { cb(); return; }
  openPinDialog(cb);
}

/* Modale INFO */
function openInfo(title, text, k){
  const dlg = document.getElementById("infoDialog");
  document.getElementById("infoTitle").textContent = `${title} — Info`;
  const txt = document.getElementById("infoText");
  txt.textContent = text;
  // bordo tema
  dlg.querySelector(".modal-box").style.borderTop = `6px solid ${COLORS[k]||"#999"}`;
  dlg.showModal();
}
