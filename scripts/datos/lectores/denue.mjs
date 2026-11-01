// DENUE (denue_inegi_27_.csv): un negocio por fila, en ISO-8859-1.
//
// Genera:
//   resumen       conteos por municipio, sector SCIAN, tamaño y sector × tamaño
//   actividades   código SCIAN (6 dígitos) → nombre de la actividad
//   puntos        por municipio: [nombre, código SCIAN, índice de tamaño, lat, lng]
import fs from 'node:fs';
import { ErrorEstructura } from './comun.mjs';

const CAMPOS = ['id', 'nom_estab', 'raz_social', 'codigo_act', 'nombre_act', 'per_ocu', 'cve_mun', 'municipio', 'latitud', 'longitud'];

function filasCsv(contenido) {
  // CSV con comillas dobles; INEGI no usa saltos de línea dentro de los campos
  return contenido.split(/\r?\n/).filter(Boolean).map(linea => {
    const campos = []; let campo = ''; let comillas = false;
    for (let i = 0; i < linea.length; i++) {
      const ch = linea[i];
      if (comillas) {
        if (ch === '"') { if (linea[i + 1] === '"') { campo += '"'; i++; } else comillas = false; }
        else campo += ch;
      } else if (ch === '"') comillas = true;
      else if (ch === ',') { campos.push(campo); campo = ''; }
      else campo += ch;
    }
    campos.push(campo);
    return campos;
  });
}

/**
 * @param archivo        ruta del CSV
 * @param sectores       [{codigo: "31-33", nombre}] para nombrar los sectores (se toman del PIBE)
 */
export default function leerDenue(archivo, { sectores, metadatos } = {}) {
  const contenido = new TextDecoder('latin1').decode(fs.readFileSync(archivo));
  const [encabezado, ...filas] = filasCsv(contenido);
  const ix = Object.fromEntries(CAMPOS.map(c => [c, encabezado.indexOf(c)]));
  const faltan = CAMPOS.filter(c => ix[c] < 0);
  if (faltan.length) throw new ErrorEstructura(archivo, `faltan columnas: ${faltan.join(', ')}`);
  const malas = filas.filter(f => f.length !== encabezado.length).length;
  if (malas) throw new ErrorEstructura(archivo, `${malas} filas no tienen ${encabezado.length} columnas`);

  // Sector SCIAN de 2 dígitos → grupo usado por INEGI ("31" → "31-33")
  const grupoDe = dos => sectores.find(s => s.codigo.split('-').some((x, k, a) =>
    a.length === 2 ? +dos >= +a[0] && +dos <= +a[1] : x === dos))?.codigo ?? dos;

  const estratos = [...new Set(filas.map(f => f[ix.per_ocu]))].sort((a, b) => parseInt(a) - parseInt(b));
  const municipios = new Map();
  const porSector = new Map(), porEstrato = new Map(), cruce = new Map();
  const actividades = {};
  const puntos = new Map();
  let sinCoordenadas = 0;

  for (const f of filas) {
    const cve = f[ix.cve_mun];
    const scian = f[ix.codigo_act];
    const sector = grupoDe(scian.slice(0, 2));
    const estrato = f[ix.per_ocu];
    const lat = parseFloat(f[ix.latitud]), lng = parseFloat(f[ix.longitud]);

    if (!municipios.has(cve)) municipios.set(cve, { cve, nombre: f[ix.municipio], total: 0 });
    municipios.get(cve).total++;
    porSector.set(sector, (porSector.get(sector) ?? 0) + 1);
    porEstrato.set(estrato, (porEstrato.get(estrato) ?? 0) + 1);
    const kc = `${sector}|${estrato}`;
    cruce.set(kc, (cruce.get(kc) ?? 0) + 1);
    actividades[scian] ??= f[ix.nombre_act];

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { sinCoordenadas++; continue; }
    if (!puntos.has(cve)) puntos.set(cve, []);
    puntos.get(cve).push([
      f[ix.nom_estab] || f[ix.raz_social] || f[ix.nombre_act],
      scian,
      estratos.indexOf(estrato),
      Math.round(lat * 1e5) / 1e5,
      Math.round(lng * 1e5) / 1e5,
    ]);
  }

  const nombreSector = cod => sectores.find(s => s.codigo === cod)?.nombre ?? null;
  const sectoresOrden = [...porSector.keys()].sort((a, b) => parseInt(a) - parseInt(b));
  const resumen = {
    fuente: metadatos?.titulo ?? 'INEGI. Directorio Estadístico Nacional de Unidades Económicas (DENUE)',
    actualizado: metadatos?.modificado ?? null,
    total: filas.length,
    estratos,
    porMunicipio: [...municipios.values()].sort((a, b) => a.cve.localeCompare(b.cve)),
    porSector: sectoresOrden.map(codigo => ({ codigo, nombre: nombreSector(codigo), total: porSector.get(codigo) })),
    porEstrato: estratos.map(estrato => ({ estrato, total: porEstrato.get(estrato) })),
    sectorPorEstrato: {
      sectores: sectoresOrden,
      estratos,
      valores: sectoresOrden.map(s => estratos.map(e => cruce.get(`${s}|${e}`) ?? 0)),
    },
  };

  return { resumen, actividades, puntos, sinCoordenadas };
}
