/** CONFIGURAZIONE */
const CONFIG = {
  PIN: "2468",
  CHANNEL_DEFAULT: "CH 24",
  AREA: "Montaggio"
};

const COLORS = {
  s1: "#7c3aed",
  s2: "#ef4444",
  s3: "#f59e0b",
  s4: "#10b981",
  s5: "#2563eb",
};

const INFO_TEXT = {
  s1: "Eliminare ciò che non serve. Rimuovi superfluo e crea area di lavoro essenziale, ordinata e sicura.",
  s2: "Un posto per tutto e tutto al suo posto. Riduci gli sprechi di ricerca.",
  s3: "Pulizia, prevenzione dello sporco e cause radice.",
  s4: "Standard visivi, regole chiare e audit regolari.",
  s5: "Sostenere: disciplina, abitudine e miglioramento continuo."
};

/** STORAGE helpers */
const storageKey = (k)=>`skf5s:${CONFIG.AREA}:${k}`;
const getJSON = (k,d)=>{ try{ return JSON.parse(localStorage.getItem(k))??d; }catch{ return d; } };
const setJSON = (k,v)=> localStorage.setItem(k, JSON.stringify(v));

/** PWA SW */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", ()=> navigator.serviceWorker.register("sw.js"));
}

/** Common state */
let state = getJSON(storageKey("state"), {
  channel: CONFIG.CHANNEL_DEFAULT,
  points: { s1:0, s2:0, s3:0, s4:0, s5:0 },
  notes: { s1:"", s2:"", s3:"", s4:"", s5:"" },
  dates: { s1:null, s2:null, s3:null, s4:null, s5:null }
});

/** PIN dialog */
function openPinDialog(){
  const dlg = document.getElementById("pinDialog");
  if (!dlg) return;
  dlg.showModal();

  const pinInput = document.getElementById("pinInput");
  const chInput  = document.getElementById("channelInput");
  pinInput.value = "";
  chInput.value  = state.channel ?? CONFIG.CHANNEL_DEFAULT;

  const confirm = document.getElementById("pinConfirmBtn");
  const cancel  = document.getElementById("pinCancel");

  const onConfirm = ()=>{
    const ok = pinInput.value === CONFIG.PIN;
    if (!ok) { alert("PIN errato"); return; }
    // salva eventuale nome canale
    state.channel = chInput.value.trim() || CONFIG.CHANNEL_DEFAULT;
    setJSON(storageKey("state"), state);
    refreshTitles();
    dlg.close();
  };
  const onCancel = ()=> dlg.close();

  confirm.onclick = onConfirm;
  cancel.onclick  = onCancel;
}

function refreshTitles(){
  const chartTitle = document.getElementById("chartTitle");
  if (chartTitle) chartTitle.textContent = `Andamento ${state.channel} — ${CONFIG.AREA}`;

  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) pageTitle.textContent = `${state.channel} — ${CONFIG.AREA}`;
}

/** Home page setup */
function setupHome(){
  refreshTitles();
  renderChart();
  document.getElementById("lockBtn")?.addEventListener("click", openPinDialog);
  document.getElementById("exportBtn")?.addEventListener("click", openPinDialog);
}

/** Checklist setup */
function setupChecklist(){
  refreshTitles();
  document.getElementById("lockBtn")?.addEventListener("click", openPinDialog);

  // badges riassuntivi
  const summary = document.getElementById("summaryBadges");
  ["s1","s2","s3","s4","s5"].forEach(k=>{
    const v = state.points[k] ?? 0;
    const el = document.createElement("button");
    el.className = `s-badge ${k}`;
    el.textContent = `${k.toUpperCase()} ${v*20}%`;
    el.addEventListener("click", ()=>{
      document.getElementById(`sheet-${k}`)?.scrollIntoView({behavior:"smooth",block:"start"});
    });
    summary.appendChild(el);
  });

  // pulsante comprimi/espandi
  document.getElementById("toggleAll").addEventListener("click", ()=>{
    document.querySelectorAll(".s-details").forEach(det=>{
      det.open = !det.open;
    });
  });

  // render schede
  const wrap = document.getElementById("sheets");
  const defs = [
    {k:"s1", name:"1S — Selezionare",  color:COLORS.s1},
    {k:"s2", name:"2S — Sistemare",    color:COLORS.s2},
    {k:"s3", name:"3S — Splendere",    color:COLORS.s3},
    {k:"s4", name:"4S — Standardizzare",color:COLORS.s4},
    {k:"s5", name:"5S — Sostenere",    color:COLORS.s5},
  ];

  const todayStr = ()=> new Date().toISOString().slice(0,10);

  defs.forEach(({k,name,color})=>{
    const val = state.points[k] ?? 0;
    const late = isLate(k);

    const card = document.createElement("article");
    card.className = "sheet" + (late ? " late":"");
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
          <div style="display:flex;gap:10px;align-items:center">
            <input type="date" value="${state.dates[k]??todayStr()}" data-date="${k}">
            <div class="points">
              ${[0,1,3,5].map(p=>`
                <button data-k="${k}" data-p="${p}" class="${val===p?'active':''}">${p}</button>
              `).join("")}
            </div>
            <button class="icon danger del">🗑</button>
          </div>
        </div>
      </details>
    `;
    wrap.appendChild(card);
  });

  // click punti
  wrap.addEventListener("click",(e)=>{
    const btn = e.target.closest(".points button");
    if(!btn) return;
    const k = btn.dataset.k;
    const p = Number(btn.dataset.p);
    state.points[k] = p;
    setJSON(storageKey("state"), state);
    // aggiorna attivi, valore, badges e ritardi
    document.querySelectorAll(`.points button[data-k="${k}"]`).forEach(b=>b.classList.toggle("active", Number(b.dataset.p)===p));
    document.querySelector(`#sheet-${k} .s-value`).textContent = `Valore: ${p*20}%`;
    updateStatsAndLate();
  });

  // date change → ritardo
  wrap.addEventListener("change",(e)=>{
    const inp = e.target.closest('input[type="date"][data-date]');
    if(!inp) return;
    const k = inp.dataset.date;
    state.dates[k] = inp.value;
    setJSON(storageKey("state"), state);
    updateStatsAndLate();
  });

  // elimina voce con PIN
  wrap.addEventListener("click",(e)=>{
    const del = e.target.closest(".del");
    if(!del) return;
    if (prompt("Inserisci PIN per eliminare") !== CONFIG.PIN) return;
    const k = del.closest(".sheet").id.replace("sheet-","");
    state.points[k]=0;
    state.notes[k]="";
    state.dates[k]=null;
    setJSON(storageKey("state"), state);
    del.closest(".sheet").querySelectorAll(".points button").forEach(b=>b.classList.remove("active"));
    del.closest(".sheet").querySelector(".s-value").textContent="Valore: 0%";
    del.closest(".sheet").querySelector('textarea').value="";
    del.closest(".sheet").querySelector('input[type="date"]').value=new Date().toISOString().slice(0,10);
    updateStatsAndLate();
  });

  // info modal open/close
  wrap.addEventListener("click",(e)=>{
    const infoBtn = e.target.closest(".info");
    if(!infoBtn) return;
    const k = infoBtn.dataset.k;
    openInfo(k);
  });

  const infoDlg = document.getElementById("infoDialog");
  const infoClose = document.getElementById("infoCloseBtn");
  infoClose.addEventListener("click", ()=> infoDlg.close());

  // iniziale
  updateStatsAndLate();
}

/** Late logic */
function isLate(k){
  const d = state.dates[k];
  if(!d) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const chosen = new Date(d); chosen.setHours(0,0,0,0);
  // ritardo se la data è < oggi
  return chosen < today;
}

function updateStatsAndLate(){
  // media
  const arr = Object.values(state.points);
  const avg = arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length*20) : 0;
  document.getElementById("avgScore")?.replaceChildren(document.createTextNode(`${avg}%`));

  // ritardi
  const lateList = Object.keys(state.dates).filter(k=> isLate(k));
  document.getElementById("lateCount")?.replaceChildren(document.createTextNode(String(lateList.length)));

  // evidenzia schede
  ["s1","s2","s3","s4","s5"].forEach(k=>{
    document.getElementById(`sheet-${k}`)?.classList.toggle("late", isLate(k));
  });
}

/** Info modal */
function openInfo(k){
  const dlg = document.getElementById("infoDialog");
  document.getElementById("infoTitle").textContent = `${k.toUpperCase()} — Info`;
  const text = INFO_TEXT[k] ?? "";
  document.getElementById("infoText").textContent = text;
  // tema colore bordo
  dlg.querySelector(".modal-box").style.borderTop = `6px solid ${COLORS[k]||'#0a57d5'}`;
  dlg.showModal();
}

/** Chart */
let chart;
function renderChart(){
  const ctx = document.getElementById("progressChart");
  if(!ctx) return;
  const vals = ["s1","s2","s3","s4","s5"].map(k=> (state.points[k]??0)*20 );
  const delayed = Object.keys(state.dates).filter(k=> isLate(k)).length;

  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type:"bar",
    data:{
      labels:["1S","2S","3S","4S","5S","Ritardi"],
      datasets:[{
        data:[...vals, delayed],
        backgroundColor:[COLORS.s1,COLORS.s2,COLORS.s3,COLORS.s4,COLORS.s5,"#ef4444"]
      }]
    },
    options:{
      responsive:true,
      plugins:{
        legend:{display:false},
        tooltip:{enabled:true},
        datalabels:false
      },
      scales:{
        y:{beginAtZero:true,max:100,ticks:{callback:v=>v+"%"}},
        x:{ticks:{maxRotation:0}}
      }
    }
  });

  // Pulsanti "S in ritardo"
  const late = [];
  ["s1","s2","s3","s4","s5"].forEach((k,i)=>{ if(isLate(k)) late.push({k, label:`${i+1}S in ritardo`}); });
  const box = document.getElementById("lateBtns");
  box.innerHTML = "";
  late.forEach(({k,label})=>{
    const b = document.createElement("button");
    b.className = `late-btn ${k}`;
    b.textContent = label;
    b.addEventListener("click", ()=>{
      // vai alla scheda nella checklist
      window.location.href = `checklist.html#sheet-${k}`;
    });
    box.appendChild(b);
  });
}

/** Router semplice */
document.addEventListener("DOMContentLoaded", ()=>{
  refreshTitles();
  if (document.body.dataset.page==="home") setupHome();
  if (document.body.dataset.page==="checklist") setupChecklist();
});
