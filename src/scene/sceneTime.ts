import { createContext, useContext, type RefObject } from 'react';

import type { SceneTime } from './useSceneTime';

/**
 * Reparte el instante de la escena a quien lo necesite.
 *
 * ⚠️ Lo que viaja por el contexto es el **ref**, no su contenido. Si fuera el
 * valor, cambiarlo sesenta veces por segundo re-renderizaría a todos los
 * consumidores sesenta veces por segundo — exactamente lo que se evita en una
 * escena 3D, donde la animación se hace mutando objetos de Three.js y no
 * repintando React.
 *
 * El ref es estable: nunca cambia de identidad, así que el contexto no provoca
 * ningún render. Los consumidores lo leen dentro de su propio `useFrame`.
 *
 * Vive aparte del proveedor porque el linter avisa —con razón— de que exportar
 * hooks junto a componentes rompe el fast refresh de React.
 */
export const SceneTimeContext = createContext<RefObject<SceneTime> | null>(null);

/**
 * El instante actual de la escena.
 *
 * @throws Si se usa fuera del proveedor. Es deliberado: un tiempo por defecto
 *         silencioso escondería justo el error que este módulo evita —dos
 *         componentes leyendo instantes distintos.
 */
export function useSceneTime(): RefObject<SceneTime> {
  const ref = useContext(SceneTimeContext);
  if (!ref) {
    throw new Error('useSceneTime debe usarse dentro de <SceneTimeProvider>');
  }
  return ref;
}
