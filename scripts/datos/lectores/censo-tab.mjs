// Tabulados del Censo 2020 con varias hojas (cpv2020_b_tab_04_migracion.xlsx).
//
//   título · "Fecha de elaboración" · descripción de la hoja
//   encabezado de 2–3 filas (celdas combinadas) que empieza con "Entidad federativa"
//   filas "27 Tabasco | <municipio> | <desglose> … | valores"
//   notas al pie numeradas
import { leerHoja, texto, valor, esNumero, fechaConsulta, notasGrafico, aSeries, ErrorEstructura } from './comun.mjs';

export default function leerCensoTab(archivo, { hoja, periodoFijo = '2020', filtros = {} } = {}) {
  const { filas } = leerHoja(archivo, hoja);
  const enc = filas.findIndex(f => texto(f?.[0]) === 'Entidad federativa');
  if (enc < 0) throw new ErrorEstructura(archivo, `hoja ${hoja}: no encontré "Entidad federativa"`);
  const ini = filas.findIndex((f, r) => r > enc && /^\d{2} /.test(texto(f?.[0])));
  const encabezados = filas.slice(enc, ini);

  let nEtiquetas = 0;
  while (typeof filas[ini][nEtiquetas] === 'string') nEtiquetas++;
  // Quita llamadas a nota pegadas al texto ("Población total1"), sin tocar años ("marzo de 2015")
  const nombresEtiqueta = encabezados[0].slice(0, nEtiquetas).map(t => texto(t).replace(/(\D)\d$/, '$1'));

  // Nombre de cada columna de valores: niveles del encabezado, rellenando celdas combinadas
  const ancho = Math.max(...filas.slice(ini, ini + 5).map(f => f.length));
  const relleno = encabezados.map(() => null);
  const columnas = [];
  for (let c = nEtiquetas; c < ancho; c++) {
    const niveles = encabezados.map((f, n) => {
      const t = texto(f[c]).replace(/(\D)\d$/, '$1'); // quita llamadas a nota ("migrante1")
      if (t) { relleno[n] = t; for (let k = n + 1; k < relleno.length; k++) relleno[k] = null; }
      return relleno[n];
    });
    if (!esNumero(filas[ini][c])) continue;
    columnas.push({ c, nombre: niveles.filter(Boolean).filter((t, k, a) => a.indexOf(t) === k).join(' › ') });
  }

  const mapa = new Map();
  let r = ini;
  for (; r < filas.length && /^\d{2} /.test(texto(filas[r]?.[0])); r++) {
    const f = filas[r];
    const etiquetas = Object.fromEntries(nombresEtiqueta.map((n, k) => [n, texto(f[k]).replace(/^\d{2,3} /, '')]));
    delete etiquetas['Entidad federativa'];
    if (Object.entries(filtros).some(([k, v]) => etiquetas[k] !== v)) continue;
    for (const col of columnas) {
      const dims = { ...etiquetas, columna: col.nombre };
      const clave = JSON.stringify(dims);
      const v = valor(f[col.c]);
      if (v === undefined) throw new ErrorEstructura(archivo, `hoja ${hoja}: valor no numérico "${f[col.c]}"`);
      mapa.set(clave, { nombre: Object.values(dims).join(' · '), dimensiones: dims, valores: { [periodoFijo]: v } });
    }
  }

  const notas = filas.slice(r).map(f => texto(f?.[0])).filter(t => /^\d+ /.test(t));
  return {
    tituloFuente: texto(filas[2]?.[0]),
    fechaConsulta: fechaConsulta(filas),
    unidad: 'Personas',
    definicion: null,
    notas,
    fuentes: [texto(filas[0]?.[0])].filter(Boolean),
    notasGrafico: notasGrafico(filas),
    ...aSeries(mapa, { dimensiones: [...nombresEtiqueta.filter(n => n !== 'Entidad federativa'), 'columna'] }),
  };
}
