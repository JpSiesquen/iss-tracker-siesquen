import { OrbitControls } from '@react-three/drei';

import { useUiStore } from '../store/ui';

import { CAMERA_MAX_DISTANCE, CAMERA_MIN_DISTANCE } from './constants';

/**
 * Controles de cámara: arrastrar para orbitar, rueda o pellizco para acercar.
 *
 * ⚠️ El nombre confunde: OrbitControls NO mueve el globo, mueve la CÁMARA. La
 * cámara orbita alrededor de un punto (el origen) manteniendo la distancia,
 * como un satélite. Que el globo parezca girar es efecto de la perspectiva.
 *
 * La distinción importa: en la Fase 3, al colocar la ISS en coordenadas del
 * mundo, el globo seguirá exactamente donde estaba.
 */
export function Controls() {
  const rotacionAutomatica = useUiStore((s) => s.rotacionAutomatica);

  return (
    <OrbitControls
      // Sin desplazamiento lateral: en un visor de planeta solo sirve para
      // perderse. Que el globo esté siempre centrado es lo correcto aquí.
      enablePan={false}
      /* Giro lento y continuo. Apagado por defecto: queda bien en una
         captura, pero molesta en cuanto alguien intenta mirar una zona
         concreta. */
      autoRotate={rotacionAutomatica}
      autoRotateSpeed={0.4}
      // Límites de zoom. Sin ellos se puede entrar dentro de la Tierra
      // (radio 1) o alejarse hasta perderla de vista.
      minDistance={CAMERA_MIN_DISTANCE}
      maxDistance={CAMERA_MAX_DISTANCE}
      // Inercia al soltar: el movimiento se frena de forma progresiva en vez
      // de pararse en seco. Es la diferencia entre sentir el globo pesado o
      // sentirlo de plástico.
      //
      // En Three.js puro esto exigiría llamar a controls.update() en cada
      // fotograma; drei lo hace por nosotros.
      enableDamping
      dampingFactor={0.05}
      // Por defecto la rotación se siente brusca para un objeto de este
      // tamaño en pantalla.
      rotateSpeed={0.4}
      zoomSpeed={0.8}
    />
  );
}
