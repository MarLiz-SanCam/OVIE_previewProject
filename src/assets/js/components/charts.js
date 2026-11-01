

'use strict';

// Radar del comparador (página Comparar, inactiva). Las gráficas de indicadores están en graficas.js.

import Chart from 'chart.js/auto';

const C = {
  blue:    '#1e5f8c',
  blueL:   'rgba(30,95,140,0.15)',
  teal:    '#1d9e75',
  tealL:   'rgba(29,158,117,0.15)',
  pink:    '#db2777',
  pinkL:   'rgba(219,39,119,0.15)',
  indigo:  '#4f46e5',
  amber:   '#d97706',
  emerald: '#059669',
  gray:    '#9ca3af',
  violet:  '#7c3aed',
  earth:   '#92400e',
};

const GRID_COLOR = '#f0f0f0';

Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.font.size   = 11;

window.chartInstances = {};

function initCompCharts() {
  initRadarChart();
}

let _radarChart = null;

function initRadarChart() {
  const ctx = document.getElementById('chart-radar');
  if (!ctx) return;
  if (_radarChart) return;

  const defaultA = { pob:380011, hogares:115430, pea:168432, pib_pc:145230, informal:48.2, densidad:1820 };
  const defaultB = { pob:538980, hogares:160234, pea:238765, pib_pc:98420,  informal:52.1, densidad:142  };

  _radarChart = new Chart(ctx, {
    type: 'radar',
    data: buildRadarData(defaultA, defaultB, 'Villahermosa', 'Centro'),
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { stepSize: 25, font: { size: 9 }, backdropColor: 'transparent' },
          grid: { color: GRID_COLOR },
          pointLabels: { font: { size: 10 }, color: '#374151' }
        }
      },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 11 } } }
      }
    }
  });
  window.chartInstances.radar = _radarChart;
}

function buildRadarData(da, db, lblA, lblB) {
  const maxes = { pob:600000, hogares:180000, pea:260000, pib_pc:160000, informal:75, densidad:2000 };
  const labels = ['Población','Hogares','PEA','PIB pc','Informalidad *','Densidad'];
  const norm = (val, key) => Math.min(100, Math.round(val / maxes[key] * 100));

  return {
    labels,
    datasets: [
      {
        label: lblA,
        data: [norm(da.pob,'pob'), norm(da.hogares,'hogares'), norm(da.pea,'pea'),
               norm(da.pib_pc,'pib_pc'), norm(da.informal,'informal'), norm(da.densidad,'densidad')],
        backgroundColor: 'rgba(30,95,140,0.15)',
        borderColor: C.blue,
        borderWidth: 2,
        pointBackgroundColor: C.blue,
        pointRadius: 4,
      },
      {
        label: lblB,
        data: [norm(db.pob,'pob'), norm(db.hogares,'hogares'), norm(db.pea,'pea'),
               norm(db.pib_pc,'pib_pc'), norm(db.informal,'informal'), norm(db.densidad,'densidad')],
        backgroundColor: 'rgba(29,158,117,0.12)',
        borderColor: C.teal,
        borderWidth: 2,
        pointBackgroundColor: C.teal,
        pointRadius: 4,
      }
    ]
  };
}

function updateRadarChart(da, db, lblA, lblB) {
  if (!_radarChart) { initRadarChart(); return; }
  const newData = buildRadarData(da, db, lblA, lblB);
  _radarChart.data = newData;
  _radarChart.update();
}

export { initCompCharts, updateRadarChart };

