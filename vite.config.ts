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

    // satellite.js incluye una build de WebAssembly que usa top-level await.
    // Sin declarar el target, el servidor de desarrollo no lo soporta.
    esbuildOptions: {
      target: 'es2022',
    },
  },

  build: {
    // Top-level await es estándar desde ES2022 y lo soportan todos los
    // navegadores modernos.
    //
    // Hace falta porque satellite.js 7.x incluye una build opcional de
    // WebAssembly con workers de pthreads, cargada mediante un import dinámico
    // (`await import('#wasm-multi-thread')` en dist/wasm/runtimes/index.js).
    // Ese código usa `await import("node:worker_threads")`, propio de Node.
    //
    // Este proyecto solo usa `gstime`, que es JavaScript puro; los calculadores
    // WASM son una alternativa de alto rendimiento que no necesitamos. Pero
    // Vite analiza los imports dinámicos estáticamente, así que el módulo entra
    // en el grafo igualmente y hay que declarar el target para que compile.
    target: 'es2022',
  },

  worker: {
    // El error no es del target sino del FORMATO: los workers se empaquetan
    // como 'iife' por defecto, y ese formato no admite top-level await.
    // 'es' sí lo admite, y lo soportan todos los navegadores modernos.
    format: 'es',
  },

  server: {
    watch: {
      // Tampoco hace falta recargar el servidor al tocar el sandbox.
      ignored: ['**/sandbox/**'],
    },
  },
});
