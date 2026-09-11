import { useGLTF } from '@react-three/drei';

import { ISS_MODEL_SCALE } from './constants';

/**
 * Modelo ligero de la Estación Espacial Internacional.
 *
 * `useGLTF` suspende mientras descarga el GLB. El límite de Suspense vive en
 * `IssMarker`, donde el punto emisivo puede ocupar su lugar hasta que cargue.
 */
export function IssModel() {
  const { scene } = useGLTF('/models/iss.glb');

  return <primitive object={scene} scale={ISS_MODEL_SCALE} dispose={null} />;
}

useGLTF.preload('/models/iss.glb');
