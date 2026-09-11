import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { DirectionalLight } from 'three';

import { useSceneTime } from './sceneTime';
import { AMBIENT_INTENSITY, SUN_DISTANCE, SUN_INTENSITY } from './constants';

/**
 * La iluminación de la escena.
 *
 * ## El Sol está donde está de verdad
 *
 * Hasta la issue #77 la luz vivía en una posición inventada, `[5, 3, 5]`. Ahora
 * se calcula a partir de la fecha y la hora, así que **la zona iluminada del
 * globo es la de este momento**.
 *
 * Eso convierte el terminador en un dato en lugar de un efecto: se puede mirar
 * si la ISS pasa por el lado diurno o nocturno y que sea verdad.
 *
 * Y desaparece un artefacto que se notaba: con la luz fija había una cara del
 * planeta permanentemente en sombra mientras el globo giraba por debajo.
 *
 * ## Una sola dirección para la luz y el material terrestre
 *
 * `useSceneTime` entrega la dirección solar ya convertida a coordenadas de la
 * escena. Este componente la usa para la luz y `Earth` pasa el mismo objeto al
 * shader que apaga las ciudades de día. No pueden desalinearse porque no hay
 * un segundo cálculo independiente.
 */
export function Lights() {
  const luzRef = useRef<DirectionalLight>(null);
  const tiempo = useSceneTime();

  useFrame(() => {
    if (luzRef.current) {
      luzRef.current.position
        .copy(tiempo.current.sunDirection)
        .multiplyScalar(SUN_DISTANCE);
    }
  });

  return (
    <>
      {/* Una esfera iluminada por una luz direccional tiene, por pura
          geometría, una mitad iluminada y otra en sombra con un degradado
          entre ambas: ese degradado ES el terminador terrestre. No hay que
          programar ningún ciclo día/noche. */}
      <directionalLight ref={luzRef} intensity={SUN_INTENSITY} />

      {/* Fuera del grupo: la luz ambiente no tiene dirección, así que rotarla
          no significaría nada. */}
      <ambientLight intensity={AMBIENT_INTENSITY} />
    </>
  );
}
