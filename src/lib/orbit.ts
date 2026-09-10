import {
  degreesLat,
  degreesLong,
  eciToGeodetic,
  gstime,
  json2satrec,
  propagate,
  type SatRec,
} from 'satellite.js';

import type { OrbitalElements } from '../api/tle';

/**
 * Propagación orbital: dónde está la ISS en un instante dado.
 *
 * Hasta aquí el proyecto mostraba una posición ajena. A partir de este archivo
 * la calcula.
 *
 * ## Qué es SGP4
 *
 * *Simplified General Perturbations 4*: el modelo estándar para propagar la
 * órbita de un objeto en órbita terrestre baja. Es el que usa el propio
 * catálogo espacial de EE. UU.
 *
 * No es geometría de órbitas ideales. Una elipse kepleriana pura predeciría
 * mal en horas: SGP4 tiene en cuenta que la Tierra está achatada por los polos,
 * el rozamiento atmosférico residual —a 420 km todavía hay aire suficiente para
 * frenar la estación— y otras perturbaciones. Por eso unos elementos de hoy
 * predicen bien unos días y se degradan después.
 *
 * No lo implementamos: `satellite.js` es una traducción del código de
 * referencia.
 *
 * ## ECI y ECEF: por qué hay que convertir
 *
 * Es el punto que más confunde, y entenderlo explica media issue:
 *
 *   **ECI** (*Earth-Centered Inertial*) — sistema fijo respecto a las
 *   estrellas. La Tierra gira DENTRO de él. SGP4 calcula aquí, porque las
 *   leyes orbitales son simples en un sistema que no rota.
 *
 *   **Geodético** — latitud y longitud, un sistema que gira CON la Tierra.
 *
 * Un satélite quieto en ECI sobrevuela países distintos según pasa el tiempo,
 * porque el planeta gira debajo. Convertir de uno a otro exige saber **cuánto
 * ha girado la Tierra**, y eso es el GMST.
 *
 * ⚠️ **El error clásico:** usar el GMST de un instante distinto al de la
 * propagación. Produce una posición desplazada en longitud de forma
 * consistente — plausible a la vista, y muy difícil de detectar. Por eso este
 * módulo recibe UNA fecha y la usa para las dos cosas.
 */

/** Latitud y longitud en GRADOS; altitud en KILÓMETROS sobre el nivel del mar. */
export interface GeodeticPosition {
  /** Grados, norte positivo. */
  latitude: number;
  /** Grados, este positivo. */
  longitude: number;
  /** Kilómetros sobre el nivel del mar. Para la ISS, ~420. */
  altitude: number;
  /** Velocidad respecto al centro de la Tierra, en km/s. Para la ISS, ~7.66. */
  speed: number;
}

/**
 * Construye el propagador a partir de los elementos orbitales.
 *
 * El `satrec` es un objeto pesado de inicializar —SGP4 precalcula constantes a
 * partir de los elementos— y solo cambia cuando llegan elementos nuevos, cada
 * seis horas. Conviene crearlo una vez y reutilizarlo en cada fotograma, no al
 * revés.
 *
 * @returns El propagador, o `null` si los elementos no son utilizables.
 */
export function createSatrec(elementos: OrbitalElements): SatRec | null {
  const satrec = json2satrec(elementos);

  /**
   * ⚠️ `json2satrec` no lanza excepciones: informa por `error`. Un valor
   * distinto de 0 significa que SGP4 no pudo inicializarse — órbita
   * decaída, excentricidad fuera de rango, elementos incoherentes.
   *
   * Comprobarlo importa porque la alternativa es peor que un fallo: la
   * librería seguiría devolviendo posiciones de aspecto normal.
   */
  return satrec.error === 0 ? satrec : null;
}

/**
 * Calcula dónde está el satélite en un instante dado.
 *
 * @param satrec El propagador de `createSatrec`.
 * @param when   El instante. **La misma fecha** se usa para propagar y para
 *               calcular el GMST: son dos usos del mismo tiempo, no dos
 *               tiempos.
 * @returns Grados y kilómetros, o `null` si la propagación falla.
 */
export function propagateToGeodetic(satrec: SatRec, when: Date): GeodeticPosition | null {
  const pv = propagate(satrec, when);

  /**
   * ⚠️ `propagate` devuelve `position: false` cuando el propagador diverge
   * —típicamente al extrapolar demasiado lejos de la época de los elementos—.
   * Sin esta comprobación, `eciToGeodetic` recibiría `false`, lo trataría como
   * coordenadas y devolvería `NaN`, que se propagaría por toda la escena hasta
   * manifestarse como un marcador desaparecido sin explicación.
   */
  if (!pv?.position || !pv.velocity) return null;

  const geodetic = eciToGeodetic(pv.position, gstime(when));

  /**
   * `satellite.js` devuelve RADIANES para latitud y longitud, y kilómetros
   * para la altura. `degreesLat` y `degreesLong` convierten.
   *
   * ⚠️ La conversión no es opcional: `latLonToVector3` espera grados, y
   * pasarle radianes daría una posición perfectamente plausible y
   * completamente equivocada. Es el peor tipo de error — el que no rompe nada.
   */
  return {
    latitude: degreesLat(geodetic.latitude),
    longitude: degreesLong(geodetic.longitude),
    altitude: geodetic.height,
    /** El módulo del vector velocidad, que viene en km/s por componente. */
    speed: Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z),
  };
}
