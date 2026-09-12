import { QueryClient } from '@tanstack/react-query';

/**
 * El cliente de Query: la caché y su configuración por defecto.
 *
 * Se crea UNA sola vez, a nivel de módulo, y no dentro de un componente. Si
 * naciera dentro de App, cada render crearía un cliente nuevo y la caché se
 * perdería entera en cada uno.
 *
 * (En una app con renderizado en servidor sí iría dentro de un useState, para
 * que cada petición tenga su propia caché y dos usuarios no compartan datos.
 * Aquí todo corre en el navegador de una persona.)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * Por defecto Query vuelve a pedir al recuperar el foco de la ventana.
       * Aquí sobra: los elementos orbitales ya tienen `staleTime` de seis
       * horas, y la posición se calcula en local. Reactivar el foco solo
       * añadiría peticiones al BFF sin información nueva.
       */
      refetchOnWindowFocus: false,
    },
  },
});
