import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import type { Group } from 'three';

import { useSceneTime } from './sceneTime';

/**
 * Marco terrestre ECEF convertido a la orientación actual de la escena.
 *
 * Todo hijo expresado como latitud/longitud hereda GMST por estructura. Así,
 * añadir una capa geográfica aquí no exige recordar otra rotación manual.
 */
export function EcefFrame({ children }: { children: ReactNode }) {
  const groupRef = useRef<Group>(null);
  const time = useSceneTime();

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y = time.current.gmst;
  });

  return <group ref={groupRef}>{children}</group>;
}
