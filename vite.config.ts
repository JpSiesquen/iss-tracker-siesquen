import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    // Vite escanea todos los .html del proyecto para descubrir dependencias.
    // sandbox/ contiene los experimentos de la Fase 0, que cargan Three.js
    // desde un CDN mediante un import map: el navegador lo entiende, pero
    // Vite busca 'three' en node_modules y no lo encuentra.
    //
    // Sin esta exclusión avisa de que no puede resolver la dependencia. No
    // rompe nada (el sandbox se abre directo, sin Vite), pero ensucia la
    // salida con un error que no lo es.
    entries: ['index.html'],
  },

  server: {
    watch: {
      // Tampoco hace falta recargar el servidor al tocar el sandbox.
      ignored: ['**/sandbox/**'],
    },
  },
});
