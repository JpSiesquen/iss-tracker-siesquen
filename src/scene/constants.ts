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

/**
 * Intensidad del Sol.
 *
 * R3F aplica ACES Filmic tone mapping por defecto, que comprime los tonos
 * altos: la misma intensidad se percibe más apagada que sin él. Con la textura
 * aplicada (issue 2-4) el valor de la Fase 0 se quedaba corto, porque una
 * superficie con detalle refleja distinto que un color plano.
 */
export const SUN_INTENSITY = 3.5;

/**
 * Luz de relleno. Solo evita que la cara oscura sea negro absoluto.
 *
 * A 0.12, un píxel de brillo medio en el lado nocturno queda en torno a
 * 12/255: visible pero claramente en sombra, que es lo que deja apreciar el
 * terminador.
 *
 * ⚠️ No subirla para «ver mejor» el lado nocturno: aplasta el degradado entre
 * día y noche, que es justo el efecto que se busca. En la issue 2-8 ese lado
 * se ilumina como toca, con las luces de las ciudades.
 */
export const AMBIENT_INTENSITY = 0.12;

/**
 * Color del espacio. Casi negro, pero no negro puro: un negro absoluto se ve
 * como un agujero, y un azul muy oscuro da sensación de profundidad.
 */
export const SPACE_COLOR = '#05060a';

/**
 * Límites de zoom de la cámara, en unidades de escena (EARTH_RADIUS = 1).
 *
 * El mínimo evita entrar dentro de la Tierra; el máximo, perderla de vista.
 * En la Fase 3 la ISS se dibujará a ~1.15 del centro, así que el mínimo debe
 * dejar sitio para verla.
 */
export const CAMERA_MIN_DISTANCE = 1.5;
export const CAMERA_MAX_DISTANCE = 8;
