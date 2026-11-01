// Convierte los archivos de Info/ en JSON para el sitio.
//
//   npm run datos
//
// Entrada:  Info/ (Excel y CSV de INEGI, no se publica) + scripts/datos/manifiesto.json
// Salida:   src/public/data/   (se publica tal cual; las páginas lo cargan con fetch)
//           scripts/datos/reporte.md   (para validar el contenido; no se publica)
//
// Si un archivo cambia de estructura, el script se detiene con un mensaje en lugar de generar datos incorrectos.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import leerTabuladoCensal from './lectores/tabulado-censal.mjs';
import leerBieSerie from './lectores/bie-serie.mjs';
import leerInegiExporta from './lectores/inegi-exporta.mjs';
import leerScn from './lectores/scn.mjs';
import leerCensoTab from './lectores/censo-tab.mjs';
import leerDenue from './lectores/denue.mjs';
import { ordenarPeriodos, rel } from './lectores/comun.mjs';

const raiz = fileURLToPath(new URL('../..', import.meta.url));
const INFO = path.join(raiz, 'Info');
const SALIDA = path.join(raiz, 'src', 'public', 'data');
const REPORTE = path.join(raiz, 'scripts', 'datos', 'reporte.md');
const manifiesto = JSON.parse(fs.readFileSync(new URL('./manifiesto.json', import.meta.url), 'utf8'));

const LECTORES = {
  'tabulado-censal': (archivos, op) => unirSeries(archivos.map(a => leerTabuladoCensal(a, op))),
  // nombresPorArchivo: cuando el indicador junta varias series del BIE, una por archivo
  'bie-serie': (archivos, op) => unirSeries(archivos.map((a, k) =>
    leerBieSerie(a, op.nombresPorArchivo ? { ...op, nombresSerie: [op.nombresPorArchivo[k]] } : op))),
  'inegi-exporta': (archivos, op) => leerInegiExporta(archivos, op),
  'scn': (archivos, op) => unirSeries(archivos.map(a => leerScn(a, op))),
  'censo-tab': (archivos, op) => unirSeries(archivos.map(a => leerCensoTab(a, op))),
};

/** Une la salida de varios archivos del mismo indicador (p. ej. dos series del BIE). */
function unirSeries(partes) {
  if (partes.length === 1) return partes[0];
  const periodos = ordenarPeriodos(new Set(partes.flatMap(p => p.periodos)));
  const series = partes.flatMap(p => p.series.map(s => ({
    ...s, valores: periodos.map(per => { const k = p.periodos.indexOf(per); return k < 0 ? null : s.valores[k]; }),
  })));
  return { ...partes[0], notas: [...new Set(partes.flatMap(p => p.notas))], fuentes: [...new Set(partes.flatMap(p => p.fuentes))],
    notasGrafico: partes.find(p => p.notasGrafico.length)?.notasGrafico ?? [], periodos, series };
}

/** Quita los periodos sin ningún dato al inicio y al final (columnas reservadas para años por publicar). */
function recortar(r) {
  const conDato = k => r.series.some(s => s.valores[k] != null);
  let a = 0, b = r.periodos.length - 1;
  while (a <= b && !conDato(a)) a++;
  while (b >= a && !conDato(b)) b--;
  return { ...r, periodos: r.periodos.slice(a, b + 1), series: r.series.map(s => ({ ...s, valores: s.valores.slice(a, b + 1) })) };
}

/**
 * Fuente corta para tablas y tarjetas, a partir de las fuentes que trae el archivo
 * (los tabulados censales listan un censo por año, de 1990 a 2020).
 */
function resumirFuente(fuentes, porDefecto) {
  const t = fuentes.join(' ');
  if (/Encuesta Nacional de Ocupación y Empleo/.test(t)) return 'INEGI · ENOE';
  if (/Indicador Trimestral de la Actividad Económica Estatal/.test(t)) return 'INEGI · Cuentas Nacionales (ITAEE)';
  if (/Indicador Mensual de la Actividad Industrial/.test(t)) return 'INEGI · Cuentas Nacionales (IMAIEF)';
  if (/Producto Interno Bruto por Entidad/.test(t)) return 'INEGI · Cuentas Nacionales (PIBE)';
  if (/Defunciones Registradas/.test(t)) return 'INEGI · Estadísticas de Defunciones Registradas';
  if (/Nacimientos Registrados/.test(t)) return 'INEGI · Estadística de Nacimientos Registrados';
  const censales = fuentes.filter(f => /Censo|Conteo|Intercensal/.test(f));
  if (censales.length === 1 && /Censo de Población y Vivienda 2020/.test(censales[0])) return 'INEGI · Censo de Población y Vivienda 2020';
  if (censales.length) return `INEGI · Censos y Conteos de Población y Vivienda${/Intercensal/.test(t) ? ' · Encuesta Intercensal' : ''}`;
  return porDefecto ?? fuentes[0] ?? null;
}

function ultimo(periodos, serie) {
  for (let k = periodos.length - 1; k >= 0; k--) if (serie.valores[k] != null) return { periodo: periodos[k], valor: serie.valores[k], serie: serie.nombre };
  return null;
}

const escribir = (destino, datos) => {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, JSON.stringify(datos) + '\n', 'utf8');
  return fs.statSync(destino).size;
};

// ── Indicadores ─────────────────────────────────────────────────────
for (const m of ['sociodemografico', 'economia', 'proveedores']) fs.rmSync(path.join(SALIDA, m), { recursive: true, force: true });

const indice = [];
const resultados = [];
const usados = new Set();
for (const ind of manifiesto.indicadores) {
  const archivos = [].concat(ind.archivos ?? []).map(a => path.join(INFO, a));
  archivos.forEach(a => { if (!fs.existsSync(a)) throw new Error(`${ind.id}: no existe ${rel(raiz, a)}`); usados.add(path.resolve(a)); });

  const r = ind.estado === 'pendiente'
    ? { periodos: [], series: [], notas: [], fuentes: [], notasGrafico: [] }
    : recortar(LECTORES[ind.lector](archivos, { periodicidad: ind.periodicidad, ...ind.opciones }));
  if (ind.estado !== 'pendiente' && (!r.periodos.length || !r.series.length)) throw new Error(`${ind.id}: el lector no devolvió datos`);

  const datos = {
    id: ind.id,
    modulo: ind.modulo,
    bloque: ind.bloque,
    titulo: ind.titulo,
    ...(ind.estado === 'pendiente' ? { pendiente: true } : {}),
    ...(ind.sustituye ? { sustituye: ind.sustituye } : {}),
    ...(ind.nota ? { nota: ind.nota } : {}),
    unidad: ind.unidad ?? r.unidad ?? null,
    periodicidad: ind.periodicidad,
    fuente: ind.fuente ?? r.fuentes[0] ?? null,
    fuenteCorta: resumirFuente(r.fuentes, ind.fuente),
    fuentes: r.fuentes,
    tituloFuente: r.tituloFuente ?? null,
    fechaConsulta: r.fechaConsulta ?? null,
    actualizado: r.actualizado ?? null,
    definicion: r.definicion ?? null,
    notas: r.notas,
    ...(r.filtros && Object.keys(r.filtros).length ? { filtros: r.filtros } : {}),
    grafico: { tipo: manifiesto.graficos?.[ind.id] ?? null, indicaciones: r.notasGrafico },
    archivos: archivos.map(a => rel(INFO, a)),
    ultimo: r.series.length ? ultimo(r.periodos, r.series[0]) : null,
    dimensionesSerie: r.dimensionesSerie ?? null,
    periodos: r.periodos,
    series: r.series,
  };
  const ruta = path.join(SALIDA, ind.modulo, `${ind.id}.json`);
  const bytes = escribir(ruta, datos);
  indice.push({
    id: ind.id, modulo: ind.modulo, bloque: ind.bloque, titulo: ind.titulo,
    ...(datos.pendiente ? { pendiente: true } : {}), ...(ind.sustituye ? { sustituye: ind.sustituye } : {}),
    unidad: datos.unidad, periodicidad: ind.periodicidad, fuente: datos.fuente, fuenteCorta: datos.fuenteCorta,
    ultimo: datos.ultimo, grafico: datos.grafico.tipo, archivo: `data/${ind.modulo}/${ind.id}.json`,
  });
  resultados.push({ ind, datos, bytes });
  console.log(`✓ ${ind.modulo}/${ind.id}.json  ${datos.series.length} series · ${datos.periodos.length} periodos · ${(bytes / 1024).toFixed(1)} KB${datos.pendiente ? '  (pendiente)' : ''}`);
}
escribir(path.join(SALIDA, 'indice.json'), { generado: new Date().toISOString().slice(0, 10), indicadores: indice });

// ── DENUE ───────────────────────────────────────────────────────────
const cfg = manifiesto.denue;
const archivoDenue = path.join(INFO, cfg.archivo);
usados.add(path.resolve(archivoDenue));
const metaTxt = fs.readFileSync(path.join(INFO, cfg.metadatos), 'utf8').replace(/^﻿/, '');
const metadatos = {
  titulo: 'INEGI. ' + (metaTxt.match(/^Title:\s*(.+)$/m)?.[1].trim() ?? 'DENUE'),
  modificado: metaTxt.match(/^Modified:\s*(.+)$/m)?.[1].trim() ?? null,
};
const vab = resultados.find(x => x.ind.id === cfg.sectoresDesde).datos;
const sectores = vab.series
  .map(s => s.dimensiones)
  .filter(d => /^\d{2}(-\d{2})?$/.test(d.codigo ?? ''))
  .map(d => ({ codigo: d.codigo, nombre: d.concepto }));
const denue = leerDenue(archivoDenue, { sectores, metadatos });
const bytesDenue = {
  resumen: escribir(path.join(SALIDA, 'proveedores', 'resumen.json'), denue.resumen),
  actividades: escribir(path.join(SALIDA, 'proveedores', 'actividades.json'), denue.actividades),
  puntos: {},
};
for (const [cve, lista] of denue.puntos) {
  const nombre = denue.resumen.porMunicipio.find(mu => mu.cve === cve).nombre;
  bytesDenue.puntos[cve] = escribir(path.join(SALIDA, 'proveedores', 'puntos', `${cve}.json`), {
    cve, municipio: nombre, campos: ['nombre', 'scian', 'estrato', 'lat', 'lng'], estratos: denue.resumen.estratos, datos: lista,
  });
}
const totalPuntos = [...denue.puntos.values()].reduce((a, l) => a + l.length, 0);
console.log(`✓ proveedores/resumen.json · actividades.json · ${denue.puntos.size} archivos de puntos (${totalPuntos} negocios)`);

// ── Reporte ─────────────────────────────────────────────────────────
const fmt = v => v == null ? '—' : typeof v === 'number' ? v.toLocaleString('es-MX', { maximumFractionDigits: 2 }) : String(v);
const valorEn = (id, periodo, filtro = () => true) => {
  const d = resultados.find(x => x.ind.id === id)?.datos;
  const s = d?.series.find(filtro);
  const k = d?.periodos.indexOf(periodo);
  return s && k >= 0 ? s.valores[k] : null;
};
const hoteles = [...denue.puntos.values()].flat().filter(p => p[1].startsWith('7211')).length;

// Valores escritos a mano en el maquetado (src/*/index.html) frente a los datos de Info/
const COMPARAR = [
  ['Sociodemográfico', 'Población total', '2,402,598 (Encuesta Intercensal 2020)', `${fmt(valorEn('poblacion-total', '2020', s => s.dimensiones?.Sexo === 'Total'))} (2020)`, 'poblacion-total'],
  ['Sociodemográfico', 'Edad mediana', '28.3 años', `${fmt(valorEn('edad-mediana', '2020'))} años (2020)`, 'edad-mediana'],
  ['Sociodemográfico', 'Densidad de población', '38.7 hab/km²', `${fmt(valorEn('densidad-poblacion', '2020'))} hab/km² (2020)`, 'densidad-poblacion'],
  ['Sociodemográfico', 'Número de hogares', '710,245 (ENIGH 2022)', `${fmt(valorEn('numero-hogares', '2020'))} (Censo 2020)`, 'numero-hogares'],
  ['Económico', 'PIBE Tabasco', '$249.7 mmdp (2022)', `${fmt(valorEn('pibe-total', '2022', s => s.dimensiones?.medida === 'Millones de pesos a precios de 2018'))} mdp a precios de 2018 · ${fmt(valorEn('pibe-total', '2022', s => s.dimensiones?.medida === 'Millones de pesos'))} mdp corrientes (2022)`, 'pibe-total'],
  ['Económico', 'ITAEE var. anual', '+2.4 (Q4 2023)', `${fmt(valorEn('itaee-total', '2023-T4', s => s.dimensiones?.medida === 'Variación porcentual anual'))} % (2023-T4)`, 'itaee-total'],
  ['Económico', 'Tasa de desocupación', '3.2 %', 'Sin archivo en Info/', null],
  ['Económico', 'Informalidad laboral', '56.4 %', `${fmt(resultados.find(x => x.ind.id === 'tasa-informalidad').datos.ultimo?.valor)} personas (último periodo; no es una tasa)`, 'tasa-informalidad'],
  ['Turismo (solo informativo)', 'Hoteles', '189', `${fmt(hoteles)} establecimientos en la clase SCIAN 7211 (hoteles, moteles y similares) del DENUE`, null],
];

// Archivos de Info/ que ningún indicador usa (sin contar .docx, diccionarios ni metadatos)
const todos = [];
const recorrer = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => e.isDirectory() ? recorrer(path.join(d, e.name)) : todos.push(path.join(d, e.name)));
recorrer(INFO);
const sinUsar = todos.filter(a => /\.(xlsx?|csv)$/i.test(a) && !usados.has(path.resolve(a)) && !/diccionario/i.test(a));

const lineas = [];
const L = s => lineas.push(s);
L('# Reporte de datos — OVIE Tabasco');
L('');
L(`Generado por \`npm run datos\` el ${new Date().toISOString().slice(0, 10)}. Este archivo no se publica: sirve para validar el contenido con el área responsable.`);
L('');
L('## Indicadores');
L('');
L('| Módulo | Indicador | Periodos | Series | Último valor (serie principal) | Archivo(s) en Info/ |');
L('|---|---|---|---|---|---|');
for (const { ind, datos } of resultados) {
  const per = datos.periodos.length ? `${datos.periodos[0]} – ${datos.periodos.at(-1)} (${datos.periodos.length})` : '—';
  const ult = datos.pendiente ? '**Pendiente de fuente**' : datos.ultimo ? `${fmt(datos.ultimo.valor)} ${datos.unidad ?? ''} · ${datos.ultimo.periodo}` : '—';
  L(`| ${ind.modulo} | ${ind.titulo}${ind.sustituye ? ` (sustituye a “${ind.sustituye}”)` : ''} | ${per} | ${datos.series.length} | ${ult} | ${datos.archivos.map(a => '`' + a.split('/').pop() + '`').join('<br>') || '—'} |`);
}
L('');
L('## Puntos a revisar');
L('');
for (const { ind, datos } of resultados) {
  const obs = [];
  if (ind.nota) obs.push(ind.nota);
  const nulos = datos.series.reduce((a, s) => a + s.valores.filter(v => v == null).length, 0);
  const total = datos.series.reduce((a, s) => a + s.valores.length, 0);
  if (!datos.pendiente && nulos) obs.push(`${nulos} de ${total} valores vacíos (ND/NA o periodos sin dato).`);
  const unidadEnSerie = datos.series.every(s => s.dimensiones?.medida); // Cuentas Nacionales: la medida es la unidad
  if (!datos.pendiente && !datos.unidad && !unidadEnSerie) obs.push('El archivo no indica la unidad de medida.');
  const nombres = datos.series.map(s => s.nombre);
  if (nombres.some(n => /\(\d+\)$/.test(n))) obs.push(`Columnas con el mismo nombre en el archivo: ${nombres.filter(n => /\(\d+\)$/.test(n)).join(', ')}.`);
  if (obs.length) L(`- **${ind.titulo}** (\`${ind.id}\`): ${obs.join(' ')}`);
}
L('- **Defunciones por causa**: la nota del Excel recomienda una comparación entre municipios, pero el archivo solo trae el total estatal.');
L('- **Población ocupada**: la serie del BIE (6200093950) da valores distintos al total de la consulta de Posición en la ocupación (ENOE). Confirmar cuál usar.');
L('');
L('## Valores del maquetado frente a los datos de Info/');
L('');
L('Valores escritos a mano en las páginas actuales. No se ha cambiado nada en el sitio; esto es para decidir qué mostrar en la Fase 6.');
L('');
L('| Módulo | Dato | En el maquetado | En Info/ |');
L('|---|---|---|---|');
for (const [mod, dato, maq, info] of COMPARAR) L(`| ${mod} | ${dato} | ${maq} | ${info} |`);
L('');
L('## Proveedores (DENUE)');
L('');
L(`- Fuente: ${denue.resumen.fuente} · actualizado ${denue.resumen.actualizado ?? '—'}`);
L(`- Negocios: ${fmt(denue.resumen.total)} · con coordenadas: ${fmt(totalPuntos)} · sin coordenadas: ${fmt(denue.sinCoordenadas)}`);
L(`- Suma por municipio: ${fmt(denue.resumen.porMunicipio.reduce((a, m) => a + m.total, 0))} · por sector: ${fmt(denue.resumen.porSector.reduce((a, s) => a + s.total, 0))} · por tamaño: ${fmt(denue.resumen.porEstrato.reduce((a, s) => a + s.total, 0))}`);
L(`- Sectores sin nombre (no aparecen en el PIBE): ${denue.resumen.porSector.filter(s => !s.nombre).map(s => s.codigo).join(', ') || 'ninguno'}`);
L(`- Archivos de puntos por municipio: ${Object.entries(bytesDenue.puntos).map(([c, b]) => `${c}: ${(b / 1024).toFixed(0)} KB`).join(' · ')}`);
L('');
L('## Recomendaciones de gráfico escritas en los Excel');
L('');
L('Se copian tal cual en cada JSON (`grafico.indicaciones`). El tipo de gráfico para la Fase 6 se define en el manifiesto (`grafico.tipo`).');
L('');
for (const { ind, datos } of resultados) {
  if (!datos.grafico.indicaciones.length) { L(`- **${ind.titulo}**: sin indicaciones en el archivo.`); continue; }
  L(`- **${ind.titulo}**: ${datos.grafico.indicaciones.find(t => /^Gráfico recomendado/i.test(t)) ?? datos.grafico.indicaciones[0]}`);
}
L('');
L('## Archivos de Info/ que no usa ningún indicador');
L('');
L(sinUsar.length ? sinUsar.map(a => `- \`${rel(INFO, a)}\``).join('\n') : '- Ninguno.');
fs.writeFileSync(REPORTE, lineas.join('\n') + '\n', 'utf8');
console.log(`\nReporte: ${rel(raiz, REPORTE)}`);
