import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { gstime } from 'satellite.js';
import { Vector3 } from 'three';

import { sunDirection as calculateSunDirection } from '../lib/sun';

/**
 * El instante, el GMST y la dirección solar, calculados una vez por fotograma.
 *
 * ## Por qué centralizar el tiempo
 *
 * La Tierra se orienta con el GMST, la órbita se propaga con la misma fecha y
 * la luz y el shader nocturno comparten una dirección solar. Si cada componente
 * hiciera estos cálculos por su cuenta, podrían representar instantes distintos.
 *
 * ⚠️ Medido: el desfase real entre dos llamadas dentro del mismo fotograma es
 * de **7 metros** a 60 fps sobre la superficie terrestre. Despreciable frente a
 * los 420 km de altura de la ISS. **Así que el motivo no es la precisión.**
 *
 * El motivo es que la fuente del tiempo sea una sola:
 *
 *   - Consistencia por construcción, no por coincidencia. Que hoy el desfase
 *     sea irrelevante no garantiza que lo siga siendo si un fotograma tarda un
 *     segundo por una recarga de texturas.
 *   - Un solo sitio donde tocar para pausar el tiempo, adelantarlo o
 *     retroceder — que es justo lo que necesitaría un control de reproducción.
 *   - `gstime()` se calcula una vez por fotograma en lugar de una por
 *     componente que lo necesite.
 *   - La luz y el límite de las ciudades nocturnas no pueden tener terminadores
 *     diferentes: ambos leen el mismo vector solar.
 *
 * ## Por qué devuelve un ref y no estado
 *
 * Escribir en un `useState` sesenta veces por segundo dispararía sesenta
 * renders de React por segundo, y el árbol de R3F no necesita re-renderizarse
 * para animar: `useFrame` muta los objetos de Three.js directamente.
 *
 * El ref es un buzón: este hook lo rellena antes de cada fotograma y los demás
 * lo leen dentro de su propio `useFrame`.
 */
export interface SceneTime {
  /** El instante de este fotograma. */
  date: Date;
  /** Cuánto ha girado la Tierra en ese instante, en radianes. */
  gmst: number;
  /** Dirección normalizada del Sol en coordenadas de la escena. */
  sunDirection: Vector3;
}

/**
 * R3F ordena los callbacks de `useFrame` de menor a mayor prioridad. La
 * fuente de tiempo debe ejecutarse antes de cada consumidor, incluso cuando
 * `Suspense` haga que los hijos se registren antes que este hook.
 *
 * Solo las prioridades positivas entregan el render manual a un callback de
 * usuario; `-1` conserva el renderizado automático del `<Canvas>`.
 */
const SCENE_TIME_FRAME_PRIORITY = -1;
const SCENE_Y_AXIS = new Vector3(0, 1, 0);

/**
 * Debe montarse **una sola vez** y por encima de quien lo consuma. La posición
 * en el árbol no basta para fijar el orden: `Suspense` puede hacer que los
 * consumidores se registren primero. La prioridad negativa asegura que esta
 * fuente se actualice antes que todos ellos en cada fotograma.
 */
export function useSceneTimeSource() {
  const ref = useRef<SceneTime>(createSceneTime());

  useFrame(() => {
    const date = new Date();
    const gmst = gstime(date);

    ref.current.date = date;
    ref.current.gmst = gmst;
    ref.current.sunDirection
      .copy(calculateSunDirection(date, 1))
      .applyAxisAngle(SCENE_Y_AXIS, gmst);
  }, SCENE_TIME_FRAME_PRIORITY);

  return ref;
}

function createSceneTime(): SceneTime {
  const date = new Date();
  const gmst = gstime(date);

  return {
    date,
    gmst,
    sunDirection: calculateSunDirection(date, 1).applyAxisAngle(SCENE_Y_AXIS, gmst),
  };
}
