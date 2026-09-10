/**
 * Cliente de la API de posición de la ISS.
 *
 * Este archivo es la ÚNICA parte del proyecto que sabe de dónde salen los
 * datos. Los componentes piden `fetchIssPosition()` y reciben un objeto
 * tipado; no saben si detrás hay una API pública, un BFF propio o un mock.
 *
 * Eso no es purismo: en la Fase 4 la URL cambia por la de nuestra función
 * serverless, y el cambio se agota en este archivo.
 */

/**
 * NORAD ID de la ISS: el identificador del catálogo de objetos en órbita del
 * 18th Space Defense Squadron de EE. UU.
 *
 * Volverá a aparecer en la Fase 4 al pedir los TLE a Celestrak: es el mismo
 * número en todo el ecosistema de seguimiento satelital.
 */
export const ISS_NORAD_ID = 25544;

/** Raíz de la API. Sin clave de acceso: la URL es todo lo que hace falta. */
const API_BASE = 'https://api.wheretheiss.at/v1/satellites';

/**
 * Posición instantánea de la ISS.
 *
 * ⚠️ Las unidades van en los comentarios y no son decoración. Confundir km con
 * millas, o km/h con m/s, produce un error que no rompe nada: el marcador
 * simplemente aparece en el sitio equivocado, y eso cuesta mucho más de
 * diagnosticar que una excepción.
 */
export interface IssPosition {
  /** Siempre "iss" para el 25544. */
  name: string;
  /** NORAD ID. Coincide con el que se pidió. */
  id: number;
  /** Latitud en GRADOS decimales. Norte positivo, rango [-90, 90]. */
  latitude: number;
  /** Longitud en GRADOS decimales. Este positivo, rango [-180, 180]. */
  longitude: number;
  /** Altitud sobre el nivel del mar en KILÓMETROS. Ronda los 420. */
  altitude: number;
  /** Velocidad en KILÓMETROS POR HORA. Ronda los 27 600 (unos 7.7 km/s). */
  velocity: number;
  /** Si la ISS está al sol, en sombra o en penumbra. */
  visibility: 'daylight' | 'eclipsed' | 'visible';
  /**
   * Radio en KILÓMETROS del círculo de superficie terrestre visible desde la
   * estación. Ronda los 4500.
   */
  footprint: number;
  /** Instante de la medición, en segundos Unix (no milisegundos). */
  timestamp: number;
  /** Fecha juliana del mismo instante. */
  daynum: number;
  /** Latitud del punto subsolar, en GRADOS: dónde está el Sol en el cenit. */
  solar_lat: number;
  /** Longitud del punto subsolar, en GRADOS. */
  solar_lon: number;
  /** Sistema de unidades de la respuesta. Se pide siempre en kilómetros. */
  units: 'kilometers' | 'miles';
}

/**
 * Pide la posición actual de la ISS.
 *
 * @throws Error si la respuesta no es 2xx, con el código de estado en el
 *         mensaje.
 */
export async function fetchIssPosition(): Promise<IssPosition> {
  const response = await fetch(`${API_BASE}/${ISS_NORAD_ID}`);

  /**
   * ⚠️ `fetch` NO rechaza la promesa en un 404 ni en un 500. Solo falla si la
   * red falla: sin conexión, DNS caído, CORS bloqueado. Un error del servidor
   * llega como una respuesta perfectamente normal cuyo `ok` es false.
   *
   * Sin esta comprobación, `response.json()` intentaría parsear la página de
   * error del servidor y el fallo aparecería como un SyntaxError de JSON,
   * apuntando al sitio equivocado.
   */
  if (!response.ok) {
    throw new Error(
      `La API de la ISS respondió ${response.status} ${response.statusText}`,
    );
  }

  /**
   * `json()` devuelve `any`: TypeScript no puede saber qué manda un servidor
   * remoto, así que aquí solo estamos PROMETIENDO la forma, no comprobándola.
   * Si la API cambiara un campo, el tipo seguiría diciendo que todo va bien.
   *
   * Esa grieta es justo lo que cierra la issue #26 con Zod, validando la
   * respuesta en tiempo de ejecución.
   */
  return response.json() as Promise<IssPosition>;
}
