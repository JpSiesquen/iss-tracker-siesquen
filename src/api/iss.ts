import { z } from 'zod';

/**
 * Cliente de la API de posición de la ISS.
 *
 * Este archivo es la ÚNICA parte del proyecto que sabe de dónde salen los
 * datos. Los componentes piden `fetchIssPosition()` y reciben un objeto
 * validado; no saben si detrás hay una API pública, un BFF propio o un mock.
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
 * Esquema de la respuesta de la API.
 *
 * ⚠️ La diferencia con una `interface` de TypeScript no es estilística. Los
 * tipos de TS **desaparecen al compilar**: no queda nada de ellos en el
 * JavaScript que corre en el navegador. Sirven para que el compilador te avise
 * mientras escribes, y ahí se acaba su trabajo.
 *
 * Un `as IssPosition` sobre lo que devuelve la red es una PROMESA tuya, no una
 * comprobación: si la API devolviera `latitude: null`, TypeScript seguiría
 * convencido de que es un number. El fallo aparecería mucho después y en otro
 * archivo — como un `NaN` en la posición del marcador, en la conversión de
 * coordenadas (#28), sin nada en el mensaje que mencione a la API.
 *
 * Un esquema de Zod SÍ existe en tiempo de ejecución y mira los datos de
 * verdad. Los tipos protegen tu código de ti; los esquemas lo protegen del
 * mundo exterior.
 *
 * Las unidades van en cada campo y no son decoración: confundir km con millas,
 * o km/h con m/s, no lanza ninguna excepción. Solo coloca el marcador en el
 * sitio equivocado, que cuesta mucho más de diagnosticar.
 */
export const issPositionSchema = z.object({
  /** Siempre "iss" para el 25544. */
  name: z.string(),

  /** NORAD ID. Coincide con el que se pidió. */
  id: z.number().int(),

  /**
   * Latitud en GRADOS decimales, norte positivo.
   *
   * El rango no es un adorno: 200 es sintácticamente un número perfectamente
   * válido y geográficamente imposible. Sin el límite pasaría la validación y
   * reventaría más adelante.
   *
   * ±90 es el rango real de la Tierra, no una tolerancia elegida: la ISS no
   * pasa de ±51.6° por la inclinación de su órbita.
   */
  latitude: z.number().min(-90).max(90),

  /** Longitud en GRADOS decimales, este positivo. */
  longitude: z.number().min(-180).max(180),

  /**
   * Altitud sobre el nivel del mar en KILÓMETROS. Ronda los 420.
   *
   * Se valida solo `positive()` y no un rango estrecho: la órbita decae unos
   * 2 km al mes y se corrige con reboosts periódicos, así que el valor se
   * mueve de verdad. Un rango apretado rechazaría datos correctos.
   */
  altitude: z.number().positive(),

  /** Velocidad en KILÓMETROS POR HORA. Ronda los 27 600 (unos 7.7 km/s). */
  velocity: z.number().positive(),

  /**
   * Si la ISS está al sol, en sombra o en penumbra.
   *
   * `enum` rechaza cualquier cadena que no sea una de las tres. Comprobado en
   * vivo: la API devuelve tanto `daylight` como `eclipsed`.
   */
  visibility: z.enum(['daylight', 'eclipsed', 'visible']),

  /**
   * Radio en KILÓMETROS del círculo de superficie terrestre visible desde la
   * estación. Ronda los 4500.
   */
  footprint: z.number().positive(),

  /** Instante de la medición, en segundos Unix (no milisegundos). */
  timestamp: z.number().int(),

  /** Fecha juliana del mismo instante. */
  daynum: z.number(),

  /** Latitud del punto subsolar, en GRADOS: dónde está el Sol en el cenit. */
  solar_lat: z.number().min(-90).max(90),

  /**
   * Longitud del punto subsolar, en GRADOS.
   *
   * ⚠️ SIN límites de ±180, a diferencia de `longitude`. Comprobado en vivo:
   * la API devuelve este campo en el rango 0-360 (se midió un 271.82), no en
   * ±180 como la longitud de la ISS. Ponerle el mismo rango que a `longitude`
   * rechazaría respuestas perfectamente válidas.
   *
   * Habrá que normalizarlo al usarlo para orientar el Sol (#77).
   */
  solar_lon: z.number(),

  /**
   * Sistema de unidades de la respuesta.
   *
   * La API acepta `?units=miles`. No lo pedimos, pero si algún día alguien
   * añadiera el parámetro sin querer, este campo lo delataría aquí en vez de
   * dejar el marcador desplazado sin explicación.
   */
  units: z.enum(['kilometers', 'miles']),
});

/**
 * El tipo se DERIVA del esquema con `z.infer`, no se escribe aparte.
 *
 * Escribir los dos a mano es duplicar la misma información en dos sitios que
 * pueden divergir en silencio: añades un campo al esquema, olvidas el tipo, y
 * el compilador no se queja porque ambos son coherentes por separado. Con
 * `infer` hay una sola fuente de verdad.
 */
export type IssPosition = z.infer<typeof issPositionSchema>;

/**
 * Pide la posición actual de la ISS y valida la respuesta.
 *
 * @throws Error si la respuesta no es 2xx, con el código de estado.
 * @throws ZodError si el cuerpo no cumple el esquema, nombrando el campo.
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

  const datos: unknown = await response.json();

  /**
   * `parse()` lanza si no valida; `safeParse()` devuelve `{ success, ... }`
   * sin lanzar. Aquí interesa que lance: en la issue #27, TanStack Query
   * captura cualquier excepción del fetcher y la expone como estado de error.
   * Gestionarlo en un solo sitio es mejor que repartir comprobaciones.
   *
   * Nótese que `datos` es `unknown`, no `any`: TypeScript no deja tocarlo
   * hasta que Zod confirme qué es. Lo que sale de `parse` ya está tipado.
   */
  return issPositionSchema.parse(datos);
}
