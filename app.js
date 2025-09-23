/* ===============================
   SKF 5S — Montaggio (CH 24)
   Funzioni condivise home/checklist
================================= */
const APP_KEY = "skf5s-montaggio-ch24";
const PIN_STORAGE = "skf5s-pin"; // per lock azioni protette
const DEFAULT_PIN = "2468"; // cambia se vuoi

const COLORS = {
  s1: "#7b4ede", // viola SKF
  s2: "#ef5350", // rosso
  s3: "#f3b318", // giallo
  s4: "#2eb36a", // verde
  s5: "#2563eb", // blu
  late: "#e11d48" // ritardi
};
const LABELS = {
  s1: "1S",
  s2: "2S",
  s3: "3S",
  s4: "4S",
  s5: "5S"
};
const INFO = {
  s1: "Eliminare ciò che non serve. Rimuovi superfluo e crea area di lavoro essenziale, ordinata e sicura.",
  s2: "Un posto per tutto e tutto al suo posto.",
  s3: "Pulire e rimuovere le cause dello sporco.",
  s4: "Regole e segnali visivi chiari.",
  s5: "Disciplina, abitudine e miglioramento continuo."
};

function getState() {
  const saved = localStorage.getItem(APP_KEY);
  if (saved) return JSON.parse(saved);
  // stato iniziale
  const blankS = () => ({ value: 0, date: todayISO(), note: "", who: "" });
  const state = {
    channelName: "CH 24",
    areaName: "Montaggio",
    pin: DEFAULT_PIN,
    s1: { ...blankS() },
    s2: { ...blankS() },
    s3: { ...blankS() },
    s4: { ...blankS() },
    s5: { ...blankS() }
  };
  localStorage.setItem(APP_KEY, JSON.stringify(state));
  return state;
}
function setState(patch) {
  const state = { ...getState(), ...patch };
  localStorage.setItem(APP_KEY, JSON.stringify(state));
  return state;
}
function todayISO() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10);
}
function isLate(iso) {
  // ritardo se data è precedente ad oggi
  const t = new Date(todayISO());
  const d = new Date(iso);
  return d < t;
}
function avg(values) {
  if (!values.length) return 0;
  const s = values.reduce((a,b)=>a+b,0);
  return Math.round((s/values.length)*100)/100;
}
function percent(v){ return `${v}%`; }

function askPIN(reason="") {
  const dlg = document.getElementById("pinDialog");
  const input = document.getElementById("pinInput");
  input.value = "";
  dlg.showModal();
  return new Promise((resolve) => {
    const ok = () => {
      const state = getState();
      const valid = input.value === (state.pin || DEFAULT_PIN);
      dlg.close();
      resolve(valid);
      input.removeEventListener("keydown", onEnter);
      btn.removeEventListener("click", onClick);
    };
    const onEnter = (e)=>{ if(e.key==="Enter"){ e.preventDefault(); btn.click(); } };
    input.addEventListener("keydown", onEnter);
    const btn = document.getElementById("pinConfirm");
    const onClick = (e)=>{ e.preventDefault(); ok(); };
    btn.addEventListener("click", onClick);
  });
}

/* =========================
   HOME PAGE (index.html)
========================= */
async function initHome(){
  const state = getState();

  // titolo dinamico
  const title = document.getElementById("tit-andamento");
  if (title) title.textContent = `Andamento ${state.channelName} — ${state.areaName}`;

  // chart
  const dataVals = [state.s1.value, state.s2.value, state.s3.value, state.s4.value, state.s5.value];
  const colors = [COLORS.s1, COLORS.s2, COLORS.s3, COLORS.s4, COLORS.s5];
  const labels = ["1S","2S","3S","4S","5S","Ritardi"];

  const lateCount = ["s1","s2","s3","s4","s5"].reduce((n,k)=>n+(isLate(state[k].date)?1:0),0);

  const ctx = document.getElementById("chart");
  if (ctx) {
    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: [...dataVals, lateCount],
          backgroundColor: [...colors, COLORS.late],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display:false },
          tooltip: {
            callbacks: {
              label: (ctx) => ctx.dataIndex===5 ? `Ritardi: ${lateCount}` : `${ctx.raw}%`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 20, callback: v=>`${v}%` },
            grid: { color: "rgba(0,0,0,.06)" }
          },
          x: { grid: { display:false } }
        }
      }
    });

    // Etichette percentuali sopra (non mozzate)
    chart.options.animation = false;
    chart.update();
    // posiziono col draw plugin semplice
    Chart.register({
      id: "valueLabel",
      afterDatasetsDraw(c, args, pluginOptions){
        const { ctx } = c;
        ctx.save();
        c.getDatasetMeta(0).data.forEach((bar, i)=>{
          const val = c.data.datasets[0].data[i];
          const txt = (i===5) ? `${val}` : `${val}%`;
          ctx.font = "600 12px Inter,system-ui,Segoe UI,Roboto,Arial";
          ctx.fillStyle = "#1f2937";
          ctx.textAlign = "center";
          ctx.fillText(txt, bar.x, bar.y - 6);
        });
      }
    });
    chart.update();
  }

  // chips S in ritardo
  const lateWrap = document.getElementById("lateChips");
  if (lateWrap) {
    lateWrap.innerHTML = "";
    ["s1","s2","s3","s4","s5"].forEach((k,idx)=>{
      if (isLate(state[k].date)) {
        const chip = document.createElement("button");
        chip.className = `chip s${idx+1}`;
        chip.textContent = `${idx+1}S in ritardo`;
        chip.addEventListener("click", ()=> {
          // vai alla checklist e scorri sulla sezione
          location.href = `checklist.html#${k}`;
        });
        lateWrap.appendChild(chip);
      }
    });
  }

  // export (PIN)
  const btnExport = document.getElementById("btn-export");
  if (btnExport) {
    btnExport.onclick = async () => {
      const ok = await askPIN("export");
      if (!ok) return;
      const payload = {
        channel: state.channelName,
        area: state.areaName,
        when: new Date().toISOString(),
        s1: state.s1, s2: state.s2, s3: state.s3, s4: state.s4, s5: state.s5
      };
      const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `SKF-5S-${state.channelName}-${state.areaName}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    };
  }

  // lock icon apre PIN per azioni protette “una tantum”
  const btnLock = document.getElementById("btn-lock");
  if (btnLock) {
    btnLock.onclick = async () => {
      const ok = await askPIN("unlock");
      if (ok) {
        // feedback rapido
        btnLock.textContent = "✅";
        setTimeout(()=> btnLock.textContent = "🔒", 1200);
      }
    };
  }
}

/* =========================
   CHECKLIST PAGE
========================= */
function sectionTemplate(key, title, color, info, state) {
  const { value, date, note, who } = state[key];
  const id = key;
  const late = isLate(date);
  return `
  <section id="${id}" class="card s-card ${late?"late":""}">
    <header class="s-head">
      <div class="s-color" style="background:${color}"></div>
      <h3><span class="s-name">${title}</span></h3>
      <span class="badge">Valore: <b>${value}%</b></span>
      <div class="head-actions">
        <button class="icon-btn info" data-info="${key}" style="--dot:${color}">i</button>
        <button class="icon-btn add" data-add="${key}">＋</button>
      </div>
    </header>

    <details class="s-details" open>
      <summary>Dettagli</summary>
      <div class="s-body">
        <label class="field">
          <span>Responsabile / Operatore</span>
          <input data-who="${key}" type="text" placeholder="Inserisci il nome..." value="${who||""}">
        </label>

        <label class="field">
          <span>Note</span>
          <textarea data-note="${key}" rows="3" placeholder="Note...">${note||""}</textarea>
        </label>

        <div class="row wrap gap">
          <div class="score">
            <button data-score="${key}" data-val="0" class="score-btn ${value===0?"sel":""}">0</button>
            <button data-score="${key}" data-val="1" class="score-btn ${value===20?"sel":""}">1</button>
            <button data-score="${key}" data-val="3" class="score-btn ${value===60?"sel":""}">3</button>
            <button data-score="${key}" data-val="5" class="score-btn ${value===100?"sel":""}">5</button>
          </div>

          <label class="field w-auto">
            <span>Data</span>
            <input data-date="${key}" type="date" value="${date}">
          </label>

          <button class="danger icon-btn" data-del="${key}" title="Elimina (PIN)">🗑️</button>
        </div>
      </div>
    </details>
  </section>
  `;
}
function scoreToPercent(n){
  // 0 -> 0%, 1 -> 20%, 3->60%, 5->100%
  switch(String(n)){
    case "0": return 0;
    case "1": return 20;
    case "3": return 60;
    case "5": return 100;
    default: return 0;
  }
}

async function initChecklist(){
  const state = getState();

  // badge riepilogo
  const sum = document.getElementById("summaryBadges");
  const vals = {
    s1: state.s1.value, s2: state.s2.value, s3: state.s3.value, s4: state.s4.value, s5: state.s5.value
  };
  const makeBadge = (k, idx) =>
    `<button class="pill sm s${idx}" data-jump="${k}">${LABELS[k]} ${vals[k]}%</button>`;

  sum.innerHTML = ["s1","s2","s3","s4","s5"].map((k,i)=>makeBadge(k, i+1)).join("");

  // toggle all
  const toggle = document.getElementById("toggleAll");
  let opened = true;
  toggle.onclick = () => {
    document.querySelectorAll(".s-details").forEach(d => d.open = !opened);
    opened = !opened;
  };

  // render sezioni
  const root = document.getElementById("sections");
  root.innerHTML =
    sectionTemplate("s1","1S — Selezionare",COLORS.s1,INFO.s1,state) +
    sectionTemplate("s2","2S — Sistemare",COLORS.s2,INFO.s2,state) +
    sectionTemplate("s3","3S — Splendere",COLORS.s3,INFO.s3,state) +
    sectionTemplate("s4","4S — Standardizzare",COLORS.s4,INFO.s4,state) +
    sectionTemplate("s5","5S — Sostenere",COLORS.s5,INFO.s5,state);

  // click sui badge porta alla sezione
  document.querySelectorAll("[data-jump]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const id = b.getAttribute("data-jump");
      location.hash = id;
      document.getElementById(id)?.scrollIntoView({behavior:"smooth", block:"center"});
    });
  });

  // info popup
  const dlg = document.getElementById("infoDialog");
  const body = document.getElementById("infoBody");
  document.querySelectorAll("[data-info]").forEach(btn=>{
    btn.onclick = ()=>{
      const k = btn.getAttribute("data-info");
      body.innerHTML = `<div class="info-box ${k}">
        <h4>${LABELS[k]} — Info</h4>
        <p>${INFO[k]}</p>
      </div>`;
      dlg.showModal();
    };
  });

  // campi vari
  const updateValue = ()=>{
    const st = getState();
    // media “di fatto”: qui è la media delle 5S, ma le card mostrano il valore corrente
    const vals = [st.s1.value, st.s2.value, st.s3.value, st.s4.value, st.s5.value];
    document.getElementById("avgScore").textContent = percent(Math.round(avg(vals)));
    const late = ["s1","s2","s3","s4","s5"].filter(k=>isLate(st[k].date)).length;
    document.getElementById("lateCount").textContent = late;

    // aggiorno pill riepilogo
    ["s1","s2","s3","s4","s5"].forEach((k,i)=>{
      const el = document.querySelector(`.pill[data-jump="${k}"]`);
      if (el) el.textContent = `${LABELS[k]} ${st[k].value}%`;
    });

    // evidenzio ritardo card
    ["s1","s2","s3","s4","s5"].forEach((k)=>{
      const card = document.getElementById(k);
      if (card) card.classList.toggle("late", isLate(st[k].date));
    });
  };

  // nome operatore
  document.querySelectorAll("[data-who]").forEach(inp=>{
    inp.addEventListener("input", ()=>{
      const k = inp.getAttribute("data-who");
      const st = getState();
      st[k].who = inp.value;
      setState(st);
    });
  });
  // note
  document.querySelectorAll("[data-note]").forEach(inp=>{
    inp.addEventListener("input", ()=>{
      const k = inp.getAttribute("data-note");
      const st = getState();
      st[k].note = inp.value;
      setState(st);
    });
  });
  // data
  document.querySelectorAll("[data-date]").forEach(inp=>{
    inp.addEventListener("change", ()=>{
      const k = inp.getAttribute("data-date");
      const st = getState();
      st[k].date = inp.value;
      setState(st);
      updateValue();
    });
  });
  // punteggi (sempre liberi)
  document.querySelectorAll("[data-score]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const k = btn.getAttribute("data-score");
      const v = scoreToPercent(btn.getAttribute("data-val"));
      const st = getState();
      st[k].value = v;
      setState(st);
      // selezione visuale
      btn.parentElement.querySelectorAll(".score-btn").forEach(b=>b.classList.remove("sel"));
      btn.classList.add("sel");
      // aggiorna badge valore card
      const badge = document.querySelector(`#${k} .badge b`);
      if (badge) badge.textContent = `${v}%`;
      updateValue();
    });
  });

  // elimina / duplica protetti da PIN
  document.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const ok = await askPIN("delete");
      if (!ok) return;
      const k = btn.getAttribute("data-del");
      const st = getState();
      st[k] = { value: 0, date: todayISO(), note: "", who: "" };
      setState(st);
      // reset UI
      document.querySelectorAll(`#${k} .score-btn`).forEach(b=>b.classList.remove("sel"));
      document.querySelector(`#${k} [data-who]`).value = "";
      document.querySelector(`#${k} [data-note]`).value = "";
      document.querySelector(`#${k} [data-date]`).value = todayISO();
      document.querySelector(`#${k} .badge b`).textContent = "0%";
      updateValue();
    });
  });

  document.querySelectorAll("[data-add]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const ok = await askPIN("add");
      if (!ok) return;
      // duplicazione semplice: non creiamo nuove sezioni, ma potresti qui creare righe “voce”
      alert("Voce duplicata (demo).");
    });
  });

  updateValue();

  // se arrivo con hash (#s1...) scroll alla sezione
  if (location.hash) {
    const el = document.getElementById(location.hash.replace("#",""));
    el?.scrollIntoView({behavior:"smooth", block:"center"});
  }
}

/* router minimo per pagina */
document.addEventListener("DOMContentLoaded", ()=>{
  const page = document.body.getAttribute("data-page");
  if (page === "home") initHome();
  if (page === "checklist") initChecklist();
});
