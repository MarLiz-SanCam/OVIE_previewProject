// Genera las imágenes WebP que usa el sitio a partir de los originales.
//
//   npm run imagenes
//
// Originales:  recursos/imagenes-originales/   (no se publican)
// Resultado:   src/assets/images/              (se guardan en git y los usa Vite)
//
// Para cambiar una imagen: reemplaza el original (mismo nombre) y vuelve a correr el script.
// Para agregar una: ponla en recursos/imagenes-originales/ y agrégala a IMAGENES.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const ORIGEN = path.join(raiz, 'recursos', 'imagenes-originales');
const DESTINO = path.join(raiz, 'src', 'assets', 'images');
const CALIDAD = 80;

// Medidas pensadas para cómo se muestra cada imagen (con margen para pantallas de alta densidad).
const IMAGENES = [
  // Hero: ocupa todo el ancho; el navegador elige la versión con srcset.
  { origen: 'hero/hero-tabasco.png', salida: 'hero/hero-tabasco-1280.webp', ancho: 1280 },
  { origen: 'hero/hero-tabasco.png', salida: 'hero/hero-tabasco-1920.webp', ancho: 1920 },
  // Logo: se muestra a 40 px de alto; se genera a 3x.
  { origen: 'marca/logo-turismo-horizontal.png', salida: 'marca/logo-turismo-horizontal.webp', alto: 120 },
  // Tarjetas de ruta: ~400×110 px en escritorio, ancho completo en celular.
  ...[
    'ruta-1-villahermosa', 'ruta-2-pantanos-centla', 'ruta-3-bij-yokotan',
    'ruta-4-aventura-olmeca-zoque', 'ruta-5-rios-mayas', 'ruta-6-cacao-chocolate',
  ].map(n => ({ origen: `rutas/${n}.png`, salida: `rutas/${n}.webp`, ancho: 960 })),
];

const kb = bytes => `${(bytes / 1024).toFixed(0)} KB`;
let antes = 0, despues = 0;
const contados = new Set();

for (const img of IMAGENES) {
  const entrada = path.join(ORIGEN, img.origen);
  const salida = path.join(DESTINO, img.salida);
  await fs.mkdir(path.dirname(salida), { recursive: true });

  const info = await sharp(entrada)
    .resize({ width: img.ancho, height: img.alto, withoutEnlargement: true })
    .webp({ quality: CALIDAD, effort: 6 })
    .toFile(salida);

  const pesoOriginal = (await fs.stat(entrada)).size;
  if (!contados.has(entrada)) { contados.add(entrada); antes += pesoOriginal; }
  despues += info.size;
  console.log(`${img.salida.padEnd(40)} ${String(info.width).padStart(4)}×${info.height}  ${kb(pesoOriginal).padStart(8)} → ${kb(info.size)}`);
}

console.log(`\nTotal: ${kb(antes)} → ${kb(despues)}`);
