import { useEffect, useState } from 'react';

import { propagateToGeodetic, type GeodeticPosition } from '../lib/orbit';
import { useSatrecFromTle } from './useSatrecFromTle';
import { TELEMETRY_TICK_MS } from './constants';

/**
 * La posición de la ISS para mostrarla en la interfaz.
 *
 * ## Por qué no reutiliza el cálculo de la escena
 *
 * El marcador 3D propaga en cada fotograma dentro de `useFrame`, mutando
 * objetos de Three.js sin pasar por React. Eso es lo correcto allí: sesenta
 * renders por segundo serían absurdos.
 *
 * Pero el panel **sí** necesita renders para actualizar su texto. Así que
 * propaga por su cuenta, a un ritmo pensado para leerse:
 *
 *   escena 3D:  60 veces por segundo, sin render de React
 *   panel:       1 vez por segundo, con render
 *
 * No es duplicar trabajo: es el mismo cálculo a dos ritmos distintos, cada uno
 * el adecuado para lo que hace. Una propagación por segundo es despreciable
 * —se midieron 91 en 2 ms— y evita repintar texto que nadie puede leer tan
 * rápido.
 *
 * ## Por qué un segundo
 *
 * Es el ritmo al que se percibe un número cambiando. Más rápido no se lee;
 * más lento se nota parado.
 */
export function useIssTelemetry(): GeodeticPosition | null {
  const satrec = useSatrecFromTle();

  /**
   * El estado guarda solo las actualizaciones del intervalo, no el primer
   * valor.
   *
   * ⚠️ Calcular la primera posición dentro del efecto y guardarla con
   * `setState` provocaría un render en cascada: el componente se pinta vacío,
   * el efecto corre, y se vuelve a pintar. El linter lo avisa con razón.
   *
   * Derivándola durante el render el panel aparece con datos a la primera.
   */
  const [tick, setTick] = useState<GeodeticPosition | null>(null);

  useEffect(() => {
    if (!satrec) return;

    const id = setInterval(() => {
      setTick(propagateToGeodetic(satrec, new Date()));
    }, TELEMETRY_TICK_MS);

    return () => clearInterval(id);
  }, [satrec]);

  if (!satrec) return null;

  // El valor del intervalo si ya llegó; si no, uno recién calculado.
  return tick ?? propagateToGeodetic(satrec, new Date());
}
