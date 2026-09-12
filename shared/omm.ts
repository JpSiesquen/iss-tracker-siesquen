import { z } from 'zod';

/**
 * Esquema compartido de los elementos orbitales en formato OMM.
 *
 * Se ejecuta en dos fronteras independientes: el BFF valida lo que recibe de
 * Celestrak y el cliente valida lo que recibe del BFF. Compartir la definición
 * evita que sus campos o rangos físicos diverjan sin acoplar `api/` con `src/`.
 *
 * Los campos son los que necesita `json2satrec` y los que exige su tipo OMM.
 * Un conjunto malformado es peor que ninguno: satellite.js puede propagar
 * valores físicamente imposibles sin lanzar un error.
 */
export const ommSchema = z.object({
  /** Nombre del objeto. Informativo, pero si falta algo va mal. */
  OBJECT_NAME: z.string().min(1),

  /** Designador internacional COSPAR. Para la ISS, `1998-067A`. */
  OBJECT_ID: z.string().min(1),

  /** Número de conjunto de elementos. */
  ELEMENT_SET_NO: z.number().int(),

  /** Instante de los elementos. Celestrak lo expresa en UTC sin sufijo `Z`. */
  EPOCH: z.string().min(1),

  /** Identificador del catálogo NORAD. Para la ISS, 25544. */
  NORAD_CAT_ID: z.number().int().positive(),

  /** Vueltas por día. El rango cubre toda la órbita terrestre baja. */
  MEAN_MOTION: z.number().positive().max(20),

  /** Excentricidad: 0 es un círculo perfecto y 1 una parábola. */
  ECCENTRICITY: z.number().min(0).lt(1),

  /** Inclinación del plano orbital en grados. */
  INCLINATION: z.number().min(0).max(180),

  /** Ascensión recta del nodo ascendente, en grados. */
  RA_OF_ASC_NODE: z.number().min(0).max(360),

  /** Argumento del perigeo, en grados. */
  ARG_OF_PERICENTER: z.number().min(0).max(360),

  /** Anomalía media, en grados. */
  MEAN_ANOMALY: z.number().min(0).max(360),

  /** Coeficiente de frenado atmosférico; puede ser negativo. */
  BSTAR: z.number(),

  /** Primera derivada del movimiento medio. */
  MEAN_MOTION_DOT: z.number(),

  /** Segunda derivada del movimiento medio. */
  MEAN_MOTION_DDOT: z.number(),
});

export type Omm = z.infer<typeof ommSchema>;
