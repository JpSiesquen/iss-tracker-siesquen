/**
 * Constantes de la capa de datos.
 *
 * Viven aparte de los hooks por lo mismo que las de la escena: exportar
 * constantes junto a componentes o hooks rompe el fast refresh de React, y el
 * linter avisa.
 */

/*
 * Las constantes de la API de posición se retiraron en la issue #40.
 *
 * ISS_REFETCH_INTERVAL_MS, ISS_STALE_TIME_MS, ISS_QUERY_RETRIES y
 * ISS_AGE_TICK_MS existían para pedir la posición a wheretheiss.at cada cinco
 * segundos. Desde #37 el proyecto la calcula con SGP4 a partir de los
 * elementos orbitales del BFF, así que no queda nada que pedir.
 *
 * Se anota en vez de borrarlo en silencio: la capa que sustituyeron funcionaba
 * y sirvió para aprender el patrón de TanStack Query que sigue usando useTle.
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

/**
 * Cada cuánto recalcula la posición el panel de telemetría.
 *
 * Un segundo es el ritmo al que se percibe un número cambiando: más rápido no
 * se lee, más lento se nota parado.
 *
 * ⚠️ No tiene relación con el ritmo de la escena 3D, que propaga sesenta veces
 * por segundo sin pasar por React. Son el mismo cálculo a dos ritmos, cada uno
 * el adecuado para lo que hace.
 */
export const TELEMETRY_TICK_MS = 1000;
