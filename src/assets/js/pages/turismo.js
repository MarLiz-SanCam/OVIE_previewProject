import 'leaflet/dist/leaflet.css';
import '../core/main.js';
import { initMapTurismo, toggleLayer } from '../components/map.js';

initMapTurismo();

document.querySelectorAll('[data-capa]').forEach(btn => {
  btn.addEventListener('click', () => toggleLayer(btn, btn.dataset.capa));
});
