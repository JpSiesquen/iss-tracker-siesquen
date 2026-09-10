import { z } from 'zod';

/**
 * Esquema de los elementos orbitales que devuelve Celestrak.
 *
 * El formato es **OMM** (*Orbit Mean-Elements Message*), un estándar del CCSDS
 * que sustituye al TLE de dos líneas manteniendo los mismos datos.
 *
 * ⚠️ El prefijo `_` en el nombre del archivo importa: Vercel trata cada
 * archivo de `api/` como un endpoint, y los que empiezan por guion bajo quedan
 * excluidos. Sin él, esto respondería en `/api/omm`.
 *
 * ## Por qué validar aquí y no confiar en Celestrak
 *
 * Es el mismo argumento de la issue #26, ahora en el servidor: **un TLE
 * malformado es peor que ninguno**. `satellite.js` lo aceptaría, propagaría la
 * órbita y dibujaría una trayectoria sin sentido **sin avisar de nada**.
 *
 * Es preferible fallar que mentir.
 *
 * ## Los campos son los que `json2satrec` lee de verdad
 *
 * Comprobado en el código de `satellite.js`: usa exactamente estos once. Los
 * demás que envía Celestrak —`OBJECT_ID`, `ELEMENT_SET_NO`, `REV_AT_EPOCH`—
 * son informativos y se dejan pasar sin exigirlos.
 *
 * Los rangos no son decorativos: describen qué es físicamente posible. Un
 * valor fuera de ellos no es un dato impreciso, es un dato roto.
 */
export const ommSchema = z.object({
  /** Nombre del objeto. Informativo, pero si falta algo va mal. */
  OBJECT_NAME: z.string().min(1),

  /**
   * Designador internacional COSPAR. Para la ISS, `1998-067A`.
   *
   * ⚠️ No lo usa el cálculo, pero el tipo `OMMJsonObjectV3` de satellite.js lo
   * exige por ser obligatorio en el estándar OMM. Descartarlo aquí rompía la
   * cadena: el BFF dejaba de servirlo y `json2satrec` no aceptaba el objeto.
   */
  OBJECT_ID: z.string().min(1),

  /** Número de conjunto de elementos. Obligatorio en el estándar, igual que el anterior. */
  ELEMENT_SET_NO: z.number().int(),

  /**
   * Instante al que se refieren los elementos, en ISO 8601.
   *
   * ⚠️ Celestrak lo envía SIN zona horaria (`2026-09-10T11:11:07.892448`).
   * Es UTC, pero `new Date()` sobre una cadena así la interpreta como hora
   * local en algunos entornos. Quien lo consuma debe añadir la `Z`.
   */
  EPOCH: z.string().min(1),

  /** NORAD ID. Para la ISS, siempre 25544. */
  NORAD_CAT_ID: z.number().int().positive(),

  /**
   * Vueltas por día. La ISS da unas 15.5 (una órbita cada ~93 min).
   *
   * El rango cubre toda la órbita terrestre baja sin ser tan estrecho que
   * rechace un satélite distinto si algún día se añaden más.
   */
  MEAN_MOTION: z.number().positive().max(20),

  /** Excentricidad: 0 es un círculo perfecto, 1 una parábola. */
  ECCENTRICITY: z.number().min(0).lt(1),

  /** Inclinación del plano orbital en grados. La ISS: 51.63. */
  INCLINATION: z.number().min(0).max(180),

  /** Ascensión recta del nodo ascendente, en grados. */
  RA_OF_ASC_NODE: z.number().min(0).max(360),

  /** Argumento del perigeo, en grados. */
  ARG_OF_PERICENTER: z.number().min(0).max(360),

  /** Anomalía media, en grados. */
  MEAN_ANOMALY: z.number().min(0).max(360),

  /**
   * Coeficiente de frenado atmosférico.
   *
   * Sin rango: puede ser negativo (ocurre con órbitas que están subiendo tras
   * un reboost) y su magnitud varía mucho. Basta con que sea un número.
   */
  BSTAR: z.number(),

  /** Primera derivada del movimiento medio. */
  MEAN_MOTION_DOT: z.number(),

  /** Segunda derivada. Casi siempre 0 para la ISS. */
  MEAN_MOTION_DDOT: z.number(),
});

export type Omm = z.infer<typeof ommSchema>;
