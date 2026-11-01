// Llena las tarjetas <div class="kpi-card" data-kpi="…"> con datos reales.
import { numero, signo, periodoLegible } from './datos.js';

const ICONO = { up: 'ti-arrow-up-right', down: 'ti-arrow-down-right', flat: 'ti-minus' };

export function ponerKpi(clave, { valor, unidad, tendencia, sub }) {
  const card = document.querySelector(`[data-kpi="${clave}"]`);
  if (!card) return;
  card.querySelector('.kpi-value').innerHTML = `${valor}${unidad ? ` <span style="font-size:1rem;font-weight:400">${unidad}</span>` : ''}`;
  const t = card.querySelector('.kpi-trend');
  if (tendencia) {
    t.className = `kpi-trend ${tendencia.dir}`;
    t.innerHTML = `<i class="ti ${ICONO[tendencia.dir]} text-xs"></i>${tendencia.texto}`;
  } else t.innerHTML = '&nbsp;';
  card.querySelector('.kpi-sub').textContent = sub ?? '';
}

export const pendienteKpi = (clave, texto, sub) => ponerKpi(clave, { valor: '—', tendencia: { dir: 'flat', texto }, sub });

/** Último valor de una serie y su cambio contra el periodo anterior con dato. */
export function ultimoYAnterior(datos, serie) {
  const idx = datos.periodos.map((_, k) => k).filter(k => serie.valores[k] != null);
  const [k1, k0] = [idx.at(-1), idx.at(-2)];
  return {
    periodo: datos.periodos[k1], valor: serie.valores[k1],
    periodoAnterior: datos.periodos[k0], anterior: serie.valores[k0],
  };
}

export const direccion = d => (d > 0 ? 'up' : d < 0 ? 'down' : 'flat');

/** Tendencia en % ("+4.6% vs 2015") o en diferencia absoluta ("+3 vs 2015"). */
export function tendencia(u, { porcentaje = true, decimales = 1, sufijo = '' } = {}) {
  if (u.anterior == null) return null;
  const d = porcentaje ? ((u.valor - u.anterior) / u.anterior) * 100 : u.valor - u.anterior;
  return { dir: direccion(d), texto: `${signo(d, decimales)}${porcentaje ? '%' : sufijo} vs ${periodoLegible(u.periodoAnterior)}` };
}

export { numero };
