// Tabulados de Censos y Conteos (Población_0X.xlsx).
//
//   fila: título · "Fecha de consulta"
//   1–2 filas de encabezado que empiezan con "Entidad federativa" (años; a veces años × sexo)
//   filas "Tabasco …" con los datos
//   secciones "Unidad de medida:", "Definición:", "Notas:", "Fuentes:" en la columna A
import { leerHoja, texto, valor, fechaConsulta, notasGrafico, esNotaGrafico, aSeries, ErrorEstructura } from './comun.mjs';

const SECCION = /^(Unidad de medida|Definición|Notas?|Fuentes?)\s*:?$/i;

export default function leerTabuladoCensal(archivo, { filtros = {} } = {}) {
  const { filas } = leerHoja(archivo);
  const ini = filas.findIndex(f => texto(f?.[0]) === 'Entidad federativa');
  if (ini < 0) throw new ErrorEstructura(archivo, 'no encontré el encabezado "Entidad federativa"');
  let finEnc = ini;
  while (texto(filas[finEnc + 1]?.[0]) === 'Entidad federativa') finEnc++;
  const encabezados = filas.slice(ini, finEnc + 1);

  // Filas de datos: hasta la primera sección de metadatos
  const datos = [];
  let i = finEnc + 1;
  for (; i < filas.length && !SECCION.test(texto(filas[i]?.[0])); i++) datos.push(filas[i]);
  if (!datos.length) throw new ErrorEstructura(archivo, 'no hay filas de datos después del encabezado');

  // Columnas de etiqueta: las primeras que en la fila de datos son texto
  let nEtiquetas = 0;
  while (typeof datos[0][nEtiquetas] === 'string') nEtiquetas++;
  const nombresEtiqueta = encabezados[0].slice(0, nEtiquetas).map(texto);

  // Columnas de valores: contiguas mientras el encabezado tenga texto
  const columnas = [];
  for (let c = nEtiquetas; c < encabezados[0].length; c++) {
    const niveles = encabezados.map(f => texto(f[c]));
    if (!niveles[0]) break;
    columnas.push({ c, niveles });
  }
  const nivelAnio = encabezados.findIndex((_, n) => columnas.every(col => /^\d{4}/.test(col.niveles[n])));
  if (nivelAnio < 0) throw new ErrorEstructura(archivo, 'ningún nivel del encabezado tiene años');

  const mapa = new Map();
  for (const fila of datos) {
    const etiquetas = Object.fromEntries(nombresEtiqueta.map((n, k) => [n, texto(fila[k])]));
    delete etiquetas['Entidad federativa']; // siempre Tabasco
    if (Object.entries(filtros).some(([k, v]) => k in etiquetas && etiquetas[k] !== v)) continue;
    for (const { c, niveles } of columnas) {
      const extra = niveles.filter((_, n) => n !== nivelAnio);
      const dims = { ...etiquetas, ...(extra.length ? { Sexo: extra.join(' · ') } : {}) };
      if (Object.entries(filtros).some(([k, v]) => k in dims && dims[k] !== v)) continue;
      const clave = JSON.stringify(dims);
      if (!mapa.has(clave)) mapa.set(clave, { nombre: Object.values(dims).join(' · ') || 'Tabasco', dimensiones: dims, valores: {} });
      const v = valor(fila[c]);
      if (v === undefined) throw new ErrorEstructura(archivo, `valor no numérico "${fila[c]}" en la fila "${texto(fila[0])}"`);
      mapa.get(clave).valores[niveles[nivelAnio].slice(0, 4)] = v;
    }
  }

  // Metadatos de la columna A
  const secciones = {};
  let actual = null;
  for (; i < filas.length; i++) {
    const t = texto(filas[i]?.[0]);
    const m = t.match(SECCION);
    if (m) { actual = m[1].toLowerCase().replace(/s$/, ''); secciones[actual] = []; continue; }
    if (actual && t && typeof filas[i][0] === 'string' && !esNotaGrafico(t)) secciones[actual].push(t);
  }

  return {
    tituloFuente: texto(filas[1]?.[0]),
    fechaConsulta: fechaConsulta(filas),
    unidad: secciones['unidad de medida']?.join(' ').replace(/\.$/, '') || null,
    definicion: secciones['definición']?.join(' ') || null,
    notas: secciones.nota ?? [],
    fuentes: secciones.fuente ?? [],
    notasGrafico: notasGrafico(filas),
    ...aSeries(mapa, { dimensiones: Object.keys([...mapa.values()][0]?.dimensiones ?? {}) }),
  };
}
