import { AMBIENT_INTENSITY, SUN_INTENSITY, SUN_POSITION } from './constants';

/**
 * La iluminación de la escena.
 *
 * Traducción de la sección 5 de `sandbox/00-threejs/index.html`:
 *
 *   new THREE.DirectionalLight(0xffffff, 3)  →  <directionalLight intensity={3} />
 *   sun.position.set(5, 3, 5)                →  position={[5, 3, 5]}
 *   new THREE.AmbientLight(0xffffff, 0.15)   →  <ambientLight intensity={0.15} />
 */
export function Lights() {
  return (
    <>
      {/* El Sol. Una esfera iluminada por una luz direccional tiene, por pura
          geometría, una mitad iluminada y otra en sombra con un degradado
          entre ambas: ese degradado ES el terminador terrestre. No hay que
          programar ningún ciclo día/noche. */}
      <directionalLight position={SUN_POSITION} intensity={SUN_INTENSITY} />

      <ambientLight intensity={AMBIENT_INTENSITY} />
    </>
  );
}
