import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: el build funciona en https://<usuario>.github.io/<repo>/
  // sin depender del nombre del repositorio.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
