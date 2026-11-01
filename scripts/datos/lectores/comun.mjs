// Utilidades compartidas por los lectores de archivos de INEGI.
import path from 'node:path';
import { createRequire } from 'node:module';

const XLSX = createRequire(import.meta.url)('xlsx');

export class ErrorEstructura extends Error {
  constructor(archivo, mensaje) {
    super(`${archivo}: ${mensaje}`);
    this.name = 'ErrorEstructura';
  }
}

/**
 * Lee una hoja como matriz de filas (sin filas vacías). Detecta el formato real por contenido.
 * `hoja` puede ser un nombre, una lista de candidatos (se usa el primero que exista) o nada (la primera).
 */
export function leerHoja(archivo, hoja) {
  const wb = XLSX.readFile(archivo, { cellDates: false });
  const nombre = Array.isArray(hoja)
    ? (hoja.find(h => wb.Sheets[h]) ?? wb.SheetNames[0])
    : (hoja ?? wb.SheetNames[0]);
  if (!wb.Sheets[nombre]) throw new ErrorEstructura(archivo, `no existe la hoja "${nombre}" (hay: ${wb.SheetNames.join(', ')})`);
  const filas = XLSX.utils.sheet_to_json(wb.Sheets[nombre], { header: 1, defval: null, blankrows: false, raw: true });
  return { filas, libro: wb };
}

export const texto = v => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());
export const esNumero = v => typeof v === 'number' && Number.isFinite(v);

/** Valor numérico o null para ND / NA / vacío. */
export function valor(v) {
  if (esNumero(v)) return v;
  const t = texto(v);
  if (t === '' || /^(ND|NA|N\/D|-)$/i.test(t)) return null;
  const n = Number(t.replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined; // undefined = no es un valor
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const TRIMESTRES = { primer: 1, segundo: 2, tercer: 3, cuarto: 4 };

/**
 * Normaliza etiquetas de periodo de INEGI:
 *   "Segundo trimestre del 2026" → "2026-T2"
 *   "2005/03" (trimestral) → "2005-T3"; (mensual) → "2005-03"
 *   "1998", 1998, "2023 R" → "1998" / "2023"
 */
export function periodo(etiqueta, periodicidad) {
  const t = texto(etiqueta).toLowerCase();
  let m = t.match(/^(primer|segundo|tercer|cuarto) trimestre del (\d{4})$/);
  if (m) return `${m[2]}-T${TRIMESTRES[m[1]]}`;
  m = t.match(/^(\d{4})\/(\d{2})$/);
  if (m) {
    if (periodicidad === 'trimestral') return `${m[1]}-T${+m[2]}`;
    if (periodicidad === 'mensual') return `${m[1]}-${m[2]}`;
    return `${m[1]}-${m[2]}`;
  }
  m = t.match(/^(\d{4})/);
  if (m) return m[1];
  return null;
}

export const subperiodo = (anio, sub) => {
  const t = texto(sub).toLowerCase();
  if (/^t[1-4]$/.test(t)) return `${anio}-${t.toUpperCase()}`;
  const mes = MESES.indexOf(t);
  if (mes >= 0) return `${anio}-${String(mes + 1).padStart(2, '0')}`;
  return null; // "6 Meses", "9 Meses", "Anual"…: acumulados que no se usan
};

export const ordenarPeriodos = ps => [...ps].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));

/** "Fecha de consulta: 24/08/2026 12:57:11" → "2026-08-24" */
export function fechaConsulta(filas) {
  for (const f of filas) {
    const m = texto(f?.[0]).match(/Fecha de (?:consulta|elaboración):\s*(\d{2})\/(\d{2})\/(\d{4})/i);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  }
  return null;
}

/**
 * Notas de gráfico escritas a mano en el Excel ("Gráfico recomendado: …", "Por qué: …").
 * A partir de la primera celda "Gráfico recomendado", recoge los textos de esa columna hacia abajo.
 */
export function notasGrafico(filas) {
  for (let r = 0; r < filas.length; r++) {
    const c = (filas[r] ?? []).findIndex(v => /^Gráfico recomendado/i.test(texto(v)));
    if (c < 0) continue;
    const notas = [];
    for (let i = r; i < filas.length; i++) {
      const t = texto(filas[i]?.[c]);
      if (t && typeof filas[i][c] === 'string') notas.push(t);
    }
    // Algunos archivos ponen un subtítulo justo arriba (p. ej. "Evolución del Total Estatal")
    const arriba = texto(filas[r - 1]?.[c]);
    if (arriba && typeof filas[r - 1][c] === 'string' && !/^(Fuente|Notas?)/i.test(arriba)) notas.unshift(arriba);
    return notas;
  }
  return [];
}

export const esNotaGrafico = t => /^(Gráfico recomendado|Por qué|Estructura en Excel|Eje [XY]|Etiquetas de datos|Ajuste|Configura|Serie \d|Capas|Línea \d|Categorías|Valores|Comparación entre|Evolución del)/i.test(t);

/** Construye la salida común a partir de un mapa serie → {periodo: valor}. */
export function aSeries(mapa, { dimensiones = [] } = {}) {
  const periodos = ordenarPeriodos(new Set([...mapa.values()].flatMap(s => Object.keys(s.valores))));
  const series = [...mapa.values()].map(s => ({
    nombre: s.nombre,
    ...(s.dimensiones && Object.keys(s.dimensiones).length ? { dimensiones: s.dimensiones } : {}),
    valores: periodos.map(p => (p in s.valores ? s.valores[p] : null)),
  }));
  return { periodos, series, ...(dimensiones.length ? { dimensionesSerie: dimensiones } : {}) };
}

export const rel = (raiz, archivo) => path.relative(raiz, archivo).split(path.sep).join('/');
