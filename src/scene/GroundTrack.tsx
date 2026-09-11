import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type { SatRec } from 'satellite.js';

import { buildGroundTrack, TRACK_REFRESH_MS } from '../lib/groundTrack';
import { useSceneTime } from './sceneTime';
import {
  TRACK_FUTURE_COLOR,
  TRACK_FUTURE_OPACITY,
  TRACK_LINE_WIDTH,
  TRACK_PAST_COLOR,
  TRACK_PAST_OPACITY,
} from './constants';

/**
 * La traza orbital: dónde ha estado la ISS y por dónde va a pasar.
 *
 * Es lo que convierte un punto en una órbita.
 *
 * ## Por qué no se recalcula en cada fotograma
 *
 * ⚠️ Cada traza son 91 propagaciones SGP4. A 60 fps serían **5460 por
 * segundo**, y la página se arrastraría.
 *
 * Y no haría falta: la órbita cambia despacio. En los 30 segundos entre
 * recálculos la estación avanza 230 km sobre una traza que cubre 44 000 — un
 * 0.5%. El marcador sí se mueve en cada fotograma, porque esa es la parte que
 * se percibe; la línea de fondo puede ir a otro ritmo.
 *
 * ## Por qué estado y no un ref
 *
 * Al revés que el tiempo de la escena. Los puntos de la traza tienen que
 * llegar a `<Line>`, que es un componente de React: para que se redibuje hace
 * falta un render, y eso exige estado.
 *
 * Es aceptable porque ocurre dos veces por minuto, no sesenta por segundo.
 */
export function GroundTrack({ satrec }: { satrec: SatRec }) {
  const tiempo = useSceneTime();

  const [traza, setTraza] = useState(() => buildGroundTrack(satrec, tiempo.current.date));

  /** Cuándo se calculó la traza que está en pantalla. */
  const calculadoEn = useRef(tiempo.current.date.getTime());

  useFrame(() => {
    const { date } = tiempo.current;

    if (date.getTime() - calculadoEn.current < TRACK_REFRESH_MS) return;
    calculadoEn.current = date.getTime();
    setTraza(buildGroundTrack(satrec, date));
  });

  return (
    <>
      {/* Dos líneas y no una: la diferencia de color y opacidad es lo que
          comunica la dirección del movimiento, sin necesidad de flechas. */}
      {traza.past.length > 1 && (
        <Line
          points={traza.past}
          color={TRACK_PAST_COLOR}
          lineWidth={TRACK_LINE_WIDTH}
          transparent
          opacity={TRACK_PAST_OPACITY}
        />
      )}

      {traza.future.length > 1 && (
        <Line
          points={traza.future}
          color={TRACK_FUTURE_COLOR}
          lineWidth={TRACK_LINE_WIDTH}
          transparent
          opacity={TRACK_FUTURE_OPACITY}
        />
      )}
    </>
  );
}
