/**
 * Constantes de la capa de datos.
 *
 * Viven aparte de los hooks por lo mismo que las de la escena: exportar
 * constantes junto a componentes o hooks rompe el fast refresh de React, y el
 * linter avisa.
 */

/**
 * Cada cuánto se pide la posición de la ISS, en milisegundos.
 *
 * ⚠️ La API pide no más de UNA petición por segundo. No bajar de 2000 ms: no
 * hay clave de acceso, así que lo único que la mantiene utilizable es que
 * nadie abuse.
 *
 * 5 s es una elección deliberada, no un número redondo. La ISS avanza a
 * 7.66 km/s, así que entre dos peticiones recorre unos 38 km. Sobre un globo
 * de radio 1 eso son ~0.006 unidades de escena: un salto perceptible pero
 * pequeño, que la interpolación de la issue #30 suavizará del todo.
 *
 * ⚠️ El intervalo se cuenta desde que TERMINA la petición anterior, no desde
 * que empieza. Medido: con este valor y una respuesta de ~800 ms, las
 * peticiones reales caen cada ~5.8 s. No es un fallo — así dos peticiones no
 * se solapan si la red va lenta — pero explica por qué la pestaña Network no
 * muestra exactamente 5.00 s.
 */
export const ISS_REFETCH_INTERVAL_MS = 5000;

/**
 * Cuánto tiempo se considera «fresco» un dato ya recibido.
 *
 * Mientras lo sea, Query sirve la caché sin ir a la red aunque alguien vuelva
 * a montar el hook. Se deja algo por debajo del intervalo de refresco para que
 * sea siempre `refetchInterval` quien marque el ritmo: si fueran iguales, el
 * dato caducaría justo en el mismo instante en que toca refrescar y cualquier
 * remontaje dispararía una petición extra.
 */
export const ISS_STALE_TIME_MS = 4000;

/**
 * Reintentos antes de dar por fallida una petición.
 *
 * El valor por defecto de Query es 3. Aquí basta con 1: los datos se vuelven a
 * pedir enteros cada 5 segundos de todas formas, así que insistir mucho en una
 * petición concreta solo retrasa el momento de mostrar el error.
 */
export const ISS_QUERY_RETRIES = 1;
