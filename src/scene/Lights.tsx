import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { DirectionalLight, Group } from 'three';

import { sunDirection } from '../lib/sun';
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
 * ## Por qué la luz va dentro de un grupo que rota
 *
 * ⚠️ El punto subsolar se calcula en lat/lon, o sea en **ECEF**: el sistema que
 * gira con la Tierra. Exactamente el mismo caso que la ISS en #29.
 *
 * Si la luz se colocara sin esa rotación, iluminaría el meridiano equivocado —y
 * el error sería consistente, difícil de detectar a ojo, porque la escena
 * seguiría teniendo un lado día y otro noche perfectamente creíbles.
 */
export function Lights() {
  const grupoRef = useRef<Group>(null);
  const luzRef = useRef<DirectionalLight>(null);
  const tiempo = useSceneTime();

  useFrame(() => {
    const { date, gmst } = tiempo.current;

    // La misma rotación que aplican la Tierra, la ISS y la traza: todo sale
    // del mismo instante y del mismo GMST.
    if (grupoRef.current) {
      grupoRef.current.rotation.y = gmst;
    }

    if (luzRef.current) {
      luzRef.current.position.copy(sunDirection(date, SUN_DISTANCE));
    }
  });

  return (
    <>
      <group ref={grupoRef}>
        {/* Una esfera iluminada por una luz direccional tiene, por pura
            geometría, una mitad iluminada y otra en sombra con un degradado
            entre ambas: ese degradado ES el terminador terrestre. No hay que
            programar ningún ciclo día/noche. */}
        <directionalLight ref={luzRef} intensity={SUN_INTENSITY} />
      </group>

      {/* Fuera del grupo: la luz ambiente no tiene dirección, así que rotarla
          no significaría nada. */}
      <ambientLight intensity={AMBIENT_INTENSITY} />
    </>
  );
}
