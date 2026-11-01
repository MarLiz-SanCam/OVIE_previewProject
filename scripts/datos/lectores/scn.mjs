// Tabulados del Sistema de Cuentas Nacionales: PIBE, ITAEE e IMAIEF.
//
//   "Concepto" | 2003 | 2004 …            ← años (PIBE)
//              | T1 | T2 | … | 6 Meses   ← trimestres (ITAEE) o meses (IMAIEF), opcional
//   "     Millones de pesos a precios de 2018"   ← medida (sección)
//   "          Actividades primarias" | 9804.9 …  ← conceptos; la sangría indica el nivel
//   notas y "Fuente: …" al final; hoja "MetaInfo" con fecha de actualización
import { leerHoja, texto, valor, subperiodo, notasGrafico, esNotaGrafico, aSeries, ErrorEstructura } from './comun.mjs';

const MEDIDA = /^(Millones de pesos|Variación porcentual|Estructura porcentual|Contribución a la variación|Índice de)/i;
const limpiar = t => String(t ?? '').replace(/^_+a/, '');

export default function leerScn(archivo, { medidas, conceptos, nivelMaximo } = {}) {
  const { filas, libro } = leerHoja(archivo, 'Tabulado');
  const enc = filas.findIndex(f => texto(f?.[0]) === 'Concepto');
  if (enc < 0) throw new ErrorEstructura(archivo, 'no encontré la fila "Concepto"');

  // Encabezado: años (rellenando celdas combinadas) y, si hay, trimestres o meses
  const anios = filas[enc];
  const subs = texto(filas[enc + 1]?.[0]) === '' && filas[enc + 1]?.slice(1).some(v => /^(T[1-4]|Enero)$/i.test(texto(v))) ? filas[enc + 1] : null;
  const columnas = [];
  let anio = null;
  for (let c = 1; c < Math.max(anios.length, subs?.length ?? 0); c++) {
    const a = texto(anios[c]).match(/^(\d{4})\s*([RP])?/);
    if (a) anio = a[1];
    else if (!subs) continue; // sin subperiodos solo cuentan las columnas con año
    if (!anio) continue;
    const per = subs ? subperiodo(anio, subs[c]) : anio;
    if (per) columnas.push({ c, periodo: per });
  }
  if (!columnas.length) throw new ErrorEstructura(archivo, 'no pude leer los periodos del encabezado');

  const mapa = new Map();
  const medidasEncontradas = [];
  let medida = null;
  let r = enc + (subs ? 2 : 1);
  for (; r < filas.length; r++) {
    const f = filas[r];
    if (f[1] === null || f[1] === undefined) break; // empiezan las notas
    const original = limpiar(f[0]);
    const etiqueta = texto(original);
    if (MEDIDA.test(etiqueta)) { medida = etiqueta; medidasEncontradas.push(medida); continue; }
    if (!medida) throw new ErrorEstructura(archivo, `concepto "${etiqueta}" antes de cualquier medida`);
    const vals = columnas.map(col => valor(f[col.c]));
    if (vals.every(v => v == null)) continue; // encabezado de grupo sin valores o fila toda "NA"
    if (medidas && !medidas.includes(medida)) continue;

    const nivel = Math.round((original.length - original.trimStart().length) / 5);
    if (nivelMaximo && nivel > nivelMaximo) continue;
    const m = etiqueta.match(/^([\d,\-]+|[A-Z][\w.]*(?:-[A-Z][\w.]*)*)\s+-\s+(.+)$/);
    const concepto = m ? m[2] : etiqueta;
    if (conceptos && !conceptos.includes(concepto)) continue;

    const dims = { medida, concepto, ...(m ? { codigo: m[1] } : {}), nivel };
    const clave = JSON.stringify([medida, etiqueta]);
    mapa.set(clave, {
      nombre: etiqueta,
      dimensiones: dims,
      valores: Object.fromEntries(columnas.map((col, k) => [col.periodo, vals[k] ?? null])),
    });
  }
  if (medidas) {
    const faltan = medidas.filter(md => !medidasEncontradas.includes(md));
    if (faltan.length) throw new ErrorEstructura(archivo, `no encontré las medidas: ${faltan.join(' | ')}`);
  }
  if (!mapa.size) throw new ErrorEstructura(archivo, 'ningún concepto coincide con el filtro del manifiesto');

  const notas = [], fuentes = [];
  for (; r < filas.length; r++) {
    const t = texto(filas[r]?.[0]);
    if (!t || esNotaGrafico(t)) continue;
    if (/^Fuente:/i.test(t)) fuentes.push(t.replace(/^Fuente:\s*/i, ''));
    else if (!/^(\d\.|Línea|Serie)/.test(t)) notas.push(t);
  }

  const meta = libro.Sheets.MetaInfo
    ? Object.fromEntries(leerHoja(archivo, 'MetaInfo').filas.map(f => [texto(f[0]), texto(f[1])]))
    : {};

  return {
    tituloFuente: texto(filas[enc - 1]?.[0]),
    fechaConsulta: null,
    actualizado: meta['FECHA DE ACTUALIZACIÓN'] || null,
    unidad: medidas?.length === 1 ? medidas[0] : null,
    definicion: null,
    notas,
    fuentes,
    notasGrafico: notasGrafico(filas),
    ...aSeries(mapa, { dimensiones: ['medida', 'concepto'] }),
  };
}
