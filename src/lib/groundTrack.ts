import type { Vector3 } from 'three';
import type { SatRec } from 'satellite.js';

import { altitudeToRadius, latLonToVector3 } from './coordinates';
import { propagateToGeodetic } from './orbit';

/**
 * La traza orbital: por dónde ha pasado la ISS y por dónde va a pasar.
 *
 * ## Cómo se construye
 *
 * Muestreando el tiempo. Se propaga la posición en instantes sucesivos y se
 * unen los puntos. No hay geometría de elipses ni fórmula cerrada: es la misma
 * función de #37 evaluada muchas veces.
 *
 * ## El antimeridiano, otra vez ausente
 *
 * Sobre un mapa plano habría que **partir la línea** al cruzar ±180°, o
 * aparecería un trazo horizontal atravesando el mundo entero. En 3D el
 * problema no existe: cada muestra se convierte a un punto del espacio antes
 * de unirla con la siguiente, y ahí 179.9° y −179.9° son vecinos.
 *
 * Es la misma razón que en la interpolación de #30, y merece notarlo: trabajar
 * en tres dimensiones elimina de raíz un problema clásico de la cartografía.
 */

/** Minutos hacia atrás y hacia delante que cubre la traza. */
export const TRACK_MINUTES = 45;

/**
 * Minutos entre muestras.
 *
 * La ISS recorre unos 460 km por minuto, así que este paso decide la suavidad
 * de la línea: con 1 minuto salen 91 puntos y la curva se ve continua; con 5,
 * la órbita se vuelve visiblemente poligonal.
 *
 * ⚠️ Cada muestra es una propagación SGP4 completa. 91 por recálculo es
 * asumible; hacerlo en cada fotograma serían 5460 por segundo a 60 fps.
 */
export const TRACK_STEP_MINUTES = 1;

/**
 * Cada cuánto se rehace la traza, en milisegundos.
 *
 * La órbita cambia despacio: en 30 segundos la ISS avanza 230 km sobre una
 * traza que cubre 44 000. Recalcular más a menudo no se notaría y costaría
 * propagaciones.
 *
 * El marcador sí se mueve en cada fotograma —esa es la parte que se percibe—;
 * la línea de fondo puede permitirse ir a otro ritmo.
 */
export const TRACK_REFRESH_MS = 30_000;

export interface GroundTrack {
  /** Desde hace 45 minutos hasta el instante actual. */
  past: Vector3[];
  /** Desde el instante actual hasta dentro de 45 minutos. */
  future: Vector3[];
}

/**
 * Genera la traza centrada en un instante.
 *
 * Se devuelven dos tramos porque pasado y futuro se dibujan distinto: sin esa
 * distinción, la línea no dice hacia dónde va la estación.
 *
 * ⚠️ El punto del instante actual va en **ambos** tramos. Sin él, las dos
 * líneas quedarían separadas por un hueco justo donde está el marcador, que es
 * el sitio donde más se notaría.
 *
 * @param satrec El propagador de #37.
 * @param now    El instante central, normalmente el de la escena.
 */
export function buildGroundTrack(satrec: SatRec, now: Date): GroundTrack {
  const past: Vector3[] = [];
  const future: Vector3[] = [];

  for (
    let minute = -TRACK_MINUTES;
    minute <= TRACK_MINUTES;
    minute += TRACK_STEP_MINUTES
  ) {
    const when = new Date(now.getTime() + minute * 60_000);
    const geo = propagateToGeodetic(satrec, when);

    // Una propagación fallida se salta: es preferible una traza con un hueco
    // a una línea que atraviesa el planeta hacia un punto inventado.
    if (!geo) continue;

    const punto = latLonToVector3(
      geo.latitude,
      geo.longitude,
      altitudeToRadius(geo.altitude),
    );

    if (minute <= 0) past.push(punto);
    if (minute >= 0) future.push(punto);
  }

  return { past, future };
}
