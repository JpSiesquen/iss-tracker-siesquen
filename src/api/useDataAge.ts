import { useEffect, useState } from 'react';

import { ISS_AGE_TICK_MS } from './constants';

/**
 * Milisegundos transcurridos desde un instante dado, actualizado solo.
 *
 * ## Por qué hace falta un hook y no basta una resta
 *
 * `Date.now() - dataUpdatedAt` se calcularía una vez, durante el render, y se
 * quedaría congelado: React no vuelve a renderizar porque el reloj avance. El
 * contador diría «hace 0 s» eternamente hasta que llegara un dato nuevo.
 *
 * Y justo cuando más importa —la conexión caída, sin datos nuevos que
 * provoquen un render— es cuando peor mentiría.
 *
 * ## Por qué el intervalo no depende de `timestamp`
 *
 * El efecto se monta una sola vez y sigue corriendo. Si `timestamp` estuviera
 * en las dependencias, cada dato nuevo destruiría el intervalo y crearía otro,
 * reiniciando el ciclo de un segundo y haciendo que el contador saltara de
 * forma irregular.
 */
export function useDataAge(timestamp: number | undefined): number | null {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), ISS_AGE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  if (timestamp === undefined) return null;

  /**
   * `Math.max(0, ...)` porque el reloj del navegador y el del servidor no
   * están sincronizados: si el del usuario va atrasado, la resta puede salir
   * negativa y mostrarse «hace -2 s», que es evidentemente absurdo.
   */
  return Math.max(0, ahora - timestamp);
}

/** Formatea una duración en milisegundos como texto breve en castellano. */
export function formatAge(ms: number): string {
  const segundos = Math.floor(ms / 1000);
  if (segundos < 60) return `hace ${segundos} s`;

  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  return `hace ${horas} h`;
}
