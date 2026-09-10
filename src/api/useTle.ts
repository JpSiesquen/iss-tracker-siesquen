import { useQuery } from '@tanstack/react-query';

import { TLE_QUERY_RETRIES, TLE_STALE_TIME_MS } from './constants';
import { fetchTle } from './tle';

/**
 * Clave de los elementos orbitales en la caché.
 *
 * Distinta de `['iss-position']` a propósito: son dos datos con ritmos
 * distintos, y compartir clave los obligaría a compartir también el ritmo de
 * refresco.
 */
export const TLE_QUERY_KEY = ['tle'] as const;

/**
 * Los elementos orbitales de la ISS, servidos por el BFF.
 *
 * ## Sin `refetchInterval`, a diferencia de `useIssPosition`
 *
 * No hay temporizador: con `staleTime` de seis horas, Query sirve el dato de
 * su caché sin volver a pedirlo mientras dure la sesión. Un tracker abierto
 * toda la tarde hace **una sola** petición a `/api/tle`.
 *
 * Ese es el comportamiento correcto para un dato que se publica una o dos
 * veces al día. La posición, que cambia continuamente, sí lleva su intervalo
 * de cinco segundos.
 *
 * ## Qué hacer con `stale`
 *
 * Cuando el BFF no pudo actualizar y sirve el último dato conocido, la
 * respuesta trae `stale: true` y su antigüedad. No es un error —los elementos
 * envejecen despacio y uno de ayer sigue dando una posición razonable— pero
 * quien lo consuma debe poder decirlo. Se expone tal cual para que la interfaz
 * decida.
 */
export function useTle() {
  const query = useQuery({
    queryKey: TLE_QUERY_KEY,
    queryFn: fetchTle,
    staleTime: TLE_STALE_TIME_MS,
    retry: TLE_QUERY_RETRIES,
  });

  return {
    ...query,
    /** Los elementos, o `undefined` mientras no hayan llegado. */
    elementos: query.data?.elementos,
    /** Si el servidor está sirviendo un dato que no pudo actualizar. */
    esObsoleto: query.data?.stale === true,
    /** Antigüedad de los elementos en el momento en que los sirvió el BFF. */
    edadMs: query.data?.edadMs,
  };
}
