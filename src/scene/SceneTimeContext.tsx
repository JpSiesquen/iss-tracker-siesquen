import type { ReactNode } from 'react';

import { SceneTimeContext } from './sceneTime';
import { useSceneTimeSource } from './useSceneTime';

/**
 * Calcula el instante de la escena una vez por fotograma y lo reparte.
 *
 * Debe envolver a la Tierra y al marcador. El hook fuente usa prioridad de
 * fotograma negativa para que ambos lean un valor ya actualizado, sin depender
 * del orden en que `Suspense` haya registrado los callbacks.
 */
export function SceneTimeProvider({ children }: { children: ReactNode }) {
  const ref = useSceneTimeSource();
  return <SceneTimeContext value={ref}>{children}</SceneTimeContext>;
}
