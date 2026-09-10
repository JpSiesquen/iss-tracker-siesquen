import { z } from 'zod';

/**
 * Cliente de los datos orbitales, servidos por nuestro propio BFF.
 *
 * ## Por qué el navegador no llama a Celestrak directamente
 *
 * Es la lección de la Fase 4. Un frontend que habla con servicios externos
 * tiene cuatro problemas que un BFF resuelve de golpe:
 *
 *   1. **CORS** — muchos servicios no permiten peticiones desde el navegador.
 *   2. **Caché** — no se puede cachear en una CDN lo que pide cada navegador
 *      por su cuenta. Con el BFF, mil visitantes generan una descarga.
 *   3. **Credenciales** — una clave de API en el cliente es una clave pública.
 *      Aquí no aplica porque Celestrak no pide ninguna, pero es la razón
 *      número uno en proyectos reales.
 *   4. **Acoplamiento** — si el proveedor cambia su formato, se toca un
 *      archivo del servidor en vez de repartir cambios por la interfaz.
 *
 * Este archivo no menciona Celestrak en ninguna parte. El navegador no sabe
 * que existe.
 */

/**
 * Ruta RELATIVA, no una URL absoluta.
 *
 * El endpoint vive en el mismo origen que la página, así que `/api/tle`
 * funciona igual en local, en una preview y en producción. Una URL absoluta
 * apuntaría siempre a producción — incluso desde el servidor de desarrollo,
 * que es justo lo que no se quiere al probar un cambio del BFF.
 */
const TLE_ENDPOINT = '/api/tle';

/**
 * Esquema de lo que devuelve el BFF.
 *
 * ⚠️ El servidor ya valida los elementos con este mismo rigor (`api/_omm.ts`),
 * así que esto puede parecer redundante. No lo es: son dos fronteras distintas.
 * El servidor se protege de Celestrak; el cliente se protege de recibir algo
 * inesperado —una versión desplegada a medias, un proxy que reescribe, una
 * respuesta de error servida como 200— sin que el fallo aparezca tres capas
 * más abajo como un `NaN`.
 */
export const tleResponseSchema = z.object({
  /**
   * Los elementos orbitales en formato OMM, tal como los consume
   * `json2satrec` de satellite.js en la issue #37.
   *
   * Se valida el subconjunto que decide si la órbita es propagable; los rangos
   * son los mismos que aplica el servidor porque describen qué es físicamente
   * posible, no una preferencia.
   */
  elementos: z.object({
    OBJECT_NAME: z.string().min(1),
    /** Obligatorios en el estándar OMM: el tipo de satellite.js los exige. */
    OBJECT_ID: z.string().min(1),
    ELEMENT_SET_NO: z.number().int(),
    EPOCH: z.string().min(1),
    NORAD_CAT_ID: z.number().int().positive(),
    MEAN_MOTION: z.number().positive().max(20),
    ECCENTRICITY: z.number().min(0).lt(1),
    INCLINATION: z.number().min(0).max(180),
    RA_OF_ASC_NODE: z.number().min(0).max(360),
    ARG_OF_PERICENTER: z.number().min(0).max(360),
    MEAN_ANOMALY: z.number().min(0).max(360),
    BSTAR: z.number(),
    MEAN_MOTION_DOT: z.number(),
    MEAN_MOTION_DDOT: z.number(),
  }),

  /** Cuándo descargó el servidor estos elementos, en milisegundos Unix. */
  descargadoEn: z.number().int(),

  /** Antigüedad del dato en el momento de servirlo. */
  edadMs: z.number().int().nonnegative(),

  /** De dónde salieron. */
  fuente: z.string(),

  /**
   * Solo presente cuando el servidor no pudo actualizar y está sirviendo el
   * último dato conocido.
   *
   * ⚠️ Opcional, no `boolean` a secas: comprobado contra el endpoint real, el
   * campo **está ausente** cuando todo va bien, no en `false`. Exigirlo haría
   * fallar la validación en el caso normal.
   */
  stale: z.boolean().optional(),

  /** Explicación legible que acompaña a `stale`. */
  aviso: z.string().optional(),
});

export type TleResponse = z.infer<typeof tleResponseSchema>;
export type OrbitalElements = TleResponse['elementos'];

/**
 * Pide los elementos orbitales al BFF.
 *
 * @throws Error si la respuesta no es 2xx.
 * @throws ZodError si el cuerpo no cumple el esquema.
 */
export async function fetchTle(): Promise<TleResponse> {
  const response = await fetch(TLE_ENDPOINT);

  /**
   * `fetch` no rechaza la promesa en un 404 ni en un 500: solo si falla la
   * red. El BFF devuelve 502 cuando Celestrak falla y no hay dato previo que
   * servir, y sin esta comprobación se intentaría parsear ese error como si
   * fueran datos orbitales.
   */
  if (!response.ok) {
    throw new Error(`El servicio de datos orbitales respondió ${response.status}`);
  }

  const datos: unknown = await response.json();
  return tleResponseSchema.parse(datos);
}
