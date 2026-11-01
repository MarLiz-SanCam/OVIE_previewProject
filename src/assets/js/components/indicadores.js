// Tarjetas de indicador generadas desde data/indice.json.
//
//   <section data-modulo="economia" data-bloque="2"><div class="indicadores-grid"></div></section>
//     → una tarjeta por indicador del bloque; la gráfica se carga al acercarse a la pantalla.
//   <tr data-indicador="pea"><td class="td-dato"></td></tr>
//     → periodo más reciente del indicador.
import { cargar, cargarIndicador, periodoLegible, periodicidad, fuenteCorta } from './datos.js';
import { dibujar } from './graficas.js';
import { vistaDe, POR_REVISAR } from '../config/vistas.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function aviso(texto, color) {
  return `<div class="chart-wrap flex items-center justify-center text-center px-6 rounded-lg ${color}" style="height:240px">
      <p class="text-sm"><i class="ti ti-info-circle mr-1"></i>${esc(texto)}</p>
    </div>`;
}

function tarjeta(ind) {
  const [per, clase] = periodicidad(ind.periodicidad);
  const art = document.createElement('article');
  art.className = 'chart-card indicador-card';
  art.id = `ind-${ind.id}`;
  art.dataset.indicador = ind.id;
  const cuerpo = ind.pendiente
    ? aviso('Pendiente de fuente: no hay archivo para este indicador.', 'bg-amber-50 text-amber-800')
    : POR_REVISAR[ind.id]
      ? aviso(POR_REVISAR[ind.id], 'bg-amber-50 text-amber-800')
      : `<div class="chart-wrap" style="height:240px"><canvas role="img" aria-label="${esc(ind.titulo)}"></canvas></div>`;
  art.innerHTML = `
    <div class="flex items-start justify-between gap-3 mb-3">
      <h3 class="chart-title" style="margin:0">${esc(ind.titulo)}${ind.sustituye ? ` <span class="font-normal normal-case tracking-normal">(sustituye a ${esc(ind.sustituye)})</span>` : ''}</h3>
      <span class="badge ${clase}">${per}</span>
    </div>
    ${cuerpo}
    <p class="ind-pie text-xs text-gray-400 mt-2">${ind.pendiente ? '' : 'Cargando…'}</p>`;
  return art;
}

async function llenar(art, ind) {
  const pie = art.querySelector('.ind-pie');
  try {
    const datos = await cargarIndicador(ind.modulo, ind.id);
    const hasta = datos.periodos.at(-1);
    const partes = [
      `Datos hasta <b class="text-gray-600">${periodoLegible(hasta)}</b>`,
      `Fuente: ${esc(fuenteCorta(datos, hasta))}`,
      datos.fechaConsulta ? `consultado ${datos.fechaConsulta.split('-').reverse().join('/')}` : null,
      datos.actualizado ? `actualizado ${datos.actualizado.split('-').reverse().join('/')}` : null,
    ].filter(Boolean);
    pie.innerHTML = partes.join(' · ') + (datos.nota ? `<br><span class="text-amber-700">${esc(datos.nota)}</span>` : '');
    const canvas = art.querySelector('canvas');
    if (canvas) dibujar(canvas, vistaDe(datos));
  } catch (e) {
    pie.innerHTML = `<span class="text-red-600">No se pudo mostrar este indicador (${esc(e.message)}).</span>`;
    console.error(ind.id, e);
  }
}

const observador = new IntersectionObserver(entradas => {
  for (const e of entradas) {
    if (!e.isIntersecting) continue;
    observador.unobserve(e.target);
    llenar(e.target, e.target._indicador);
  }
}, { rootMargin: '300px 0px' });

/** Crea las tarjetas de todas las secciones [data-modulo][data-bloque] y llena la tabla. */
export async function montarIndicadores() {
  const { indicadores } = await cargar('indice.json');

  document.querySelectorAll('section[data-modulo][data-bloque]').forEach(sec => {
    const grid = sec.querySelector('.indicadores-grid');
    indicadores
      .filter(i => i.modulo === sec.dataset.modulo && String(i.bloque) === sec.dataset.bloque)
      .forEach(ind => {
        const art = tarjeta(ind);
        grid.append(art);
        if (!ind.pendiente) {
          if (POR_REVISAR[ind.id]) art.querySelector('.ind-pie').textContent = '';
          else { art._indicador = ind; observador.observe(art); }
        }
      });
  });

  document.querySelectorAll('tr[data-indicador]').forEach(tr => {
    const ind = indicadores.find(i => i.id === tr.dataset.indicador);
    const celda = tr.querySelector('.td-dato');
    if (!ind || !celda) return;
    const fuente = tr.querySelector('.td-fuente');
    if (fuente) {
      const [per, clase] = periodicidad(ind.periodicidad);
      fuente.innerHTML = `<span class="badge ${clase}">${per}</span><br><span class="text-xs text-gray-400 block mt-0.5">${esc(ind.fuenteCorta ?? ind.fuente ?? '')}</span>`;
    }
    celda.innerHTML = ind.pendiente ? '<span class="text-amber-700">Pendiente de fuente</span>'
      : POR_REVISAR[ind.id] ? '<span class="text-amber-700">Por revisar</span>'
      : `<a class="text-brand-600 hover:underline" href="#ind-${ind.id}">${periodoLegible(ind.ultimo?.periodo)}</a>`;
  });
}
