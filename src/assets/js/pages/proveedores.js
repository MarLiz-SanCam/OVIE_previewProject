import 'leaflet/dist/leaflet.css';
import '../core/main.js';
import { initMapProveedores } from '../components/map.js';
import { cargar, numero } from '../components/datos.js';
import { dibujar } from '../components/graficas.js';

// El botón "Buscar" todavía no filtra: la búsqueda real llega con los datos del DENUE (Fase 7).
initMapProveedores();

// Gráficas según "Recomendaciones para gráficas del DENUE" (Info/Proveedores)
const TAMANOS = [['Micro (0–10)', 10], ['Pequeña (11–50)', 50], ['Mediana (51–250)', 250], ['Grande (251+)', Infinity]];
const tamanoDe = estrato => TAMANOS.findIndex(([, max]) => parseInt(estrato, 10) <= max);
const corto = t => (t.length > 30 ? t.slice(0, 28) + '…' : t);

async function panorama() {
  const r = await cargar('proveedores/resumen.json');
  document.getElementById('denue-fuente').textContent =
    `${numero(r.total)} negocios · ${r.fuente.replace(/^INEGI\.\s*/, 'INEGI · ')} · actualizado ${r.actualizado.split('-').reverse().join('/')}`;

  // 1. Por tamaño: barras horizontales con los 7 estratos
  dibujar(document.getElementById('chart-denue-estrato'), {
    tipo: 'barras-h', etiquetas: r.porEstrato.map(e => e.estrato),
    series: [{ nombre: 'Negocios', valores: r.porEstrato.map(e => e.total) }], unidad: 'Negocios',
  });

  // 2. Por sector: 10 principales + "Otros sectores"
  const sectores = [...r.porSector].sort((a, b) => b.total - a.total);
  const top = sectores.slice(0, 10);
  const otros = sectores.slice(10).reduce((a, s) => a + s.total, 0);
  dibujar(document.getElementById('chart-denue-sector'), {
    tipo: 'barras-h', etiquetas: [...top.map(s => corto(s.nombre)), 'Otros sectores'],
    series: [{ nombre: 'Negocios', valores: [...top.map(s => s.total), otros] }], unidad: 'Negocios',
  });

  // 3. Por municipio: columnas de mayor a menor
  const munis = [...r.porMunicipio].sort((a, b) => b.total - a.total);
  dibujar(document.getElementById('chart-denue-municipio'), {
    tipo: 'columnas', etiquetas: munis.map(m => m.nombre),
    series: [{ nombre: 'Negocios', valores: munis.map(m => m.total) }], unidad: 'Negocios',
  });

  // 4. Sector × tamaño: columnas apiladas al 100% (Micro, Pequeña, Mediana, Grande)
  const { sectores: codigos, estratos, valores } = r.sectorPorEstrato;
  dibujar(document.getElementById('chart-denue-cruce'), {
    tipo: 'columnas-apiladas-100',
    etiquetas: top.map(s => corto(s.nombre)),
    series: TAMANOS.map(([nombre], t) => ({
      nombre,
      valores: top.map(s => {
        const fila = valores[codigos.indexOf(s.codigo)];
        return estratos.reduce((a, e, k) => a + (tamanoDe(e) === t ? fila[k] : 0), 0);
      }),
    })),
  });
}

panorama();
