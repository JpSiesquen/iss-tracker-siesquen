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

/**
 * A partir de cuántos milisegundos se considera «viejo» un dato.
 *
 * Con refresco cada 5 s, 30 s significa que han fallado unos seis intentos
 * seguidos: ya no es una lentitud puntual sino un problema real, y el usuario
 * merece saber que lo que ve no es de ahora.
 */
export const ISS_STALE_WARNING_MS = 30_000;

/**
 * Cada cuánto se recalcula el «hace N segundos» de la interfaz.
 *
 * No tiene nada que ver con pedir datos: es solo repintar un contador. Un
 * segundo basta para que se vea vivo sin re-renderizar de más.
 */
export const ISS_AGE_TICK_MS = 1000;

/**
 * Cuánto considera el cliente que los elementos orbitales siguen frescos.
 *
 * ⚠️ Alineado a propósito con el TTL de la CDN (`s-maxage=21600` en
 * `api/tle.ts`). Si el cliente pidiera cada cinco minutos algo que el servidor
 * cachea seis horas, serían peticiones que siempre devuelven exactamente lo
 * mismo: tráfico sin información.
 *
 * ## El contraste que importa
 *
 * La POSICIÓN se refresca cada 5 segundos; los ELEMENTOS ORBITALES, cada 6
 * horas. Son dos datos con ritmos completamente distintos y por eso viven en
 * dos consultas separadas:
 *
 *   - La posición cambia continuamente: la ISS recorre 38 km entre lecturas.
 *   - Los elementos describen la FORMA de la órbita, que solo se recalcula
 *     cuando el catálogo publica una actualización, una o dos veces al día.
 *
 * Meterlos en la misma consulta obligaría a elegir un ritmo intermedio que
 * sería demasiado lento para uno y un desperdicio para el otro.
 */
export const TLE_STALE_TIME_MS = 6 * 60 * 60 * 1000;

/**
 * Reintentos del cliente al pedir los elementos.
 *
 * Dos, uno más que para la posición: aquí no hay un refresco cada cinco
 * segundos que dé otra oportunidad enseguida. Si esta petición falla del todo,
 * no hay órbita que propagar hasta la siguiente carga.
 */
export const TLE_QUERY_RETRIES = 2;
