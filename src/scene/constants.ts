/**
 * Constantes de la escena 3D.
 *
 * Viven aparte de los componentes por dos razones: el linter avisa de que
 * exportar constantes junto a componentes rompe el fast refresh de React, y
 * varias de estas las van a necesitar issues posteriores (la posición del Sol
 * en la 2-5, el radio en la 3-4 para colocar la ISS).
 *
 * Convención del proyecto: constantes con nombre, nunca números sueltos. Un
 * 0.41 suelto en medio de una escena no se puede revisar.
 */

/** Radio de la Tierra en unidades de escena. Todo lo demás se mide respecto a esto. */
export const EARTH_RADIUS = 1;

/**
 * Segmentos de la esfera. Una esfera perfecta no existe en 3D: se aproxima con
 * triángulos, y los segmentos dicen cuántos. 64 da una silueta suave; con la
 * textura aplicada (issue 2-4) se podría bajar a 32 sin que se note, que es lo
 * que evalúa la issue de rendimiento.
 */
export const EARTH_SEGMENTS = 64;

/**
 * Posición del Sol. Lo que importa es la DIRECCIÓN, no la distancia: una
 * DirectionalLight emite rayos paralelos, así que [5,3,5] y [50,30,50]
 * iluminan idéntico.
 *
 * Es una posición inventada. La real depende de la fecha y la hora, y
 * calcularla es lo que hará la issue 2-5.
 */
export const SUN_POSITION: [number, number, number] = [5, 3, 5];

/** Intensidad del Sol. Se reajusta en la issue 2-5, con la textura ya aplicada. */
export const SUN_INTENSITY = 3;

/**
 * Luz de relleno. Solo evita que la cara oscura sea negro absoluto.
 *
 * ⚠️ No subirla para «ver mejor» el lado nocturno: aplasta el degradado entre
 * día y noche, que es justo el efecto que se busca.
 */
export const AMBIENT_INTENSITY = 0.15;
