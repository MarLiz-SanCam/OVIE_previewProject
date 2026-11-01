import '../core/main.js';
import { cargarIndicador, periodoLegible, numero, signo } from '../components/datos.js';
import { dibujar } from '../components/graficas.js';
import { ponerKpi, pendienteKpi, ultimoYAnterior, direccion } from '../components/kpi.js';
import { montarIndicadores } from '../components/indicadores.js';

const M = 'economia';
const IDX = 'Índice de volumen físico, base 2018=100';
const VAR = 'Variación porcentual anual';
const dim = (k, v) => s => s.dimensiones?.[k] === v;

async function kpis() {
  const [pibe, itaee] = await Promise.all([cargarIndicador(M, 'pibe-total'), cargarIndicador(M, 'itaee-total')]);

  const u = ultimoYAnterior(pibe, pibe.series.find(dim('medida', 'Millones de pesos a precios de 2018')));
  const varPibe = pibe.series.find(dim('medida', 'Variación porcentual anual en valores constantes')).valores[pibe.periodos.indexOf(u.periodo)];
  ponerKpi('pibe', {
    valor: `$${numero(u.valor / 1000, 1)}`, unidad: 'mmdp',
    tendencia: { dir: direccion(varPibe), texto: `${signo(varPibe)}% real en ${u.periodo}` },
    sub: 'INEGI · Cuentas Nacionales · precios de 2018',
  });

  const v = ultimoYAnterior(itaee, itaee.series.find(dim('medida', VAR)));
  ponerKpi('itaee', {
    valor: signo(v.valor), unidad: '%',
    tendencia: { dir: direccion(v.valor), texto: `vs ${periodoLegible(v.periodo).replace(/ \d{4}$/, '')} del año anterior` },
    sub: `INEGI · ITAEE · ${periodoLegible(v.periodo)}`,
  });

  // Decisiones aprobadas: sin archivo / archivo por revisar
  pendienteKpi('desocupacion', 'Pendiente de fuente', 'No hay archivo en Info/');
  pendienteKpi('informalidad', 'Por revisar', 'El archivo trae personas, no una tasa');
}

async function graficasPrincipales() {
  // ITAEE total y por gran sector, últimos 12 trimestres
  const ids = ['itaee-total', 'itaee-primario', 'itaee-secundario', 'itaee-terciario'];
  const nombres = ['Total', 'Primario', 'Secundario', 'Terciario'];
  const series = await Promise.all(ids.map(id => cargarIndicador(M, id)));
  const periodos = series[0].periodos.slice(-12);
  dibujar(document.getElementById('chart-itaee'), {
    tipo: 'linea',
    etiquetas: periodos.map(periodoLegible),
    series: series.map((d, i) => {
      const s = d.series.find(dim('medida', IDX));
      return { nombre: nombres[i], valores: periodos.map(p => s.valores[d.periodos.indexOf(p)] ?? null) };
    }),
    unidad: 'Índice (2018 = 100)',
  });
  document.getElementById('titulo-itaee').textContent =
    `ITAEE por sector · Tabasco (base 2018 = 100) · ${periodoLegible(periodos[0])} – ${periodoLegible(periodos.at(-1))}`;

  // Estructura del PIBE por sector (2 dígitos SCIAN) del año más reciente: 6 mayores + otros
  const est = await cargarIndicador(M, 'pibe-estructura');
  const k = est.periodos.length - 1;
  const sectores = est.series
    .filter(s => /^\d{2}(-\d{2})?$/.test(s.dimensiones.codigo ?? ''))
    .map(s => [s.dimensiones.concepto, s.valores[k]])
    .sort((a, b) => b[1] - a[1]);
  const total = est.series.find(dim('concepto', 'Actividad económica total')).valores[k];
  const top = sectores.slice(0, 6);
  const otros = total - top.reduce((a, s) => a + s[1], 0);
  const corto = t => (t.length > 34 ? t.slice(0, 32) + '…' : t);
  document.getElementById('titulo-pibe').textContent = `PIBE por actividad económica · ${est.periodos[k]}`;
  dibujar(document.getElementById('chart-pibe'), {
    tipo: 'dona', etiquetas: [...top.map(s => corto(s[0])), 'Otros sectores'],
    series: [{ nombre: '% del PIB', valores: [...top.map(s => s[1]), otros] }], unidad: '%', decimales: 1,
  });
  document.getElementById('texto-pibe').textContent =
    `${top[0][0]}: ${numero(top[0][1], 1)}% del PIB estatal en ${est.periodos[k]} (valores constantes)`;
}

kpis();
graficasPrincipales();
montarIndicadores();
