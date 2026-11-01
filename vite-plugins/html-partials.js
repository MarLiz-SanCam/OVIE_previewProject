// Plugin de Vite para armar las páginas a partir de parciales.
//
//   <!-- @include header -->                              → src/partials/header.html
//   <!-- @include head {"titulo":"Turismo · OVIE"} -->    → con {{titulo}} sustituido
//   <!-- @include nav {"activo":"turismo"} -->            → navegación generada desde modulos.json
//   <!-- @include tarjetas-modulos -->                    → tarjetas de Inicio generadas desde modulos.json
//
// En todos los parciales, {{base}} es la ruta relativa a la raíz del sitio desde la página
// actual ("./" en Inicio, "../" en las páginas de módulo), para que los enlaces funcionen
// en https://<usuario>.github.io/<repo>/ sin depender del nombre del repositorio.
import fs from 'node:fs';
import path from 'node:path';

const INCLUDE = /<!--\s*@include\s+([\w-]+)\s*(\{[^]*?\})?\s*-->/g;

const esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function leerModulos(root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'modulos.json'), 'utf8'));
}

// Entradas del build: Inicio + módulos activos. Los inactivos no se publican.
export function entradas(root) {
  const input = { inicio: path.join(root, 'index.html') };
  for (const m of leerModulos(root).filter(m => m.activo)) {
    input[m.id] = path.join(root, m.id, 'index.html');
  }
  return input;
}

const generados = {
  nav(params, ctx) {
    const links = leerModulos(ctx.root).filter(m => m.activo).map(m => {
      const activo = m.id === params.activo;
      return `      <a class="nav-tab${activo ? ' active' : ''}" href="${ctx.base}${m.id}/"${activo ? ' aria-current="page"' : ''}>
        <i class="ti ${esc(m.icono)}"></i>${esc(m.titulo)}
      </a>`;
    });
    return `<nav class="flex flex-wrap gap-2 mb-7" id="main-nav">\n${links.join('\n')}\n    </nav>`;
  },

  'tarjetas-modulos'(params, ctx) {
    const tarjetas = leerModulos(ctx.root).filter(m => m.activo).map(m => `
      <a class="card p-5 flex gap-4 items-start hover:shadow-md transition-shadow" href="${ctx.base}${m.id}/">
        <div class="sec-icon" style="${esc(m.colorIcono)}">
          <i class="ti ${esc(m.icono)}"></i>
        </div>
        <div>
          <h2 class="text-base font-semibold text-gray-900">${esc(m.titulo)}</h2>
          <p class="text-sm text-gray-500 mt-1 leading-relaxed">${esc(m.descripcion)}</p>
          <span class="inline-flex items-center gap-1 text-xs font-medium text-brand-600 mt-3">
            Ver módulo <i class="ti ti-arrow-right"></i>
          </span>
        </div>
      </a>`);
    return `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${tarjetas.join('')}\n    </div>`;
  },
};

function procesar(html, ctx, nivel = 0) {
  if (nivel > 5) throw new Error('[html-partials] demasiados @include anidados');
  return html.replace(INCLUDE, (_, nombre, json) => {
    const params = json ? JSON.parse(json) : {};
    if (generados[nombre]) return generados[nombre](params, ctx);

    const archivo = path.join(ctx.root, 'partials', `${nombre}.html`);
    if (!fs.existsSync(archivo)) throw new Error(`[html-partials] no existe el parcial "${nombre}" (${archivo})`);
    const vars = { base: ctx.base, ...params };
    const contenido = fs.readFileSync(archivo, 'utf8')
      .replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? esc(vars[k]) : m));
    return procesar(contenido, ctx, nivel + 1);
  });
}

export default function htmlPartials() {
  let root;
  return {
    name: 'ovie-html-partials',
    configResolved(config) { root = config.root; },

    transformIndexHtml: {
      order: 'pre',
      handler(html, { filename }) {
        const profundidad = path.relative(root, path.dirname(filename)).split(path.sep).filter(Boolean).length;
        const base = profundidad ? '../'.repeat(profundidad) : './';
        return procesar(html, { root, base });
      },
    },

    // En desarrollo, recarga la página al editar un parcial o modulos.json
    configureServer(server) {
      const parciales = path.join(root, 'partials');
      const modulos = path.join(root, 'modulos.json');
      server.watcher.add([parciales, modulos]);
      server.watcher.on('change', archivo => {
        if (archivo.startsWith(parciales) || archivo === modulos) server.ws.send({ type: 'full-reload' });
      });
    },
  };
}
