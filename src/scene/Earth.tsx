import { useTexture } from '@react-three/drei';
import { SRGBColorSpace } from 'three';

import { EARTH_RADIUS, EARTH_SEGMENTS } from './constants';

/**
 * La Tierra.
 *
 * Traducción a R3F de lo que en la Fase 0 se escribió a mano
 * (`sandbox/00-threejs/index.html`). La correspondencia es mecánica:
 *
 *   new THREE.Mesh(geo, mat)                  →  <mesh>
 *   new THREE.SphereGeometry(1, 64, 64)       →  <sphereGeometry args={[1, 64, 64]} />
 *   new THREE.MeshStandardMaterial({ ... })   →  <meshStandardMaterial ... />
 *   scene.add(mesh)                           →  anidar el JSX
 *
 * ⚠️ Este componente se SUSPENDE mientras carga la textura, así que necesita un
 * <Suspense> por encima (ver Scene.tsx). Sin él, React lanza un error.
 */
export function Earth() {
  /**
   * El segundo argumento de useTexture se ejecuta con la textura recién
   * cargada, antes de devolverla. Es el sitio correcto para configurarla:
   * mutar lo que devuelve un hook está mal visto en React y el linter lo
   * detecta (react/immutability).
   *
   * Lo que se configura aquí es el detalle que hace que un globo se vea
   * «lavado» sin motivo aparente: las texturas de color están guardadas en
   * sRGB, pero los cálculos de iluminación de Three.js trabajan en espacio
   * LINEAL. Hay que declararlo o el resultado sale mal.
   *
   * La regla: texturas de COLOR → sRGB; texturas de DATOS → lineal. Un mapa de
   * relieve o una máscara de agua no son colores, son números; esos se quedan
   * en lineal. Vuelve en la issue 2-8.
   */
  const colorMap = useTexture('/textures/earth-color.jpg', (texture) => {
    const mapa = Array.isArray(texture) ? texture[0] : texture;
    mapa.colorSpace = SRGBColorSpace;
  });

  return (
    <mesh>
      {/* La geometría y el material van DENTRO del mesh, y no es decoración de
          JSX: R3F usa la posición del hijo para saber a qué propiedad del padre
          asignarlo. Un sphereGeometry dentro de un mesh se asigna a
          mesh.geometry, y el material a mesh.material. Se llama «attach», y R3F
          lo infiere por el tipo del objeto. */}
      <sphereGeometry args={[EARTH_RADIUS, EARTH_SEGMENTS, EARTH_SEGMENTS]} />

      {/* MeshStandardMaterial SÍ obedece a la luz (PBR). Sin luces en la escena
          se vería NEGRO: un objeto que solo se ve por la luz que refleja, sin
          luz, no refleja nada. */}
      <meshStandardMaterial
        map={colorMap}
        roughness={0.8} // alto: la tierra es mate. El océano se tratará aparte en la 2-8
        metalness={0} // un planeta no es metálico
      />
    </mesh>
  );
}
