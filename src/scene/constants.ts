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
 * ⚠️ Con emissiveMap las luces se ven también de día, lo cual es incorrecto.
 * Un valor moderado deja que el lado iluminado las apague por contraste, sin
 * necesidad de un shader propio.
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
 * Velocidad con la que el marcador persigue su posición objetivo.
 *
 * El movimiento es exponencial: en cada fotograma recorre una fracción de lo
 * que le queda, así que se acerca rápido al principio y frena al final. Nunca
 * llega del todo, pero la diferencia deja de ser visible enseguida.
 *
 * Medido a 60 fps: con factor 2 el marcador cubre el 99.996% del salto en los
 * cinco segundos que hay entre datos. Con factor 1 quedaría un 0.65% sin
 * recorrer al llegar el dato siguiente, y el marcador iría crónicamente
 * retrasado respecto a la posición real.
 *
 * ⚠️ Se multiplica por delta time, nunca se aplica por fotograma. Comprobado:
 * alcanzar el 90% del recorrido tarda 1.133 s a 60 fps y 1.146 s a 144 fps.
 * Sin delta time, un equipo rápido movería el marcador al doble de velocidad.
 */
export const ISS_SMOOTHING = 2;
