// Dibuja una "vista" (ver config/vistas.js) con Chart.js.
//
// Vista: { tipo, etiquetas, series: [{ nombre, valores }], unidad?, decimales? }
//   tipo: linea · lineas-multiserie · area-apilada · area-apilada-100 · columnas
//         columnas-apiladas-100 · barras-apiladas-100 · barras-h · dona · piramide
// La pirámide usa { grupos, conjuntos: [{ nombre, hombres, mujeres, contorno? }] }.
import Chart from 'chart.js/auto';
import { numero } from './datos.js';

const COLORES = ['#1e5f8c', '#1d9e75', '#d97706', '#7c3aed', '#db2777', '#059669', '#0891b2', '#a01040', '#9ca3af', '#4f46e5', '#92400e'];
const GRID = '#f0f0f0';
const HOMBRES = '30,95,140', MUJERES = '219,39,119';

Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.font.size = 11;

const alfa = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Convierte cada posición del eje en porcentajes que suman 100. */
function aPorcentajes(series) {
  const n = series[0]?.valores.length ?? 0;
  const totales = Array.from({ length: n }, (_, k) => series.reduce((a, s) => a + (s.valores[k] ?? 0), 0));
  return series.map(s => ({ ...s, valores: s.valores.map((v, k) => (v == null || !totales[k] ? null : (v / totales[k]) * 100)) }));
}

function opcionesBase(vista, { porcentaje = false, horizontal = false, apilado = false } = {}) {
  const unidad = porcentaje ? '%' : vista.unidad ?? '';
  const fmt = v => `${numero(v, porcentaje ? 1 : vista.decimales)}${unidad === '%' ? ' %' : ''}`;
  const ejeValor = {
    stacked: apilado,
    ...(porcentaje ? { min: 0, max: 100 } : {}),
    grid: { color: GRID },
    ticks: { font: { size: 10 }, callback: v => numero(v, porcentaje ? 0 : undefined) },
    title: { display: !!unidad && unidad !== '%', text: unidad, font: { size: 10 }, color: '#9ca3af' },
  };
  // Hasta 20 categorías (municipios, sectores) se muestran todas; series largas saltan etiquetas
  const pocas = (vista.etiquetas?.length ?? 0) <= 20;
  const ejeCategoria = {
    stacked: apilado,
    grid: { display: false },
    ticks: pocas
      ? { font: { size: 10 }, autoSkip: false, maxRotation: horizontal ? 0 : 50 }
      : { font: { size: 10 }, autoSkip: true, maxTicksLimit: horizontal ? 20 : 12, maxRotation: 0 },
  };
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: (vista.series?.length ?? 0) > 1, position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 10 } } },
      tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed[horizontal ? 'x' : 'y'])}${unidad && unidad !== '%' ? ' ' + unidad : ''}` } },
    },
    scales: horizontal ? { x: ejeValor, y: ejeCategoria } : { x: ejeCategoria, y: ejeValor },
  };
}

const RENDER = {
  linea(vista, { area = false, apilado = false, porcentaje = false } = {}) {
    const series = porcentaje ? aPorcentajes(vista.series) : vista.series;
    return {
      type: 'line',
      data: {
        labels: vista.etiquetas,
        datasets: series.map((s, i) => ({
          label: s.nombre, data: s.valores,
          borderColor: COLORES[i % COLORES.length],
          backgroundColor: area ? alfa(COLORES[i % COLORES.length], apilado ? 0.75 : 0.15) : COLORES[i % COLORES.length],
          fill: area ? (apilado && i > 0 ? '-1' : 'origin') : false,
          // "monotone" suaviza sin pasarse de los valores reales entre puntos
          borderWidth: 2, pointRadius: vista.etiquetas.length > 40 ? 0 : 3, pointHoverRadius: 5, cubicInterpolationMode: 'monotone', spanGaps: true,
        })),
      },
      options: opcionesBase(vista, { porcentaje, apilado }),
    };
  },
  'lineas-multiserie': v => RENDER.linea(v),
  'area-apilada': v => RENDER.linea(v, { area: true, apilado: v.series.length > 1 }),
  'area-apilada-100': v => RENDER.linea(v, { area: true, apilado: true, porcentaje: true }),

  columnas(vista, { apilado = false, porcentaje = false, horizontal = false } = {}) {
    const series = porcentaje ? aPorcentajes(vista.series) : vista.series;
    return {
      type: 'bar',
      data: {
        labels: vista.etiquetas,
        datasets: series.map((s, i) => ({
          label: s.nombre, data: s.valores,
          backgroundColor: alfa(COLORES[i % COLORES.length], 0.85), borderRadius: apilado ? 0 : 3,
          maxBarThickness: 42,
        })),
      },
      options: opcionesBase(vista, { porcentaje, apilado, horizontal }),
    };
  },
  'columnas-apiladas-100': v => RENDER.columnas(v, { apilado: true, porcentaje: true }),
  'barras-apiladas-100': v => RENDER.columnas(v, { apilado: true, porcentaje: true, horizontal: true }),
  'barras-h': v => RENDER.columnas(v, { horizontal: true }),

  dona(vista) {
    const s = vista.series[0];
    const total = s.valores.reduce((a, v) => a + (v ?? 0), 0);
    return {
      type: 'doughnut',
      data: { labels: vista.etiquetas, datasets: [{ data: s.valores, backgroundColor: vista.colores ?? COLORES, borderColor: '#fff', borderWidth: 3, hoverOffset: 6 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 10 } } },
          tooltip: { callbacks: { label: c => ` ${c.label}: ${numero(c.raw, vista.decimales)}${vista.unidad === '%' ? ' %' : ''} (${numero((c.raw / total) * 100, 1)} %)` } },
        },
      },
    };
  },

  piramide(vista) {
    const datasets = vista.conjuntos.flatMap(c => [
      { label: `Hombres ${c.nombre}`, data: c.hombres.map(v => -v), color: HOMBRES, contorno: c.contorno },
      { label: `Mujeres ${c.nombre}`, data: c.mujeres, color: MUJERES, contorno: c.contorno },
    ]).map(d => ({
      label: d.label, data: d.data, grouped: false, borderRadius: 2, barPercentage: 0.95, categoryPercentage: 0.95,
      backgroundColor: d.contorno ? 'transparent' : `rgba(${d.color},0.7)`,
      borderColor: `rgba(${d.color},1)`, borderWidth: d.contorno ? 1.5 : 0,
    }));
    return {
      type: 'bar',
      data: { labels: vista.grupos, datasets },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 10 } } },
          tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${numero(Math.abs(c.raw))}` } },
        },
        scales: {
          x: { grid: { color: GRID }, ticks: { font: { size: 10 }, callback: v => numero(Math.abs(v) / 1000, 0) + 'k' } },
          y: { reverse: true, grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      },
    };
  },
};

/** Dibuja la vista en el canvas y devuelve la instancia de Chart. */
export function dibujar(canvas, vista) {
  const render = RENDER[vista.tipo];
  if (!render) throw new Error(`Tipo de gráfica desconocido: ${vista.tipo}`);
  Chart.getChart(canvas)?.destroy();
  return new Chart(canvas, render(vista));
}

/** Deja solo las posiciones del eje entre los índices desde y hasta (incluidos). */
const recortar = (vista, desde, hasta) => ({
  ...vista,
  etiquetas: vista.etiquetas.slice(desde, hasta + 1),
  series: vista.series.map(s => ({ ...s, valores: s.valores.slice(desde, hasta + 1) })),
});

/**
 * Dibuja la vista con selectores "Desde / Hasta" que redibujan solo ese tramo del eje (extremos incluidos).
 * Devuelve el contenedor de los selectores para colocarlo en la tarjeta; arranca con el rango completo.
 */
export function dibujarConRango(canvas, vista) {
  const caja = document.createElement('div');
  caja.className = 'flex items-center gap-1 text-xs text-gray-500';
  caja.innerHTML = '<label>Desde <select class="rango-select"></select></label><label>Hasta <select class="rango-select"></select></label>';
  const [selDesde, selHasta] = caja.querySelectorAll('select');
  const n = vista.etiquetas.length;
  // "Desde" solo ofrece posiciones ≤ "Hasta" y viceversa, así no se puede elegir un rango invertido
  const opciones = (sel, de, a, valor) =>
    sel.replaceChildren(...vista.etiquetas.slice(de, a + 1).map((e, k) => new Option(e, de + k, false, de + k === valor)));
  const aplicar = (desde, hasta) => {
    opciones(selDesde, 0, hasta, desde);
    opciones(selHasta, desde, n - 1, hasta);
    dibujar(canvas, recortar(vista, desde, hasta));
  };
  caja.addEventListener('change', () => aplicar(+selDesde.value, +selHasta.value));
  aplicar(0, n - 1);
  return caja;
}
