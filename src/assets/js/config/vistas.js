// Qué se grafica de cada indicador.
//
// El tipo por defecto viene del manifiesto (nota "Gráfico recomendado" de cada Excel, en datos.grafico.tipo).
// Aquí solo se elige qué series mostrar y se hacen las transformaciones que piden esas notas
// (p. ej. agrupar edades en 0–14, 15–64 y 65+). Una función recibe el JSON y devuelve la vista.
import { periodoLegible } from '../components/datos.js';

const IDX = 'Índice de volumen físico, base 2018=100';
const dim = (k, v) => s => s.dimensiones?.[k] === v;
const y = (...fs) => s => fs.every(f => f(s));
const limpiar = n => n.replace(/ · Tabasco$/, '');
const conNombre = (s, nombre) => ({ ...s, nombre: nombre ?? limpiar(s.nombre) });

/** Vista de series en el tiempo con las series que cumplan el filtro. */
function enElTiempo(d, filtro = () => true, extra = {}) {
  return {
    tipo: d.grafico.tipo ?? 'linea',
    etiquetas: d.periodos.map(periodoLegible),
    series: d.series.filter(filtro).map(s => conNombre(s)),
    unidad: d.unidad,
    ...extra,
  };
}

const edadInicial = g => parseInt(g, 10);
const gruposEdad = d => [...new Set(d.series.map(s => s.dimensiones['Grupo quinquenal de edad']))]
  .filter(g => Number.isFinite(edadInicial(g)));

const SECTORES = ['Actividades primarias', 'Actividades secundarias', 'Actividades terciarias'];

export const VISTAS = {
  'poblacion-total': d => enElTiempo(d, dim('Sexo', 'Total'), { series: d.series.filter(dim('Sexo', 'Total')).map(s => conNombre(s, 'Población total')) }),

  // Nota del Excel: barras apiladas al 100% agrupando en 0–14, 15–64 y 65+
  'distribucion-edad': d => {
    const rangos = [['0 a 14 años', 0, 14], ['15 a 64 años', 15, 64], ['65 años y más', 65, 200]];
    const totales = d.series.filter(dim('Sexo', 'Total'));
    return {
      tipo: 'barras-apiladas-100',
      etiquetas: d.periodos.map(periodoLegible),
      series: rangos.map(([nombre, a, b]) => ({
        nombre,
        valores: d.periodos.map((_, k) => totales
          .filter(s => { const e = edadInicial(s.dimensiones['Grupo quinquenal de edad']); return e >= a && e <= b; })
          .reduce((suma, s) => suma + (s.valores[k] ?? 0), 0)),
      })),
    };
  },

  // Nota del Excel: pirámide superpuesta (primer y último año). El archivo trae los grupos de 15 años y más.
  'menores-mayores-15': d => {
    const grupos = gruposEdad(d);
    const valor = (g, sexo, k) => d.series.find(y(dim('Grupo quinquenal de edad', g), dim('Sexo', sexo)))?.valores[k] ?? 0;
    const conjunto = (k, contorno) => ({
      nombre: d.periodos[k], contorno,
      hombres: grupos.map(g => valor(g, 'Hombres', k)), mujeres: grupos.map(g => valor(g, 'Mujeres', k)),
    });
    return { tipo: 'piramide', grupos, conjuntos: [conjunto(0, true), conjunto(d.periodos.length - 1, false)] };
  },

  'defunciones-causa': d => enElTiempo(d, dim('causa', 'Total'), { series: d.series.filter(dim('causa', 'Total')).map(s => conNombre(s, 'Defunciones registradas (total)')) }),

  // Sin recomendación en el Excel (decisión aprobada): % que en 2015 vivía en otro estado, por municipio
  'migracion-residencia-2015': d => {
    const col = 'Población de 5 años y más';
    const lugar = 'Lugar de residencia en marzo de 2015';
    const munis = [...new Set(d.series.map(s => s.dimensiones['Municipio de residencia actual']))].filter(m => m !== 'Total');
    const v = (m, l) => d.series.find(y(dim('Municipio de residencia actual', m), dim(lugar, l), dim('columna', col)))?.valores[0];
    const filas = munis.map(m => [m, (v(m, 'En otra entidad') / v(m, 'Total')) * 100]).sort((a, b) => b[1] - a[1]);
    return { tipo: 'barras-h', etiquetas: filas.map(f => f[0]), series: [{ nombre: '% que vivía en otro estado en 2015', valores: filas.map(f => f[1]) }], unidad: '%', decimales: 1 };
  },

  // Sin recomendación en el Excel (decisión aprobada): causas, total estatal
  'causa-migracion': d => {
    const filas = d.series
      .filter(y(dim('Municipio de residencia actual', 'Total'), s => s.dimensiones.columna.includes(' › ')))
      .map(s => [s.dimensiones.columna.split(' › ').pop(), s.valores[0]])
      .sort((a, b) => b[1] - a[1]);
    return { tipo: 'barras-h', etiquetas: filas.map(f => f[0]), series: [{ nombre: 'Personas migrantes de 5 años y más', valores: filas.map(f => f[1]) }], unidad: 'Personas' };
  },

  // Nota del Excel: barras apiladas al 100% por clase de hogar (sin los subtotales)
  'tipo-hogar': d => {
    const clases = d.series.filter(s => !['Total', 'Familiar', 'No familiar'].includes(s.dimensiones.tipo));
    return { tipo: 'barras-apiladas-100', etiquetas: d.periodos, series: clases.map(s => conNombre(s, s.dimensiones.tipo)) };
  },

  // La nota pide columnas apiladas al 100%, pero son dos conteos independientes (no partes de un total): columnas agrupadas
  'condiciones-vivienda': d => enElTiempo(d, () => true, { tipo: 'columnas' }),

  'posicion-ocupacion': d => enElTiempo(d, s => !s.nombre.startsWith('Total')),
  'duracion-jornadas': d => enElTiempo(d, s => s.nombre !== 'Total'),
  'desocupada-instruccion': d => enElTiempo(d, dim('sexo', 'Total'), {
    series: d.series.filter(dim('sexo', 'Total')).map(s => conNombre(s, s.nombre.replace(/ · Total$/, ''))),
  }),

  'pibe-total': d => enElTiempo(d, dim('medida', 'Millones de pesos a precios de 2018'), {
    series: d.series.filter(dim('medida', 'Millones de pesos a precios de 2018')).map(s => conNombre(s, 'PIB a precios de 2018')),
    unidad: 'Millones de pesos a precios de 2018',
  }),
  'pibe-aportacion-sector': d => enElTiempo(d, s => SECTORES.includes(s.dimensiones.concepto), { unidad: 'Puntos porcentuales' }),
  'pibe-estructura': d => enElTiempo(d, s => SECTORES.includes(s.dimensiones.concepto), { unidad: '%' }),
  'pibe-vab': d => enElTiempo(d, s => SECTORES.includes(s.dimensiones.concepto), { unidad: 'Millones de pesos a precios de 2018' }),

  // ITAEE: índices (base 2018 = 100). Por sector se usan líneas (decisión aprobada), no áreas al 100%.
  'itaee-total': d => enElTiempo(d, dim('medida', IDX), { tipo: 'linea', series: d.series.filter(dim('medida', IDX)).map(s => conNombre(s, 'ITAEE total')), unidad: 'Índice (2018 = 100)' }),
  'itaee-primario': d => enElTiempo(d, dim('medida', IDX), { tipo: 'linea', unidad: 'Índice (2018 = 100)' }),
  'itaee-secundario': d => enElTiempo(d, dim('medida', IDX), { tipo: 'linea', unidad: 'Índice (2018 = 100)' }),
  'itaee-terciario': d => enElTiempo(d, dim('medida', IDX), { tipo: 'linea', unidad: 'Índice (2018 = 100)' }),
  'itaee-sin-mineria-petrolera': d => enElTiempo(d, dim('medida', IDX), { tipo: 'linea', series: d.series.filter(dim('medida', IDX)).map(s => conNombre(s, 'ITAEE sin minería petrolera')), unidad: 'Índice (2018 = 100)' }),

  // Nota del Excel: 4 líneas (minería, construcción, manufacturas, energía)
  'imaief': d => {
    const lineas = [['21', 'Minería'], ['23', 'Construcción'], ['31-33', 'Industrias manufactureras'], ['22', 'Energía eléctrica, agua y gas']];
    return enElTiempo(d, dim('medida', IDX), {
      tipo: 'lineas-multiserie',
      series: lineas.map(([codigo, nombre]) => conNombre(d.series.find(y(dim('medida', IDX), dim('codigo', codigo))), nombre)),
      unidad: 'Índice (2018 = 100)',
    });
  },
};

/** Indicadores que se muestran sin gráfica (decisiones aprobadas). */
export const POR_REVISAR = {
  'tasa-informalidad': 'Por revisar: el archivo trae personas (serie 6200093709), no una tasa en porcentaje para Tabasco.',
};

// Tipos que comparan varias series: por defecto se muestran todas; los demás, solo la principal
const MULTISERIE = ['area-apilada', 'area-apilada-100', 'columnas-apiladas-100', 'barras-apiladas-100', 'lineas-multiserie'];

export function vistaDe(datos) {
  const porDefecto = d => enElTiempo(d, MULTISERIE.includes(d.grafico.tipo) ? () => true : (_, i) => i === 0);
  return (VISTAS[datos.id] ?? porDefecto)(datos);
}
