// Carga de los JSON generados por `npm run datos` (src/public/data/).

const cache = new Map();

/** Carga data/<ruta> una sola vez por página. */
export function cargar(ruta) {
  if (!cache.has(ruta)) {
    const raiz = document.querySelector('meta[name="ovie-raiz"]')?.content ?? './';
    const url = new URL(`${raiz}data/${ruta}`, location.href);
    cache.set(ruta, fetch(url).then(r => {
      if (!r.ok) throw new Error(`No se pudo cargar ${ruta} (${r.status})`);
      return r.json();
    }));
  }
  return cache.get(ruta);
}

export const cargarIndicador = (modulo, id) => cargar(`${modulo}/${id}.json`);

// ── Formato ──────────────────────────────────────────────────────────
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-T2" → "2T 2026" · "2025-12" → "dic 2025" · "2020" → "2020" */
export function periodoLegible(p) {
  let m = String(p).match(/^(\d{4})-T([1-4])$/);
  if (m) return `${m[2]}T ${m[1]}`;
  m = String(p).match(/^(\d{4})-(\d{2})$/);
  if (m) return `${MESES[+m[2] - 1]} ${m[1]}`;
  return String(p);
}

export function numero(v, decimales) {
  if (v == null || !Number.isFinite(v)) return '—';
  const d = decimales ?? (Math.abs(v) >= 1000 ? 0 : Math.abs(v) >= 100 ? 1 : 2);
  return v.toLocaleString('es-MX', { maximumFractionDigits: d, minimumFractionDigits: 0 });
}

export const signo = (v, dec = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + numero(Math.abs(v), dec);

const PERIODICIDAD = {
  anual: ['Anual', 'badge-anual'], bienal: ['Bienal', 'badge-bienal'], quinquenal: ['Quinquenal', 'badge-quin'],
  decenal: ['Decenal', 'badge-decenal'], trimestral: ['Trimestral', 'badge-trimest'], mensual: ['Mensual', 'badge-mensual'],
};
export const periodicidad = p => PERIODICIDAD[p] ?? [p, 'badge-anual'];

/** Fuente corta para tarjetas: la que menciona el año del dato, o la principal. */
export function fuenteCorta(datos, periodo) {
  const anio = String(periodo ?? '').slice(0, 4);
  const conAnio = datos.fuentes?.find(f => f.includes(anio));
  return (conAnio ?? datos.fuente ?? 'INEGI').replace(/^\/f\d+\s*/, '').replace(/\.$/, '');
}
