// Consultas exportadas de INEGI (INEGI_exporta_….xls; en realidad son .xlsx).
//
//   título · filtros "Dimensión : Valor" · "Consulta de: …"
//   fila de encabezado (la anterior a la primera fila con números)
//   filas de datos: periodo + valores (ENOE) o categoría + años (Defunciones, Tipos de hogar)
//   Solo se usa la hoja "hoja_dato"; "hoja_da" y "hoja_db" traen medidas de precisión.
//
// Un indicador puede venir repartido en varios archivos (uno por filtro, p. ej. por nivel de ingresos):
// cada archivo aporta sus series y el filtro que cambia entre archivos queda como dimensión.
import { leerHoja, texto, valor, periodo, notasGrafico, aSeries, ErrorEstructura } from './comun.mjs';

// Algunas consultas guardan las cifras como texto ("323893")
const esCifra = v => typeof valor(v) === 'number';

function leerUno(archivo, periodicidad, periodoFijo) {
  const { filas } = leerHoja(archivo, ['hoja_dato', 'hoja']);
  const consulta = filas.findIndex(f => /^Consulta de:/i.test(texto(f?.[0])));
  if (consulta < 0) throw new ErrorEstructura(archivo, 'no encontré "Consulta de:"');

  const filtros = {};
  for (const f of filas.slice(1, consulta)) {
    const m = texto(f?.[0]).match(/^(.+?)\s*:\s*(.+)$/);
    if (m) filtros[m[1]] = m[2];
  }

  // Primera fila de datos: con etiqueta en la columna A y números después
  // (el encabezado de Defunciones también trae números —los años— pero su columna A está vacía)
  const primeraDatos = filas.findIndex((f, r) => r > consulta && texto(f[0]) !== '' && f.slice(1).some(esCifra));
  if (primeraDatos < 0) throw new ErrorEstructura(archivo, 'no hay filas con números');
  const enc = filas[primeraDatos - 1];
  let nEtiquetas = 0;
  while (nEtiquetas < enc.length && !texto(enc[nEtiquetas])) nEtiquetas++;
  const columnas = [];
  for (let c = nEtiquetas; c < enc.length; c++) {
    const t = texto(enc[c]);
    if (!t || t.startsWith('Gráfico recomendado')) break;
    columnas.push({ c, etiqueta: t });
  }

  const datos = [];
  let fuente = null;
  for (let r = primeraDatos; r < filas.length; r++) {
    const f = filas[r];
    const t = texto(f?.[0]);
    if (/^fuente/i.test(t)) { fuente = t.replace(/^fuente:\s*/i, ''); break; }
    if (!columnas.some(col => esCifra(f[col.c]))) break; // fin de la tabla (notas)
    datos.push(f);
  }

  // Orientación: ¿los periodos están en las filas, en las columnas, o es un solo periodo (censal)?
  const periodosEnFilas = !periodoFijo && /trimestre|^\d{4}$/i.test(texto(datos[0][0]));
  const celdas = [];
  for (const f of datos) {
    const etiquetaFila = f.slice(0, nEtiquetas).map(texto).filter(Boolean).join(' ');
    for (const col of columnas) {
      const v = valor(f[col.c]);
      if (v === undefined) throw new ErrorEstructura(archivo, `valor no numérico "${f[col.c]}"`);
      celdas.push(periodoFijo ? { serie: col.etiqueta, periodo: periodoFijo, v }
        : periodosEnFilas ? { serie: col.etiqueta, periodo: periodo(etiquetaFila, periodicidad), v }
        : { serie: etiquetaFila, periodo: periodo(col.etiqueta, periodicidad), v });
    }
  }
  if (celdas.some(c => !c.periodo)) throw new ErrorEstructura(archivo, 'hay periodos que no pude interpretar');
  return { titulo: texto(filas[0]?.[0]), filtros, fuente, celdas, notasGrafico: notasGrafico(filas) };
}

export default function leerInegiExporta(archivos, { periodicidad, dimension, periodoFijo } = {}) {
  const lista = [].concat(archivos);
  const partes = lista.map(a => leerUno(a, periodicidad, periodoFijo));

  // El filtro que cambia entre archivos es lo que distingue sus series
  const claves = Object.keys(partes[0].filtros);
  const variables = claves.filter(k => new Set(partes.map(p => p.filtros[k])).size > 1);
  const fijos = Object.fromEntries(claves.filter(k => !variables.includes(k)).map(k => [k, partes[0].filtros[k]]));

  const mapa = new Map();
  const vistos = new Map();
  for (const p of partes) {
    const extra = Object.fromEntries(variables.map(k => [k, p.filtros[k]]));
    for (const { serie, periodo: per, v } of p.celdas) {
      const dims = { ...extra, ...(dimension ? { [dimension]: serie } : { serie }) };
      let clave = JSON.stringify(dims);
      // Etiquetas repetidas dentro del mismo archivo (p. ej. "No especificado" dos veces)
      const idCelda = clave + per;
      if (vistos.has(idCelda)) {
        const n = vistos.get(idCelda) + 1; vistos.set(idCelda, n);
        dims[dimension ?? 'serie'] = `${serie} (${n})`; clave = JSON.stringify(dims);
      } else vistos.set(idCelda, 1);
      if (!mapa.has(clave)) mapa.set(clave, { nombre: [...variables.map(k => p.filtros[k]), serie].join(' · '), dimensiones: dims, valores: {} });
      mapa.get(clave).valores[per] = v;
    }
  }

  return {
    tituloFuente: partes[0].titulo,
    fechaConsulta: null,
    unidad: null,
    definicion: null,
    filtros: fijos,
    notas: [],
    fuentes: [...new Set(partes.map(p => p.fuente).filter(Boolean))],
    notasGrafico: partes.find(p => p.notasGrafico.length)?.notasGrafico ?? [],
    ...aSeries(mapa, { dimensiones: [...variables, dimension ?? 'serie'] }),
  };
}
