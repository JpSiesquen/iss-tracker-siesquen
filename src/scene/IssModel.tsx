import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { Mesh, MeshStandardMaterial, type Material } from 'three';

import {
  ISS_MODEL_EMISSIVE_COLOR,
  ISS_MODEL_EMISSIVE_INTENSITY,
  ISS_MODEL_SCALE,
} from './constants';

/**
 * Modelo ligero de la Estación Espacial Internacional.
 *
 * `useGLTF` suspende mientras descarga el GLB. El límite de Suspense vive en
 * `IssMarker`, donde el punto emisivo puede ocupar su lugar hasta que cargue.
 */
export function IssModel() {
  const { scene } = useGLTF('/models/iss.glb');
  const model = useMemo(() => {
    const copia = scene.clone(true);

    copia.traverse((objeto) => {
      if (!(objeto instanceof Mesh)) return;

      objeto.material = Array.isArray(objeto.material)
        ? objeto.material.map(makeNightVisible)
        : makeNightVisible(objeto.material);
    });

    return copia;
  }, [scene]);

  return <primitive object={model} scale={ISS_MODEL_SCALE} dispose={null} />;
}

useGLTF.preload('/models/iss.glb');

/** Clona materiales PBR del activo antes de añadir la emisión nocturna. */
function makeNightVisible(material: Material): Material {
  if (!(material instanceof MeshStandardMaterial)) return material;

  const visibleMaterial = material.clone();
  visibleMaterial.emissive.set(ISS_MODEL_EMISSIVE_COLOR);
  visibleMaterial.emissiveIntensity = ISS_MODEL_EMISSIVE_INTENSITY;
  visibleMaterial.toneMapped = false;

  return visibleMaterial;
}
