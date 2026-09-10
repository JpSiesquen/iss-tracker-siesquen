import { Canvas } from '@react-three/fiber';

import { Earth } from './Earth';
import { Lights } from './Lights';

/**
 * El <Canvas> de React Three Fiber crea por nosotros tres de las cosas que en
 * la Fase 0 se escribieron a mano (ver docs/00-threejs-basico.md):
 *
 *   - la escena          (new THREE.Scene)
 *   - una cámara         (new THREE.PerspectiveCamera, ya posicionada)
 *   - el renderer        (con su <canvas> en el DOM, el listener de resize
 *                         y el bucle de animación con requestAnimationFrame)
 *
 * Por eso el equivalente de toda la Fase 0 son unas pocas líneas. Y por eso se
 * hizo la Fase 0: sin ella, <Canvas> sería una caja negra.
 *
 * ⚠️ Dentro del <Canvas> NO se pueden usar etiquetas HTML: solo objetos de
 * Three.js. Son dos árboles de componentes que conviven —React DOM fuera, R3F
 * dentro—. El panel de telemetría de la Fase 5 irá fuera, superpuesto con CSS.
 */
export function Scene() {
  return (
    <Canvas
      // La cámara nace en el origen (0,0,0). Si un objeto estuviera también
      // ahí, quedaría dentro de él y no se vería nada. Three.js usa Y-up:
      // X a la derecha, Y arriba, Z hacia el espectador.
      camera={{ position: [0, 0, 5], fov: 60, near: 0.1, far: 1000 }}
      // Limita la densidad de píxeles. En pantallas de alta densidad el
      // navegador renderizaría a 3x, que son nueve veces más píxeles para
      // una mejora casi imperceptible. Vuelve en la issue 6-2 (rendimiento).
      dpr={[1, 2]}
      // El espacio no es gris.
      style={{ background: '#05060a' }}
    >
      <Lights />
      <Earth />
    </Canvas>
  );
}
