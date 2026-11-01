

'use strict';

import '../core/main.js';
import { initCompCharts, updateRadarChart } from '../components/charts.js';

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

  updateRadarChart(da, db, ka, kb);
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

initCompCharts();

document.querySelector('[data-accion="comparar"]')?.addEventListener('click', comparar);
document.querySelector('[data-accion="limpiar"]')?.addEventListener('click', () => {
  document.getElementById('comp-table').style.display = 'none';
});
