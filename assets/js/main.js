// Punto de entrada de Vite.
// El orden de los estilos replica el que tenía la página con CDNs:
// Tabler → Leaflet → main.css → Tailwind (Tailwind al final, como el CDN).
import '@tabler/icons-webfont/dist/tabler-icons.min.css';
import 'leaflet/dist/leaflet.css';
import '../css/main.css';
import '../css/tailwind.css';

import { switchTab, calcular, comparar, toggleLayer } from './app.js';
import { initMapProveedores } from './map.js';
import './charts.js';

// Temporal: el HTML todavía usa onclick="..." en línea, que solo ve funciones globales.
// Se elimina en la Fase 3, cuando los eventos se registren desde JS.
Object.assign(window, { switchTab, calcular, comparar, toggleLayer, initMapProveedores });
