import 'leaflet/dist/leaflet.css';
import '../core/main.js';
import { initMapProveedores } from '../components/map.js';

// El botón "Buscar" todavía no filtra: la búsqueda real llega con los datos del DENUE (Fase 7).
initMapProveedores();
