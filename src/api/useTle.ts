import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { ISS_AGE_TICK_MS, TLE_QUERY_RETRIES, TLE_STALE_TIME_MS } from './constants';
import { fetchTle } from './tle';

/**
 * Clave de los elementos orbitales en la caché.
 *
 * Es la única consulta de red del cliente para la órbita: la posición ya no
 * vive en Query — se propaga en local a partir de estos elementos.
 */
export const TLE_QUERY_KEY = ['tle'] as const;

/**
 * Antigüedad viva a partir de un instante Unix.
 *
 * ⚠️ No usar el `edadMs` de la respuesta del BFF para mostrarla: ese valor se
 * congela al generar el JSON y la CDN puede servir `0` durante horas. La edad
 * real es `ahora - descargadoEn`, con `ahora` avanzando cada segundo.
 *
 * `Date.now()` solo corre en el inicializador del estado y en el intervalo —
 * no durante el render — para no chocar con la regla de pureza de React.
 */
function useLiveAge(sinceMs: number | undefined): number | undefined {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (sinceMs === undefined) return;

    const id = setInterval(() => setNow(Date.now()), ISS_AGE_TICK_MS);
    return () => clearInterval(id);
  }, [sinceMs]);

  if (sinceMs === undefined) return undefined;
  return Math.max(0, now - sinceMs);
}

/**
 * Los elementos orbitales de la ISS, servidos por el BFF.
 *
 * ## Sin `refetchInterval`
 *
 * No hay temporizador: con `staleTime` de seis horas, Query sirve el dato de
 * su caché sin volver a pedirlo mientras dure la sesión. Un tracker abierto
 * toda la tarde hace **una sola** petición a `/api/tle`.
 *
 * Ese es el comportamiento correcto para un dato que se publica una o dos
 * veces al día. La posición, que cambia continuamente, se calcula con SGP4 en
 * el cliente a partir de estos elementos.
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

  const descargadoEn = query.data?.descargadoEn;
  const edadMs = useLiveAge(descargadoEn);

  return {
    ...query,
    /** Los elementos, o `undefined` mientras no hayan llegado. */
    elementos: query.data?.elementos,
    /** Si el servidor está sirviendo un dato que no pudo actualizar. */
    esObsoleto: query.data?.stale === true,
    /** Instantánea Unix en la que el BFF descargó estos elementos. */
    descargadoEn,
    /**
     * Antigüedad viva en el cliente: `Date.now() - descargadoEn`.
     *
     * No es el `edadMs` congelado del JSON (ése miente tras un HIT de CDN).
     */
    edadMs,
  };
}
