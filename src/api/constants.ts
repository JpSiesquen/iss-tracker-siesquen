/**
 * Constantes de la capa de datos.
 *
 * Viven aparte de los hooks por lo mismo que las de la escena: exportar
 * constantes junto a componentes o hooks rompe el fast refresh de React, y el
 * linter avisa.
 */

/*
 * La API de posición se retiró en la issue #40.
 *
 * Antes el cliente pedía lat/lon a wheretheiss.at cada cinco segundos
 * (`ISS_REFETCH_INTERVAL_MS`, `ISS_STALE_TIME_MS`, `ISS_QUERY_RETRIES`). Desde
 * #37 la posición se calcula con SGP4 a partir de los elementos del BFF, así
 * que no queda nada que pedir a terceros. El patrón de TanStack Query que se
 * aprendió ahí sigue vivo en `useTle`.
 *
 * `ISS_AGE_TICK_MS` se reutilizó: ya no marca el ritmo de una petición, solo
 * el del contador «hace N segundos» en la interfaz.
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
 * La POSICIÓN se propaga en local (60 fps en la escena, 1 Hz en el panel); los
 * ELEMENTOS ORBITALES se piden al BFF cada 6 horas. Son dos datos con ritmos
 * completamente distintos:
 *
 *   - La posición cambia continuamente: SGP4 la evalúa cuando hace falta.
 *   - Los elementos describen la FORMA de la órbita, que solo se recalcula
 *     cuando el catálogo publica una actualización, una o dos veces al día.
 *
 * Meter la forma de la órbita en el mismo ritmo que la posición obligaría a
 * elegir un intervalo intermedio: demasiado lento para una y un desperdicio
 * para la otra.
 */
export const TLE_STALE_TIME_MS = 6 * 60 * 60 * 1000;

/**
 * Reintentos del cliente al pedir los elementos.
 *
 * Dos: aquí no hay un refresco continuo que dé otra oportunidad enseguida. Si
 * esta petición falla del todo, no hay órbita que propagar hasta la siguiente
 * carga.
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

/** El nombre geográfico cambia mucho más despacio que las coordenadas. */
export const LOCATION_REFRESH_INTERVAL_MS = 30_000;
