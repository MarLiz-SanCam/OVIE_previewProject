

'use strict';

window.mapLayers = {};

function dotIcon(color, size = 12) {
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;
             background:${color};border:2px solid white;
             box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
    className: '',
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function initMapTurismo() {
  if (window.mapInstances.turismo) return;
  const el = document.getElementById('map-turismo');
  if (!el) return;

  const map = L.map('map-turismo', { zoomControl: true }).setView([17.84, -92.62], 8);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 17,
  }).addTo(map);

  const lgRutas    = L.layerGroup();
  const lgPueblos  = L.layerGroup();
  const lgHoteles  = L.layerGroup();
  const lgMuseos   = L.layerGroup();
  const lgEco      = L.layerGroup();

  window.mapLayers = { rutas: lgRutas, pueblos: lgPueblos, hoteles: lgHoteles, museos: lgMuseos, eco: lgEco };

  const ROUTE_COLORS = {
    'Gran Ruta Villahermosa':    '#1e5f8c',
    'Pantanos de Centla':        '#1d9e75',
    "Bij Yokot'an":              '#854f0b',
    'Aventura Olmeca-Zoque':     '#7c3aed',
    'Ríos Mayas':                '#0891b2',
    'Del Cacao al Chocolate':    '#92400e',
  };

  const routePoints = [
    { lat:17.9869, lng:-92.9303, name:'Villahermosa',    route:'Gran Ruta Villahermosa', desc:'Capital del estado · museo La Venta' },
    { lat:18.2456, lng:-93.1876, name:'Paraíso',         route:'Gran Ruta Villahermosa', desc:'Playas y lagunas costeras' },
    { lat:18.5978, lng:-92.6412, name:'Centla',          route:'Pantanos de Centla',     desc:'Reserva de la biósfera · manglar' },
    { lat:18.3412, lng:-92.5634, name:'Jonuta',          route:'Pantanos de Centla',     desc:'Fauna acuática · ecoturismo' },
    { lat:18.1734, lng:-93.2876, name:'Nacajuca',        route:"Bij Yokot'an",           desc:'Centro cultural chontal' },
    { lat:18.0756, lng:-93.2198, name:'Jalpa de Méndez', route:"Bij Yokot'an",           desc:'Artesanías y gastronomía' },
    { lat:17.6234, lng:-92.9612, name:'Teapa',           route:'Aventura Olmeca-Zoque',  desc:'Grutas de Coconá · aguas termales' },
    { lat:17.6523, lng:-92.6134, name:'Macuspana',       route:'Aventura Olmeca-Zoque',  desc:'Zona arqueológica La Mar' },
    { lat:17.5356, lng:-91.7824, name:'Balancán',        route:'Ríos Mayas',             desc:'Río Usumacinta · selva lacandona' },
    { lat:17.4512, lng:-91.9234, name:'Emiliano Zapata', route:'Ríos Mayas',             desc:'Frontera con Guatemala · ecoturismo' },
    { lat:17.9289, lng:-93.2187, name:'Comalcalco',      route:'Del Cacao al Chocolate', desc:'Zona arqueológica · cacao orgánico' },
    { lat:17.8534, lng:-93.3412, name:'Cunduacán',       route:'Del Cacao al Chocolate', desc:'Cooperativas cacaoteras' },
  ];

  routePoints.forEach(p => {
    const color = ROUTE_COLORS[p.route] ?? '#6b7280';
    L.marker([p.lat, p.lng], { icon: dotIcon(color, 13) })
      .bindPopup(`
        <div style="min-width:160px">
          <div style="font-weight:600;font-size:13px;color:#111">${p.name}</div>
          <div style="font-size:11px;color:#555;margin:2px 0 6px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:4px;vertical-align:middle"></span>
            ${p.route}
          </div>
          <div style="font-size:11px;color:#777">${p.desc}</div>
        </div>`)
      .addTo(lgRutas);
  });

  const pueblosMagicos = [
    { lat:17.9869, lng:-92.9303, name:'Villahermosa',  info:'Capital · Zona CICOM · Parque La Venta' },
    { lat:18.1734, lng:-93.2876, name:'Nacajuca',      info:'Pueblo chontal · Tabasco' },
    { lat:17.6234, lng:-92.9612, name:'Teapa',         info:'Grutas de Coconá · balneario natural' },
  ];
  pueblosMagicos.forEach(p => {
    const icon = L.divIcon({
      html: `<div style="background:#fbbf24;color:#78350f;width:20px;height:20px;
               border-radius:50%;display:flex;align-items:center;justify-content:center;
               border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);font-size:11px">★</div>`,
      className: '', iconSize: [20,20], iconAnchor: [10,10],
    });
    L.marker([p.lat, p.lng], { icon })
      .bindPopup(`<strong style="font-size:13px">${p.name}</strong><br><small style="color:#555">${p.info}</small>`)
      .addTo(lgPueblos);
  });

  const hoteles = [
    { lat:17.9923, lng:-92.9287, name:'Hotel Cencali',       stars:4, area:'Villahermosa' },
    { lat:17.9834, lng:-92.9312, name:'Hyatt Regency',        stars:5, area:'Villahermosa' },
    { lat:17.9756, lng:-92.9198, name:'Holiday Inn Express',  stars:3, area:'Villahermosa' },
    { lat:18.2312, lng:-93.1756, name:'Hotel Paraíso Beach',  stars:3, area:'Paraíso' },
    { lat:17.6312, lng:-92.9534, name:'Balneotur Teapa',      stars:2, area:'Teapa' },
  ];
  hoteles.forEach(h => {
    const color = h.stars >= 5 ? '#7c3aed' : h.stars === 4 ? '#1e5f8c' : h.stars === 3 ? '#1d9e75' : '#9ca3af';
    L.marker([h.lat, h.lng], { icon: dotIcon(color, 11) })
      .bindPopup(`<strong>${h.name}</strong><br><small>${'★'.repeat(h.stars)} · ${h.area}</small>`)
      .addTo(lgHoteles);
  });

  const museos = [
    { lat:17.9876, lng:-92.9356, name:'Parque Museo La Venta',    tipo:'Arqueológico' },
    { lat:17.9823, lng:-92.9245, name:'Museo de Tabasco (MAET)',   tipo:'Historia' },
    { lat:17.9289, lng:-93.2034, name:'Zona Arqueológica Comalcalco', tipo:'Arqueológico' },
    { lat:17.9756, lng:-92.9134, name:'Museo de Historia Natural', tipo:'Natural' },
  ];
  museos.forEach(m => {
    L.marker([m.lat, m.lng], { icon: dotIcon('#4f46e5', 11) })
      .bindPopup(`<strong>${m.name}</strong><br><small>${m.tipo}</small>`)
      .addTo(lgMuseos);
  });

  const eco = [
    { lat:18.5978, lng:-92.6412, name:'Reserva Pantanos de Centla', tipo:'Biósfera' },
    { lat:17.6234, lng:-92.9612, name:'Grutas de Coconá',           tipo:'Geológico' },
    { lat:17.5356, lng:-91.7824, name:'Río Usumacinta',             tipo:'Ecoaventura' },
    { lat:18.3412, lng:-92.5634, name:'Laguna del Rosario',         tipo:'Humedal' },
  ];
  eco.forEach(e => {
    L.marker([e.lat, e.lng], { icon: dotIcon('#059669', 11) })
      .bindPopup(`<strong>${e.name}</strong><br><small>${e.tipo}</small>`)
      .addTo(lgEco);
  });

  [lgRutas, lgPueblos, lgHoteles, lgMuseos, lgEco].forEach(lg => lg.addTo(map));

  window.mapInstances.turismo = map;
}

function initMapProveedores() {
  if (window.mapInstances.proveedores) return;
  const el = document.getElementById('map-proveedores');
  if (!el) return;

  const map = L.map('map-proveedores').setView([17.97, -92.93], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 17,
  }).addTo(map);

  const SECTOR_COLORS = {
    'Comercio':      '#1e5f8c',
    'Manufactura':   '#d97706',
    'Servicios':     '#1d9e75',
    'Agroindustria': '#059669',
    'Turismo':       '#7c3aed',
    'Construcción':  '#dc2626',
  };

  const negocios = [
    { lat:17.9956, lng:-92.9304, name:'Comercializadora del Sureste SA',  sector:'Comercio',     estrato:'Mediana', personal:'51–100' },
    { lat:17.9823, lng:-92.9156, name:'Industrias Tabasqueñas SA de CV',  sector:'Manufactura',  estrato:'Grande',  personal:'251+' },
    { lat:17.9734, lng:-92.9489, name:'Servicios Profesionales SRL',       sector:'Servicios',    estrato:'Micro',   personal:'1–5' },
    { lat:18.0123, lng:-92.9312, name:'Agroindustria del Trópico',         sector:'Agroindustria',estrato:'Pequeña', personal:'6–10' },
    { lat:17.9612, lng:-92.9078, name:'Hotel Gran Tabasco',                sector:'Turismo',      estrato:'Mediana', personal:'51–100' },
    { lat:17.9923, lng:-92.9423, name:'Constructora Regional SA de CV',    sector:'Construcción', estrato:'Pequeña', personal:'11–30' },
    { lat:17.9512, lng:-92.9234, name:'Distribuidora Olmeca',              sector:'Comercio',     estrato:'Pequeña', personal:'11–30' },
    { lat:17.9834, lng:-92.9045, name:'Centro de Capacitación Tabasco',    sector:'Servicios',    estrato:'Micro',   personal:'1–5' },
    { lat:18.0034, lng:-92.9512, name:'Frutas Tropicales del Sureste',     sector:'Agroindustria',estrato:'Mediana', personal:'51–100' },
    { lat:17.9723, lng:-92.9367, name:'Ferretera Industrial Tabasqueña',   sector:'Comercio',     estrato:'Pequeña', personal:'11–30' },
  ];

  negocios.forEach(n => {
    const color = SECTOR_COLORS[n.sector] ?? '#6b7280';
    L.circleMarker([n.lat, n.lng], {
      radius: 8,
      fillColor: color,
      color: '#fff',
      weight: 2,
      fillOpacity: 0.85,
    }).bindPopup(`
      <div style="min-width:180px">
        <div style="font-weight:600;font-size:12px;color:#111;margin-bottom:4px">${n.name}</div>
        <div style="font-size:11px;color:#555">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;
            background:${color};margin-right:4px;vertical-align:middle"></span>
          ${n.sector}
        </div>
        <div style="font-size:11px;color:#777;margin-top:2px">Estrato: ${n.estrato} · ${n.personal} personas</div>
      </div>`)
      .addTo(map);
  });

  window.mapInstances.proveedores = map;
}

