/**
 * Formateo de los datos que se muestran en pantalla.
 *
 * Vive aparte del componente para poder comprobarse sin renderizar nada, y
 * porque son decisiones de presentación que se repiten en varios sitios.
 */

/**
 * Los formateadores se crean UNA vez, a nivel de módulo.
 *
 * ⚠️ `Intl.NumberFormat` es caro de construir —tiene que resolver reglas de
 * localización— y barato de usar. Crearlo dentro de un componente que repinta
 * cada segundo lo construiría cada segundo.
 */
const enteroEs = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });

const dosDecimales = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Una coordenada con su hemisferio en letra.
 *
 * `12.05° S` se lee mejor que `-12.05°`, y es como lo escriben las cartas
 * náuticas. Además evita que el signo menos haga saltar el texto al cambiar de
 * hemisferio.
 *
 * ⚠️ Decimales FIJOS. Con `toFixed` variable, `7.6` y `7.66` ocupan distinto y
 * el panel tiembla. Junto a `tabular-nums` del tema, esto deja el ancho
 * completamente estable.
 */
export function formatCoordinate(
  value: number,
  positive: string,
  negative: string,
): string {
  return `${dosDecimales.format(Math.abs(value))}° ${value >= 0 ? positive : negative}`;
}

/**
 * Altitud en kilómetros, sin decimales.
 *
 * La precisión real del dato es menor que un kilómetro: mostrar decimales
 * sugeriría una exactitud que no existe, y además harían bailar la cifra.
 */
export function formatAltitude(km: number): string {
  return `${enteroEs.format(km)} km`;
}

/**
 * Velocidad en km/h, con separador de miles.
 *
 * `27.580 km/h` comunica magnitud a cualquiera. La versión en km/s va aparte
 * porque es la unidad que usa quien conoce el tema, y dice otra cosa.
 */
export function formatSpeedKmh(kms: number): string {
  return `${enteroEs.format(kms * 3600)} km/h`;
}

/** La misma velocidad en km/s, la unidad orbital habitual. */
export function formatSpeedKms(kms: number): string {
  return `${dosDecimales.format(kms)} km/s`;
}

/** Una duración en milisegundos como texto breve. */
export function formatAge(ms: number): string {
  const segundos = Math.floor(ms / 1000);
  if (segundos < 60) return `hace ${segundos} s`;

  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  return `hace ${horas} h`;
}
