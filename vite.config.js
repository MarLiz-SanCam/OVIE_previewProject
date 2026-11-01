import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import htmlPartials, { entradas } from './vite-plugins/html-partials.js';

const root = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  // Las páginas viven en src/; Info/ y la configuración quedan fuera del sitio.
  root,
  // Rutas relativas: el build funciona en https://<usuario>.github.io/<repo>/
  // sin depender del nombre del repositorio.
  base: './',
  plugins: [htmlPartials()],
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
    // Inicio + módulos activos de src/modulos.json
    rolldownOptions: { input: entradas(root) },
  },
});
