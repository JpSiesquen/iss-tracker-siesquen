import { Vector3 } from 'three';

import { latLonToVector3, normalizeLongitude } from './coordinates.ts';

/**
 * Dónde está el Sol respecto a la Tierra en un instante dado.
 *
 * ## Por qué esto deja de ser decoración
 *
 * Hasta ahora la luz estaba en una posición inventada, `[5, 3, 5]`. Con el
 * cálculo real, la zona iluminada del globo es **la de este momento**: el
 * terminador pasa a ser un dato en lugar de un efecto.
 *
 * Y desaparece un artefacto que se notaba: con una luz fija, había una cara
 * del planeta permanentemente en sombra mientras giraba por debajo.
 *
 * ## Los dos ángulos que hacen falta
 *
 * La posición del Sol se reduce a un punto sobre la esfera, el **punto
 * subsolar**: el lugar donde el Sol está exactamente en el cenit.
 *
 *   **Declinación** — su latitud. Va de +23.44° en el solsticio de junio a
 *   −23.44° en el de diciembre. Es la inclinación del eje terrestre vista
 *   desde el Sol, y es lo que causa las estaciones.
 *
 *   **Ángulo horario** — su longitud. Depende de la hora UTC: el punto
 *   subsolar recorre 15° por hora hacia el oeste, dando la vuelta al planeta
 *   en un día.
 *
 * ## Precisión suficiente, no astronómica
 *
 * ⚠️ Para iluminar un globo no hace falta precisión de observatorio. Estas
 * fórmulas aproximadas tienen un error de minutos de arco; un algoritmo como
 * NOAA SPA sería desproporcionado para decidir qué píxeles se ven claros.
 *
 * Lo que sí importa es que el resultado se pueda comprobar, y se comprueba:
 * contra los solsticios, contra los equinoccios y contra el punto subsolar que
 * publica la API de posición de la ISS.
 */

/** Días entre el 1 de enero del 2000 y la época Unix, para el día juliano. */
const J2000_UNIX_MS = 946_728_000_000;

const MS_POR_DIA = 86_400_000;

/** Inclinación del eje terrestre en grados. La misma constante que la escena. */
const OBLICUIDAD = 23.4397;

const RAD = Math.PI / 180;

/**
 * Días transcurridos desde J2000.0 (1 de enero de 2000, 12:00 TT).
 *
 * Es el origen de tiempos que usan las fórmulas astronómicas modernas.
 */
function diasDesdeJ2000(date: Date): number {
  return (date.getTime() - J2000_UNIX_MS) / MS_POR_DIA;
}

/**
 * El punto subsolar: latitud y longitud sobre las que el Sol está en el cenit.
 *
 * @returns Grados. La latitud es la declinación solar; la longitud, dónde es
 *          mediodía solar en este instante.
 */
export function subsolarPoint(date: Date): {
  latitude: number;
  longitude: number;
} {
  const d = diasDesdeJ2000(date);

  /**
   * Anomalía media: dónde estaría la Tierra en su órbita si fuera circular.
   * Avanza casi un grado por día — 360° en un año.
   */
  const anomaliaMedia = (357.5291 + 0.98560028 * d) * RAD;

  /**
   * Ecuación del centro: la corrección por que la órbita es una elipse, no un
   * círculo. La Tierra va más rápido en enero (perihelio) que en julio.
   */
  const centro =
    (1.9148 * Math.sin(anomaliaMedia) +
      0.02 * Math.sin(2 * anomaliaMedia) +
      0.0003 * Math.sin(3 * anomaliaMedia)) *
    RAD;

  /** Longitud eclíptica del Sol: su posición sobre el plano de la órbita. */
  const longitudEcliptica = anomaliaMedia + centro + 102.9372 * RAD + Math.PI;

  /**
   * Declinación: se proyecta la longitud eclíptica sobre el ecuador celeste
   * usando la inclinación del eje. Es donde entra la oblicuidad, y por eso el
   * resultado oscila entre ±23.44° a lo largo del año.
   */
  const declinacion =
    Math.asin(Math.sin(OBLICUIDAD * RAD) * Math.sin(longitudEcliptica)) / RAD;

  /**
   * La longitud del punto subsolar.
   *
   * A las 12:00 UTC el Sol está sobre el meridiano de Greenwich, y se desplaza
   * 15° por hora hacia el oeste (de ahí el signo negativo).
   *
   * La ecuación del tiempo —la diferencia entre el mediodía solar real y el
   * medio— llega a 16 minutos, unos 4° de longitud. Se incluye porque es
   * barata y sin ella el terminador iría visiblemente desplazado en febrero y
   * noviembre.
   */
  const ascensionRecta =
    Math.atan2(
      Math.cos(OBLICUIDAD * RAD) * Math.sin(longitudEcliptica),
      Math.cos(longitudEcliptica),
    ) / RAD;

  /** Tiempo sidéreo aparente en Greenwich, en grados. */
  const gmstGrados = (280.16 + 360.9856235 * d) % 360;

  // Sin normalizar a [-180, 180], el punto salta al otro hemisferio.
  const longitud = normalizeLongitude(ascensionRecta - gmstGrados);

  return { latitude: declinacion, longitude: longitud };
}

/**
 * La dirección desde la que ilumina el Sol, en coordenadas de la escena.
 *
 * Reutiliza `latLonToVector3` de la issue #28: el punto subsolar es un punto
 * sobre la esfera como cualquier otro, y su dirección desde el centro es la
 * dirección de la luz.
 *
 * ⚠️ El vector va en el sistema ECEF —el que gira con la Tierra—, igual que la
 * ISS. Quien lo use tiene que aplicarle la misma rotación GMST, o el Sol
 * iluminaría el meridiano equivocado.
 *
 * @param distance Distancia a la que se coloca la luz. Para una luz
 *                 direccional solo importa la dirección, pero Three.js necesita
 *                 una posición concreta.
 */
export function sunDirection(date: Date, distance: number): Vector3 {
  const { latitude, longitude } = subsolarPoint(date);
  return latLonToVector3(latitude, longitude, distance);
}
