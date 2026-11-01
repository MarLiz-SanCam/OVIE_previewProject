

'use strict';

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

document.addEventListener('DOMContentLoaded', () => {
  initPyramidChart();
  initSexDonut();
});

function initEcoCharts() {
  initITAEEChart();
  initPIBEDonut();
}

function initCompCharts() {
  initRadarChart();
}

function initPyramidChart() {
  const ctx = document.getElementById('chart-pyramid');
  if (!ctx || window.chartInstances.pyramid) return;

  const labels = ['0â€“4','5â€“9','10â€“14','15â€“19','20â€“24','25â€“29','30â€“34','35â€“39',
                  '40â€“44','45â€“49','50â€“54','55â€“59','60â€“64','65â€“69','70â€“74','75+'];

  const males   = [-84500,-90100,-93200,-87400,-82100,-76500,-69800,-63200,
                   -55400,-47600,-38900,-30100,-22800,-15900,-10200,-8400];
  const females = [ 81200, 86700, 89500, 84600, 80300, 75100, 68400, 62100,
                    54800, 47200, 38500, 30200, 23100, 16500, 11200,10800];

  window.chartInstances.pyramid = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Hombres', data: males,   backgroundColor: 'rgba(30,95,140,0.70)',  borderColor: C.blue,  borderWidth: 0, borderRadius: 2 },
        { label: 'Mujeres', data: females, backgroundColor: 'rgba(219,39,119,0.65)', borderColor: C.pink,  borderWidth: 0, borderRadius: 2 },
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, padding: 14, font: { size: 11 } } },
        tooltip: {
          callbacks: { label: ctx => ' ' + Math.abs(ctx.raw).toLocaleString('es-MX') }
        }
      },
      scales: {
        x: {
          ticks: { callback: v => Math.abs(v / 1000) + 'k', font: { size: 10 } },
          grid: { color: GRID_COLOR }
        },
        y: { ticks: { font: { size: 10 } }, grid: { display: false } }
      }
    }
  });
}

function initSexDonut() {
  const ctx = document.getElementById('chart-sex-donut');
  if (!ctx || window.chartInstances.sexDonut) return;

  window.chartInstances.sexDonut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Hombres', 'Mujeres'],
      datasets: [{
        data: [49.1, 50.9],
        backgroundColor: ['rgba(30,95,140,0.80)', 'rgba(219,39,119,0.75)'],
        borderColor: ['#fff', '#fff'],
        borderWidth: 3,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => ' ' + ctx.raw + '%' } }
      }
    }
  });
}

function initITAEEChart() {
  const ctx = document.getElementById('chart-itaee');
  if (!ctx || window.chartInstances.itaee) return;

  const labels = ['Q1 2022','Q2 2022','Q3 2022','Q4 2022',
                  'Q1 2023','Q2 2023','Q3 2023','Q4 2023'];

  const makeDS = (label, data, color) => ({
    label, data,
    borderColor: color,
    backgroundColor: 'transparent',
    borderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    tension: 0.3,
  });

  window.chartInstances.itaee = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        makeDS('Total',     [98.2,100.1,99.8,101.2,102.5,103.1,104.8,106.2], C.blue),
        makeDS('Terciario', [101.2,103.4,102.9,104.1,106.2,107.8,109.1,111.4], C.teal),
        makeDS('Secundario',[96.4,99.2,98.1,100.8,101.9,102.4,103.7,105.1], C.amber),
        makeDS('Primario',  [95.1,97.3,96.8,98.4,99.2,100.5,101.8,103.1], C.emerald),
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 11 } } }
      },
      scales: {
        x: { grid: { color: GRID_COLOR }, ticks: { font: { size: 10 } } },
        y: {
          grid: { color: GRID_COLOR },
          ticks: { font: { size: 10 } },
          title: { display: true, text: 'Ãndice (base 2013=100)', font: { size: 10 }, color: '#9ca3af' }
        }
      }
    }
  });
}

function initPIBEDonut() {
  const ctx = document.getElementById('chart-pibe');
  if (!ctx || window.chartInstances.pibe) return;

  window.chartInstances.pibe = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['MinerÃ­a / PetrÃ³leo','Comercio','Servicios financieros',
               'Manufactura','ConstrucciÃ³n','Agropecuario','Otros servicios'],
      datasets: [{
        data: [42, 18, 12, 8, 7, 5, 8],
        backgroundColor: [C.blue, C.teal, C.violet, C.amber, C.pink, C.emerald, C.gray],
        borderColor: '#fff',
        borderWidth: 3,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 10 } } },
        tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + ctx.raw + '%' } }
      }
    }
  });
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
  const labels = ['PoblaciÃ³n','Hogares','PEA','PIB pc','Informalidad *','Densidad'];
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

