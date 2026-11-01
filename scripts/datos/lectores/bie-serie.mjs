// Series del Banco de Indicadores (Indicadores2026….xls, formato Excel 97).
//
//   "Fecha de consulta: …"
//   "Periodos" | "1002000007 (No especificada) Quinquenal" | …   ← una columna por serie
//   1995 | 5.1          (o "2005/01" en series trimestrales)
//   "Notas:" … "Fuente:" …
import { leerHoja, texto, valor, periodo, fechaConsulta, notasGrafico, esNotaGrafico, aSeries, ErrorEstructura } from './comun.mjs';

export default function leerBieSerie(archivo, { periodicidad, nombresSerie = [] } = {}) {
  const { filas } = leerHoja(archivo);
  const enc = filas.findIndex(f => texto(f?.[0]) === 'Periodos');
  if (enc < 0) throw new ErrorEstructura(archivo, 'no encontré la fila "Periodos"');

  const columnas = [];
  for (let c = 1; c < filas[enc].length; c++) {
    const t = texto(filas[enc][c]);
    const m = t.match(/^(\d{6,})\s*(.*)$/);
    if (!m) break;
    columnas.push({ c, clave: m[1], descripcion: m[2] });
  }
  if (!columnas.length) throw new ErrorEstructura(archivo, 'la fila "Periodos" no trae claves de serie');

  const mapa = new Map(columnas.map((col, k) => [col.clave, {
    nombre: nombresSerie[k] ?? `Serie ${col.clave}`,
    dimensiones: { claveSerie: col.clave, descripcionBIE: col.descripcion },
    valores: {},
  }]));

  let i = enc + 1;
  for (; i < filas.length; i++) {
    const p = periodo(filas[i]?.[0], periodicidad);
    if (!p || !/^\d{4}/.test(texto(filas[i][0]))) break;
    for (const col of columnas) {
      const v = valor(filas[i][col.c]);
      if (v === undefined) throw new ErrorEstructura(archivo, `valor no numérico "${filas[i][col.c]}" en ${texto(filas[i][0])}`);
      mapa.get(col.clave).valores[p] = v;
    }
  }

  const notas = [], fuentes = [];
  let destino = null;
  for (; i < filas.length; i++) {
    const t = texto(filas[i]?.[0]);
    if (/^Notas?:?$/i.test(t)) { destino = notas; continue; }
    if (/^Fuentes?:?$/i.test(t)) { destino = fuentes; continue; }
    if (/^Cifras Preliminares:?$/i.test(t)) { destino = notas; continue; }
    if (destino && t && typeof filas[i][0] === 'string' && !esNotaGrafico(t)) destino.push(t);
  }

  return {
    tituloFuente: null,
    fechaConsulta: fechaConsulta(filas),
    unidad: null,
    definicion: null,
    notas,
    fuentes,
    notasGrafico: notasGrafico(filas),
    ...aSeries(mapa),
  };
}
