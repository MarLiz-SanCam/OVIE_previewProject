

'use strict';

import { initEcoCharts, initCompCharts, updateRadarChart } from './charts.js';
import { initMapTurismo, initMapProveedores } from './map.js';

window.chartInstances = {};
window.mapInstances   = {};
const initializedTabs  = new Set(['socio']);

function switchTab(id, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

  document.getElementById('tab-' + id).classList.add('active');
  btn.classList.add('active');

  if (!initializedTabs.has(id)) {
    initializedTabs.add(id);
    if (id === 'eco')  typeof initEcoCharts  === 'function' && initEcoCharts();
    if (id === 'comp') typeof initCompCharts === 'function' && initCompCharts();
    if (id === 'tur')  typeof initMapTurismo === 'function' && initMapTurismo();
    if (id === 'prov') typeof initMapProveedores === 'function' && initMapProveedores();
  }

  setTimeout(() => {
    Object.values(window.chartInstances).forEach(c => c.resize?.());
    Object.values(window.mapInstances).forEach(m => m.invalidateSize?.());
  }, 60);
}

const VAR_DATA = {
  pob_total:    { label: 'Población total',           val: 2402598 },
  pob_pea:      { label: 'PEA',                       val: 1205432 },
  pob_ocupada:  { label: 'Población ocupada',         val: 1085234 },
  num_hogares:  { label: 'Nº de hogares',             val: 710245  },
  pib_mmp:      { label: 'PIBE (millones de pesos)',  val: 249700  },
  pib_pc:       { label: 'PIB per cápita (pesos)',    val: 103957  },
  tasa_informal:{ label: 'Tasa de informalidad (%)',  val: 56.4    },
  mortalidad:   { label: 'Tasa mortalidad general',   val: 5.2     },
  fecundidad:   { label: 'Tasa global fecundidad',    val: 2.1     },
  densidad:     { label: 'Densidad hab/km²',          val: 38.7    },
  edad_mediana: { label: 'Edad mediana',              val: 28.3    },
};

const MUNI_DATA = {
  'Villahermosa': { pob:380011, hogares:115430, pea:168432, pib_pc:145230, informal:48.2, densidad:1820, edad_med:30.1 },
  'Centro':       { pob:538980, hogares:160234, pea:238765, pib_pc:98420,  informal:52.1, densidad:142,  edad_med:28.7 },
  'Cárdenas':     { pob:268008, hogares:78432,  pea:118654, pib_pc:72340,  informal:61.3, densidad:98,   edad_med:26.4 },
  'Paraíso':      { pob:109956, hogares:32765,  pea:49832,  pib_pc:87650,  informal:57.8, densidad:215,  edad_med:27.8 },
  'Comalcalco':   { pob:211614, hogares:62341,  pea:93210,  pib_pc:65430,  informal:63.2, densidad:176,  edad_med:26.1 },
  'Nacajuca':     { pob:116345, hogares:34123,  pea:51234,  pib_pc:61230,  informal:65.4, densidad:312,  edad_med:25.3 },
  'Cunduacán':    { pob:143152, hogares:42312,  pea:63456,  pib_pc:58340,  informal:64.7, densidad:143,  edad_med:26.8 },
  'Macuspana':    { pob:168960, hogares:49876,  pea:74321,  pib_pc:54230,  informal:68.1, densidad:42,   edad_med:25.6 },
  'Teapa':        { pob:52043,  hogares:15234,  pea:22134,  pib_pc:48230,  informal:69.3, densidad:57,   edad_med:25.1 },
  'Balancán':     { pob:59321,  hogares:17654,  pea:25432,  pib_pc:45230,  informal:71.2, densidad:18,   edad_med:24.8 },
};

function calcular() {
  const areaEl = document.getElementById('calc-area');
  const v1El   = document.getElementById('calc-var1');
  const opEl   = document.getElementById('calc-op');
  const v2El   = document.getElementById('calc-var2');
  if (!areaEl || !v1El || !opEl || !v2El) return;

  const area = areaEl.options[areaEl.selectedIndex]?.text ?? areaEl.value;
  const v1k  = v1El.value;
  const op   = opEl.value;
  const v2k  = v2El.value;

  const v1   = VAR_DATA[v1k]?.val ?? 0;
  const v2   = VAR_DATA[v2k]?.val ?? 1;
  const lbl1 = VAR_DATA[v1k]?.label ?? v1k;
  const lbl2 = VAR_DATA[v2k]?.label ?? v2k;

  let result;
  switch (op) {
    case '+': result = v1 + v2; break;
    case '-': result = v1 - v2; break;
    case '×': result = v1 * v2; break;
    case '÷': result = v2 !== 0 ? v1 / v2 : null; break;
    default:  result = null;
  }

  const el = document.getElementById('calc-result');
  if (!el) return;
  if (result == null) { el.style.display = 'none'; return; }

  el.style.display = 'block';
  const valEl    = document.getElementById('calc-result-value');
  const formulaEl= document.getElementById('calc-result-formula');
  const areaEl2  = document.getElementById('calc-result-area');
  if (valEl)    valEl.textContent     = fmtNum(result);
  if (formulaEl) formulaEl.textContent = `${lbl1}  ${op}  ${lbl2}`;
  if (areaEl2)  areaEl2.textContent   = area;
}

function fmtNum(n) {
  if (!isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(3) + ' B';
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + ' M';
  if (abs >= 1e4) return Math.round(n).toLocaleString('es-MX');
  return n.toLocaleString('es-MX', { maximumFractionDigits: 2 });
}

function comparar() {
  const selA = document.getElementById('comp-a');
  const selB = document.getElementById('comp-b');
  if (!selA || !selB) return;

  const ka = selA.value;
  const kb = selB.value;
  const da = MUNI_DATA[ka];
  const db = MUNI_DATA[kb];
  if (!da || !db) return;

  const hA = document.getElementById('comp-header-a');
  const hB = document.getElementById('comp-header-b');
  if (hA) hA.textContent = ka;
  if (hB) hB.textContent = kb;

  const rows = [
    ['Población total',   fmt(da.pob),             fmt(db.pob),             pctDiff(da.pob,       db.pob)       ],
    ['Hogares',           fmt(da.hogares),          fmt(db.hogares),          pctDiff(da.hogares,   db.hogares)   ],
    ['PEA',               fmt(da.pea),              fmt(db.pea),              pctDiff(da.pea,       db.pea)       ],
    ['PIB per cápita',    '$ '+fmt(da.pib_pc),      '$ '+fmt(db.pib_pc),      pctDiff(da.pib_pc,    db.pib_pc)    ],
    ['Informalidad',      da.informal+'%',          db.informal+'%',          absDiff(da.informal,  db.informal)+' pp'],
    ['Densidad (hab/km²)',fmt(da.densidad),         fmt(db.densidad),         pctDiff(da.densidad,  db.densidad)  ],
    ['Edad mediana',      da.edad_med+' años',      db.edad_med+' años',      absDiff(da.edad_med,  db.edad_med)+' años'],
  ];

  const tbody = document.getElementById('comp-tbody');
  if (tbody) {
    tbody.innerHTML = rows.map(([label, va, vb, d]) => `
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="px-4 py-3 text-sm font-medium text-gray-700">${label}</td>
        <td class="px-4 py-3 text-sm font-semibold text-blue-700">${va}</td>
        <td class="px-4 py-3 text-sm font-semibold" style="color:var(--chart-teal)">${vb}</td>
        <td class="px-4 py-3 text-xs text-gray-500">${d}</td>
      </tr>`
    ).join('');
  }

  const tableEl = document.getElementById('comp-table');
  if (tableEl) tableEl.style.display = 'block';

  if (typeof updateRadarChart === 'function') updateRadarChart(da, db, ka, kb);
}

function fmt(n)         { return n.toLocaleString('es-MX'); }
function pctDiff(a, b)  {
  if (b === 0) return '—';
  const d = ((a - b) / b * 100).toFixed(1);
  return (d > 0 ? '+' : '') + d + '%';
}
function absDiff(a, b)  {
  const d = (a - b).toFixed(1);
  return (d > 0 ? '+' : '') + d;
}

function toggleLayer(btn, layerKey) {
  btn.classList.toggle('active');
  const map = window.mapInstances.turismo;
  if (!map || !window.mapLayers) return;
  const lg = window.mapLayers[layerKey];
  if (!lg) return;
  if (map.hasLayer(lg)) map.removeLayer(lg);
  else                  map.addLayer(lg);
}

export { switchTab, calcular, comparar, toggleLayer };

