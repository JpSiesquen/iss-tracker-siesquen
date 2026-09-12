import { MathUtils, Vector3 } from 'three';

import { EARTH_RADIUS } from '../scene/constants.ts';

/**
 * Radio medio de la Tierra en kilómetros.
 *
 * 6371 km es el radio MEDIO. El planeta no es una esfera: está achatado por
 * los polos, con 6378 km en el ecuador y 6357 en los polos. Para un visor esa
 * diferencia del 0.3% es invisible; para calcular una órbita de verdad no lo
 * sería, y por eso SGP4 (Fase 4) usa el elipsoide WGS-84 y no este número.
 */
export const EARTH_RADIUS_KM = 6371;

/**
 * Cuánto se exagera la altitud de la ISS.
 *
 * A escala real la ISS orbita a 420 km sobre una Tierra de 6371 km de radio:
 *
 *   radio = 1 + 420/6371 = 1.066
 *
 * Un 6.6% por encima de la superficie. El marcador quedaría prácticamente
 * pegado al suelo y la órbita de la Fase 5 sería una línea sobre la textura.
 *
 * ⚠️ Exagerar la ALTITUD es aceptable; exagerar la POSICIÓN no. Latitud y
 * longitud se respetan siempre, sin excepción: son el dato que el proyecto
 * promete mostrar. Solo se escala la distancia radial, que es una decisión
 * de presentación.
 *
 * Con factor 8: 1 + 8 × 0.066 = 1.53, una órbita claramente separada del globo
 * y todavía reconocible como órbita baja.
 */
export const ALTITUDE_EXAGGERATION = 8;

/**
 * Convierte coordenadas geográficas a un punto en el espacio 3D.
 *
 * ## La conversión
 *
 * La conversión geométrica parte de coordenadas ESFÉRICAS (lat, lon, alt);
 * Three.js necesita CARTESIANAS (x, y, z).
 *
 * `phi` (ángulo polar) se mide desde el eje Y: 0 en el polo norte, 180° en el
 * sur. La latitud se mide desde el ecuador: +90° norte, −90° sur. `90 - lat`
 * traduce una convención en la otra.
 *
 * `y = radio · cos(phi)` porque en Three.js **Y es el eje vertical**. En el
 * polo norte (phi = 0) da y = radio; en el ecuador (phi = 90°) da y = 0.
 *
 * ## El `+180` y el signo de la x
 *
 * ⚠️ Aquí está el 90% de los errores, y no salen de la matemática: alinean la
 * fórmula con **cómo enrolla la textura la SphereGeometry de Three.js**. Si la
 * textura tuviera otra orientación, estos valores cambiarían.
 *
 * No se copiaron de ningún sitio: se comprobaron contra el atributo `uv` de la
 * propia geometría, buscando qué vértice recibe cada píxel de la imagen
 * equirectangular. El resultado medido:
 *
 *   u = 0.0  (borde izquierdo, −180°)  →  x = −1, z =  0
 *   u = 0.25 (−90°)                    →  x =  0, z = +1
 *   u = 0.5  (centro, Greenwich 0°)    →  x = +1, z =  0
 *   u = 0.75 (+90°)                    →  x =  0, z = −1
 *   v = 1 (fila superior)              →  polo norte
 *
 * Contrastada contra nueve puntos conocidos, el error máximo fue 0.0055
 * unidades: menos que la separación entre vértices de la malla (0.0123), o
 * sea, discretización y no error de fórmula.
 *
 * ## Función pura
 *
 * Mismos argumentos, mismo resultado, sin leer ni tocar nada externo. Eso la
 * hace comprobable sin renderizar y es la razón de que viva en `lib/` y no
 * dentro de un componente.
 *
 * @param latitude  Grados, norte positivo, [-90, 90].
 * @param longitude Grados, este positivo, [-180, 180].
 * @param radius    Distancia al centro en unidades de escena.
 */
export function latLonToVector3(
  latitude: number,
  longitude: number,
  radius: number,
): Vector3 {
  const phi = MathUtils.degToRad(90 - latitude);
  const theta = MathUtils.degToRad(longitude + 180);

  const senoPhi = Math.sin(phi);

  return new Vector3(
    -radius * senoPhi * Math.cos(theta),
    radius * Math.cos(phi),
    radius * senoPhi * Math.sin(theta),
  );
}

/**
 * Traduce una altitud en kilómetros al radio que le corresponde en la escena.
 *
 * Separada de `latLonToVector3` a propósito: la conversión geométrica es
 * exacta y universal, mientras que esto incorpora una decisión estética. Que
 * no compartan función deja claro cuál es cuál.
 */
export function altitudeToRadius(altitudeKm: number): number {
  const fraccionReal = altitudeKm / EARTH_RADIUS_KM;
  return EARTH_RADIUS + fraccionReal * ALTITUDE_EXAGGERATION;
}

/**
 * Normaliza una longitud al rango [-180, 180].
 *
 * El doble módulo importa porque `%` conserva el signo en JavaScript: aplicar
 * uno solo dejaría fuera del rango algunos ángulos negativos. Se usa tanto
 * para datos externos como para longitudes calculadas dentro del proyecto.
 */
export function normalizeLongitude(degrees: number): number {
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}
