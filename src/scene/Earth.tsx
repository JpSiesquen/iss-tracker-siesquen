import { EARTH_RADIUS, EARTH_SEGMENTS } from './constants';

/**
 * La Tierra. Por ahora una esfera lisa: la textura llega en la issue 2-4.
 *
 * Es la traducción a R3F de lo que en la Fase 0 se escribió a mano
 * (`sandbox/00-threejs/index.html`, secciones 4 y 5). La traducción es
 * mecánica, sin magia:
 *
 *   new THREE.Mesh(geo, mat)                  →  <mesh>
 *   new THREE.SphereGeometry(1, 64, 64)       →  <sphereGeometry args={[1, 64, 64]} />
 *   new THREE.MeshStandardMaterial({ ... })   →  <meshStandardMaterial ... />
 *   scene.add(mesh)                           →  anidar el JSX
 *
 * Cualquier clase de Three.js está disponible como etiqueta en camelCase, y
 * `args` son los argumentos del constructor en orden.
 */

export function Earth() {
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
        color="#4da3ff"
        roughness={0.8} // alto: superficie mate, como tendrá la Tierra
        metalness={0} // un planeta no es metálico
      />
    </mesh>
  );
}
