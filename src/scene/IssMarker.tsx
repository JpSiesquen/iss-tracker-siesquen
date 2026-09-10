import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { gstime } from 'satellite.js';
import type { Group, Mesh } from 'three';

import { useIssPosition } from '../api/useIssPosition';
import { altitudeToRadius, latLonToVector3 } from '../lib/coordinates';
import {
  ISS_MARKER_COLOR,
  ISS_MARKER_EMISSIVE_INTENSITY,
  ISS_MARKER_SIZE,
  ISS_SMOOTHING,
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
  const meshRef = useRef<Mesh>(null);
  const { data } = useIssPosition();

  /**
   * Si ya se colocó el marcador alguna vez.
   *
   * ⚠️ Sin esto, el primer dato haría que el marcador saliera volando desde el
   * origen: un mesh recién creado está en (0,0,0), que es el centro de la
   * Tierra, y la interpolación lo traería desde ahí atravesando el planeta.
   * El primer dato se asigna de golpe; a partir del segundo se interpola.
   */
  const colocado = useRef(false);

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
  useFrame((_estado, delta) => {
    if (grupoRef.current) {
      grupoRef.current.rotation.y = gstime(new Date());
    }

    const mesh = meshRef.current;
    if (!mesh || !posicionEcef) return;

    // El primer dato se asigna directamente: interpolar desde (0,0,0) sacaría
    // al marcador del centro de la Tierra atravesando el planeta.
    if (!colocado.current) {
      mesh.position.copy(posicionEcef);
      colocado.current = true;
      return;
    }

    /**
     * Interpolación exponencial hacia el objetivo.
     *
     * ⚠️ `delta * factor`, nunca un valor fijo por fotograma: atarlo al
     * framerate haría que el marcador se moviera al doble de velocidad en un
     * equipo de 120 Hz. Es el mismo principio que se demostró en la Fase 0.
     *
     * `Math.min(1, ...)` evita pasarse del objetivo si un fotograma tarda
     * mucho —una pestaña que vuelve del segundo plano puede dar un delta de
     * varios segundos—, lo que produciría una oscilación.
     */
    const alpha = Math.min(1, delta * ISS_SMOOTHING);
    mesh.position.lerp(posicionEcef, alpha);

    /**
     * Devolver el punto a la esfera.
     *
     * `lerp` traza una LÍNEA RECTA entre dos puntos, así que el trayecto pasa
     * por el interior de la esfera y el marcador se hunde ligeramente. Medido:
     * con los 0.55° que la ISS recorre en cinco segundos el hundimiento es de
     * 0.0046 px — invisible.
     *
     * Pero si la conexión se corta y el hueco crece, deja de serlo: a 300 s
     * son 5.8 px. Normalizar cuesta una raíz cuadrada por fotograma, así que
     * se hace siempre y el caso raro queda cubierto sin pensar más en él.
     */
    mesh.position.normalize().multiplyScalar(posicionEcef.length());
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
      {/* La posición NO se pasa como prop: la controla useFrame interpolando.
          Darle una prop position haría que React la reescribiera en cada
          render con el valor de golpe, anulando el suavizado. */}
      <mesh ref={meshRef}>
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
