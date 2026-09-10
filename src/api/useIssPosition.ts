import { useQuery } from '@tanstack/react-query';

import {
  ISS_QUERY_RETRIES,
  ISS_REFETCH_INTERVAL_MS,
  ISS_STALE_TIME_MS,
} from './constants';
import { fetchIssPosition } from './iss';

/**
 * Clave del dato en la caché de Query.
 *
 * No es un nombre decorativo: es el identificador por el que Query decide qué
 * peticiones son «la misma». Dos componentes que usen esta clave comparten UNA
 * sola petición y una sola copia del dato, en vez de pedir cada uno por su
 * cuenta.
 *
 * Va en un array porque las claves se componen: si algún día el hook aceptara
 * un satélite distinto, sería `['iss-position', noradId]` y Query trataría
 * cada id como un dato aparte, volviendo a pedir al cambiar. Aquí es fija.
 *
 * `as const` lo congela como tupla de literales en vez de `string[]`, que es lo
 * que permite a TypeScript comprobar las claves si más adelante se usan para
 * invalidar la caché a mano.
 */
export const ISS_POSITION_QUERY_KEY = ['iss-position'] as const;

/**
 * Posición de la ISS, refrescada sola.
 *
 * ## Por qué no un useEffect con setInterval
 *
 * La versión a mano cabe en cinco líneas y le faltan seis cosas:
 *
 *   - Estado de carga y de error, cada uno su propio useState.
 *   - Reintentos cuando la red falla.
 *   - Parar de pedir con la pestaña en segundo plano.
 *   - Cancelar la petición en vuelo al desmontar, o escribir estado sobre un
 *     componente que ya no existe.
 *   - Caché: dos componentes que quieran el dato harían dos peticiones.
 *   - Evitar condiciones de carrera cuando una respuesta lenta llega después
 *     de otra más nueva.
 *
 * Cada una es un useState más y una condición de carrera potencial. Eso es lo
 * que resuelve una librería de estado de servidor; no es azúcar sobre
 * useEffect.
 *
 * ## Los estados que devuelve
 *
 *   isPending    primera carga, todavía no hay ningún dato
 *   isFetching   se está actualizando, PERO ya hay datos anteriores
 *   isError      falló; `error` trae el detalle
 *   data         posición validada, o undefined si aún no llegó
 *
 * ⚠️ La distinción entre `isPending` e `isFetching` es la que evita un
 * parpadeo cada cinco segundos. Si la interfaz mostrara «cargando» cada vez
 * que `isFetching` es true, la pantalla parpadearía en cada refresco. Solo
 * `isPending` merece un indicador de carga a pantalla completa.
 */
export function useIssPosition() {
  return useQuery({
    queryKey: ISS_POSITION_QUERY_KEY,

    /**
     * El fetcher es la función de #25/#26 tal cual, sin adaptar. Query no sabe
     * nada de fetch ni de Zod: solo espera una promesa. Si esa promesa se
     * rechaza —por un 404 o porque Zod rechazó el cuerpo— Query lo captura y lo
     * expone como `isError`, sin try/catch repartidos por los componentes.
     */
    queryFn: fetchIssPosition,

    /**
     * Repite la petición cada 5 s y **se pausa solo cuando la pestaña deja de
     * estar visible**. Es el mismo criterio que requestAnimationFrame en la
     * Fase 0: no gastar red ni batería en algo que nadie está mirando.
     */
    refetchInterval: ISS_REFETCH_INTERVAL_MS,

    staleTime: ISS_STALE_TIME_MS,
    retry: ISS_QUERY_RETRIES,
  });
}
