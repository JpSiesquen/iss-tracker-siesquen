import type { ReactNode } from 'react';

import { SceneTimeContext } from './sceneTime';
import { useSceneTimeSource } from './useSceneTime';

/**
 * Calcula el instante de la escena una vez por fotograma y lo reparte.
 *
 * Debe envolver a la Tierra y al marcador: R3F ejecuta los `useFrame` en el
 * orden en que se registraron, así que este proveedor tiene que montarse antes
 * para que ambos lean un valor ya actualizado.
 */
export function SceneTimeProvider({ children }: { children: ReactNode }) {
  const ref = useSceneTimeSource();
  return <SceneTimeContext value={ref}>{children}</SceneTimeContext>;
}
