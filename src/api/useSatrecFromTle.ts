import { useMemo } from 'react';
import type { SatRec } from 'satellite.js';

import { useTle } from './useTle';
import { createSatrec } from '../lib/orbit';

/**
 * El propagador SGP4, construido a partir de los elementos orbitales del BFF.
 *
 * ## Por qué es un hook y no se crea donde se usa
 *
 * Lo necesitan dos componentes —el marcador y la traza— y debe ser **el
 * mismo**: si cada uno construyera el suyo, una traza calculada con un
 * propagador y un marcador con otro podrían divergir si llegaran elementos
 * nuevos entre medias.
 *
 * Compartirlo hace que pasar por el mismo punto no sea una coincidencia
 * afortunada, sino una consecuencia estructural.
 *
 * ## Por qué useMemo
 *
 * Inicializar un `satrec` es caro: SGP4 precalcula constantes a partir de los
 * elementos. Solo cambia cuando el BFF sirve elementos nuevos, cada seis horas.
 * Rehacerlo en cada render sería trabajo tirado.
 *
 * @returns El propagador, o `null` mientras no haya elementos o si no son
 *          utilizables.
 */
export function useSatrecFromTle(): SatRec | null {
  const { elementos } = useTle();
  return useMemo(() => (elementos ? createSatrec(elementos) : null), [elementos]);
}
