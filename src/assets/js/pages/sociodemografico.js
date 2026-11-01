import '../core/main.js';
import { cargarIndicador, fuenteCorta, periodoLegible, numero } from '../components/datos.js';
import { dibujar } from '../components/graficas.js';
import { ponerKpi, ultimoYAnterior, tendencia } from '../components/kpi.js';
import { montarIndicadores } from '../components/indicadores.js';

const M = 'sociodemografico';
const dim = (k, v) => s => s.dimensiones?.[k] === v;

async function kpis() {
  const [pob, edad, dens, hog] = await Promise.all(['poblacion-total', 'edad-mediana', 'densidad-poblacion', 'numero-hogares'].map(id => cargarIndicador(M, id)));
  // Fuente del dato; se agrega el año si la fuente no lo menciona
  const sub = (d, u) => { const f = fuenteCorta(d, u.periodo); return f.includes(u.periodo) ? f : `${f} · ${periodoLegible(u.periodo)}`; };

  let u = ultimoYAnterior(pob, pob.series.find(dim('Sexo', 'Total')));
  ponerKpi('poblacion-total', { valor: numero(u.valor), tendencia: tendencia(u), sub: sub(pob, u) });
  u = ultimoYAnterior(edad, edad.series[0]);
  ponerKpi('edad-mediana', { valor: numero(u.valor), unidad: 'años', tendencia: tendencia(u, { porcentaje: false, decimales: 1, sufijo: ' años' }), sub: sub(edad, u) });
  u = ultimoYAnterior(dens, dens.series[0]);
  ponerKpi('densidad-poblacion', { valor: numero(u.valor, 1), unidad: 'hab/km²', tendencia: tendencia(u, { porcentaje: false, decimales: 1 }), sub: sub(dens, u) });
  u = ultimoYAnterior(hog, hog.series[0]);
  ponerKpi('numero-hogares', { valor: numero(u.valor), tendencia: tendencia(u), sub: sub(hog, u) });
}

async function graficasPrincipales() {
  const [dist, pob] = await Promise.all([cargarIndicador(M, 'distribucion-edad'), cargarIndicador(M, 'poblacion-total')]);

  // Pirámide del año más reciente
  const k = dist.periodos.length - 1;
  const grupos = [...new Set(dist.series.map(s => s.dimensiones['Grupo quinquenal de edad']))].filter(g => /^\d/.test(g));
  const v = (g, sexo) => dist.series.find(s => s.dimensiones['Grupo quinquenal de edad'] === g && s.dimensiones.Sexo === sexo)?.valores[k] ?? 0;
  document.getElementById('titulo-piramide').textContent = `Pirámide poblacional · Tabasco ${dist.periodos[k]}`;
  dibujar(document.getElementById('chart-pyramid'), {
    tipo: 'piramide', grupos, conjuntos: [{ nombre: dist.periodos[k], hombres: grupos.map(g => v(g, 'Hombres')), mujeres: grupos.map(g => v(g, 'Mujeres')) }],
  });

  // Distribución por sexo del año más reciente
  const j = pob.periodos.length - 1;
  const h = pob.series.find(dim('Sexo', 'Hombres')).valores[j];
  const m = pob.series.find(dim('Sexo', 'Mujeres')).valores[j];
  document.getElementById('titulo-sexo').textContent = `Distribución por sexo · ${pob.periodos[j]}`;
  dibujar(document.getElementById('chart-sex-donut'), {
    tipo: 'dona', etiquetas: ['Hombres', 'Mujeres'], series: [{ nombre: 'Población', valores: [h, m] }],
    colores: ['rgba(30,95,140,0.80)', 'rgba(219,39,119,0.75)'],
  });
  document.getElementById('texto-sexo').textContent =
    `Hombres ${numero((h / (h + m)) * 100, 1)}% · Mujeres ${numero((m / (h + m)) * 100, 1)}% · ${fuenteCorta(pob, pob.periodos[j])}`;
}

kpis();
graficasPrincipales();
montarIndicadores();
