// protezione da JSON corrotti
function loadStateSafe(key){
  try{ const r = localStorage.getItem(key); return r? JSON.parse(r): null; }
  catch(e){ localStorage.removeItem(key); return null; }
}
/* Home Montaggio · CH 24
   - Legge dati da localStorage 'skf5s:montaggio-ch24'
   - Disegna grafico Chart.js con 1S..5S + Ritardi
   - Mostra bottoni "S in ritardo" colorati e cliccabili
*/

const STORAGE_KEY = 'skf5s:montaggio-ch24';

const COLORS = {
  '1S':'#7c4dff',
  '2S':'#ef5350',
  '3S':'#f2b532',
  '4S':'#22c55e',
  '5S':'#1e54ff',
  'R':'#ff3b57'
};

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){ return null; }
}

function ensureState(){
  // se non c'è niente, crea struttura base
  const s = loadState();
  if(s) return s;
  const init = {
    area:'CH 24', reparto:'Montaggio',
    scores:{'1S':0,'2S':0,'3S':0,'4S':0,'5S':0},
    items:{'1S':[],'2S':[],'3S':[],'4S':[],'5S':[]},
    lastEntry:{}, // per controllo salti giorno
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
  return init;
}

function drawChart(state){
  const ctx = document.getElementById('chart');
  if(!ctx) return;

  const vals = ['1S','2S','3S','4S','5S'].map(k => state.scores[k]||0);
  const overdues = countOverdues(state);

  new Chart(ctx, {
    type:'bar',
    data:{
      labels:['1S','2S','3S','4S','5S','Ritardi'],
      datasets:[{
        data:[...vals, overdues],
        backgroundColor:[
          COLORS['1S'],COLORS['2S'],COLORS['3S'],COLORS['4S'],COLORS['5S'],COLORS['R']
        ],
        borderRadius:8
      }]
    },
    options:{
      maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{enabled:true},
        datalabels:{display:false}
      },
      scales:{
        y:{
          beginAtZero:true,max:100,
          grid:{color:'rgba(255,255,255,.06)'}
        },
        x:{grid:{display:false}}
      }
    }
  });
}

function countOverdues(state){
  let n=0;
  for(const s of ['1S','2S','3S','4S','5S']){
    const arr = state.items[s]||[];
    if(arr.some(it=> it.overdue===true)) n++;
  }
  return n;
}

function renderLateChips(state){
  const wrap = document.getElementById('lateChips');
  if(!wrap) return;
  const late = [];
  for(const s of ['1S','2S','3S','4S','5S']){
    const arr = state.items[s]||[];
    if(arr.some(it=> it.overdue===true)){
      late.push(s);
    }
  }
  wrap.innerHTML = late.map(s=>{
    const color = COLORS[s];
    return `<a class="chip ${s.toLowerCase()}" style="box-shadow:inset 0 0 0 2px ${color}" href="checklist.html#${s}">${s} in ritardo</a>`;
  }).join('') || '<span class="muted">Nessuna sezione in ritardo</span>';
}

document.addEventListener('DOMContentLoaded', ()=>{
  const state = ensureState();
  drawChart(state);
  renderLateChips(state);
});
