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
 * Distancia a la que se coloca la luz del Sol, en unidades de escena.
 *
 * Solo importa la DIRECCIÓN: una luz direccional emite rayos paralelos, así que
 * 10 y 100 iluminan idéntico. Pero Three.js necesita una posición concreta para
 * derivar esa dirección, y este valor la deja claramente fuera del globo.
 *
 * ⚠️ La posición ya no se elige: la calcula `sunDirection()` a partir de la
 * fecha (issue #77). Antes era un `[5, 3, 5]` inventado, y con él había una
 * cara del planeta permanentemente en sombra.
 */
export const SUN_DISTANCE = 10;

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

/**
 * Inclinación axial de la Tierra, en radianes.
 *
 * 23.44° es lo que causa las estaciones, y la razón de que el terminador no
 * pase por los polos salvo en los equinoccios.
 */
export const EARTH_TILT = (23.44 * Math.PI) / 180;

/**
 * Intensidad del relieve simulado por el normal map.
 *
 * Un valor alto exagera las montañas hasta parecer irreal; uno bajo no se nota.
 * Se aplica en X e Y por igual.
 */
export const EARTH_NORMAL_SCALE: [number, number] = [0.6, 0.6];

/**
 * Brillo de las luces nocturnas.
 *
 * El shader de `earthNightShader.ts` modula esta emisión con la dirección del
 * Sol: intensidad completa en la noche, cero durante el día y una transición
 * gradual alrededor del terminador.
 */
export const EARTH_NIGHT_INTENSITY = 0.45;

/**
 * Tamaño de los marcadores de depuración de la issue 3-4.
 *
 * Lo bastante pequeños para señalar un punto concreto y no una región.
 */
export const DEBUG_MARKER_SIZE = 0.015;

/**
 * Radio al que se colocan esos marcadores.
 *
 * Ligeramente por encima de la superficie para que no queden medio enterrados
 * en la malla, que a 64 segmentos no es una esfera perfecta.
 */
export const DEBUG_MARKER_RADIUS = 1.005;

/**
 * Tamaño del marcador de la ISS, en unidades de escena.
 *
 * A escala real sería absurdo: la estación mide 109 m frente a los 12 742 km
 * de diámetro terrestre, o sea 0.0000086 unidades. Un punto invisible. El
 * marcador no representa su tamaño, sino su posición.
 */
export const ISS_MARKER_SIZE = 0.022;

/** Color del marcador. Cálido, para contrastar con el azul del planeta. */
export const ISS_MARKER_COLOR = '#ffcc00';

/**
 * Intensidad de la emisión del marcador.
 *
 * Emisivo para que se vea igual sobre el lado nocturno que sobre el diurno:
 * un marcador que desaparece la mitad del tiempo no sirve de nada. Por encima
 * de 1 el tone mapping ACES lo mantiene brillante sin quemarlo.
 */
export const ISS_MARKER_EMISSIVE_INTENSITY = 1.8;

/**
 * Escala del modelo ISS de NASA dentro de la escena.
 *
 * El activo está medido en metros y la escena usa EARTH_RADIUS = 1. Su tamaño
 * físico sería imperceptible (la envergadura real es de unos 109 m), así que se
 * amplía deliberadamente hasta conservar la silueta de sus paneles solares.
 */
export const ISS_MODEL_SCALE = 0.01;

/**
 * Emisión moderada del modelo para conservar su silueta sobre el hemisferio
 * nocturno. La luz ambiental por sí sola no alcanza para distinguir sus
 * paneles solares contra el espacio.
 */
export const ISS_MODEL_EMISSIVE_COLOR = '#9bb8ff';
export const ISS_MODEL_EMISSIVE_INTENSITY = 0.6;

/*
 * ISS_SMOOTHING se retiró en la issue #37.
 *
 * Existía para suavizar el salto de 38 km que daba el marcador cada vez que
 * llegaba una posición nueva de la API, cada cinco segundos. Con SGP4 la
 * posición se calcula en cada fotograma a partir de la hora, así que la
 * trayectoria ya es continua: no queda ningún salto que disimular.
 *
 * Se deja anotado en lugar de borrarlo sin más porque la interpolación seguía
 * siendo correcta — dejó de hacer falta, que no es lo mismo que estar mal.
 */

/**
 * Colores de la traza orbital.
 *
 * Pasado y futuro se distinguen a propósito: sin esa diferencia la línea no
 * dice hacia dónde va la estación, y haría falta una flecha para contarlo.
 *
 * El futuro comparte el color del marcador —es hacia donde se dirige— y el
 * pasado va en un tono frío y apagado, que se lee como estela.
 */
export const TRACK_FUTURE_COLOR = '#ffcc00';
export const TRACK_PAST_COLOR = '#5eb0ff';

/** Grosor de la traza, en píxeles. Independiente de la distancia de la cámara. */
export const TRACK_LINE_WIDTH = 1.6;

/**
 * Opacidad de cada tramo.
 *
 * La traza no debe competir con el planeta: es contexto, no protagonista. El
 * pasado va más tenue que el futuro porque ya ocurrió.
 */
export const TRACK_FUTURE_OPACITY = 0.85;
export const TRACK_PAST_OPACITY = 0.4;
