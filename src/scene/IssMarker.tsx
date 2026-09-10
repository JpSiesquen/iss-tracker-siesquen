import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { gstime } from 'satellite.js';
import type { Group } from 'three';

import { useIssPosition } from '../api/useIssPosition';
import { altitudeToRadius, latLonToVector3 } from '../lib/coordinates';
import {
  ISS_MARKER_COLOR,
  ISS_MARKER_EMISSIVE_INTENSITY,
  ISS_MARKER_SIZE,
} from './constants';

/**
 * El marcador de la ISS sobre el globo.
 *
 * Aquí converge todo lo anterior: los datos llegan de la API (#25) validados
 * por Zod (#26) y refrescados por Query (#27), y la conversión de #28 los
 * traduce a un punto del espacio.
 *
 * ## Dónde va en la jerarquía, y por qué
 *
 * Dentro del `<group>` de inclinación axial, pero NO dentro del mesh que rota.
 * Son dos cosas distintas y conviene no mezclarlas:
 *
 *   - **Hereda la inclinación** porque el eje inclinado afecta a todo el
 *     sistema Tierra-satélite por igual.
 *   - **No hereda la rotación diaria como hijo**, porque la ISS no está pegada
 *     a la superficie: orbita por su cuenta.
 *
 * ⚠️ Pero eso NO significa que se ignore la rotación terrestre. Ver abajo.
 */
export function IssMarker() {
  const grupoRef = useRef<Group>(null);
  const { data } = useIssPosition();

  /**
   * La posición en el sistema fijo a la Tierra (ECEF), antes de rotar.
   *
   * `useMemo` porque solo cambia cuando llegan datos nuevos —cada cinco
   * segundos—, mientras que el fotograma se dibuja sesenta veces por segundo.
   * Recalcular trigonometría 60 veces por segundo para un valor que cambia
   * cada 5 s es trabajo tirado.
   */
  const posicionEcef = useMemo(() => {
    if (!data) return null;
    return latLonToVector3(
      data.latitude,
      data.longitude,
      altitudeToRadius(data.altitude),
    );
  }, [data]);

  /**
   * La rotación terrestre, aplicada al vector en cada fotograma.
   *
   * ## Por qué hace falta, si el marcador no es hijo del mesh que rota
   *
   * La lat/lon de la API está en **ECEF**: un sistema que gira CON la Tierra,
   * donde la longitud se mide desde Greenwich. Pero Greenwich no está quieto
   * en la escena — el mesh lo lleva rotando `gstime()` radianes.
   *
   * Así que el vector de la conversión apunta a «donde estaría Greenwich si la
   * Tierra no hubiera girado», y hay que llevarlo a donde está de verdad.
   *
   * ⚠️ Medido, no supuesto: sin esta rotación el marcador aparece a **89.5°**
   * del punto correcto, casi **10 000 km** sobre el ecuador. Se comprobó
   * colocando una ISS ficticia en las coordenadas de Lima y midiendo el ángulo
   * contra el marcador de depuración de Lima, que sí es hijo del mesh y cuya
   * posición ya se verificó en #28. Con la rotación: 0.0° de diferencia.
   *
   * ## Por qué en useFrame y no una sola vez
   *
   * El GMST avanza continuamente. Si se aplicara solo al llegar cada dato, el
   * marcador se quedaría clavado mientras la Tierra sigue girando bajo él,
   * derivando visiblemente durante esos cinco segundos.
   *
   * Nótese que la Tierra y la ISS leen `gstime(new Date())` por separado en el
   * mismo fotograma: al derivar ambas del reloj no pueden desincronizarse.
   */
  useFrame(() => {
    if (grupoRef.current) {
      grupoRef.current.rotation.y = gstime(new Date());
    }
  });

  // Mientras no haya datos no se dibuja nada. El indicador de carga visible es
  // la issue #31; aquí basta con no renderizar un marcador en (0,0,0), que es
  // el centro de la Tierra.
  if (!posicionEcef) return null;

  return (
    /* El grupo existe para separar responsabilidades: la rotación terrestre va
       en el grupo, la posición orbital en el mesh. Mezclarlas obligaría a
       recalcular el vector rotado en cada fotograma en lugar de dejar que lo
       haga la matriz de transformación, que es justo para lo que está. */
    <group ref={grupoRef}>
      <mesh position={posicionEcef}>
        <sphereGeometry args={[ISS_MARKER_SIZE, 16, 16]} />
        {/* Emisivo para que se vea igual sobre el lado nocturno que sobre el
            diurno. Un marcador que desaparece media órbita no sirve. */}
        <meshStandardMaterial
          color={ISS_MARKER_COLOR}
          emissive={ISS_MARKER_COLOR}
          emissiveIntensity={ISS_MARKER_EMISSIVE_INTENSITY}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
