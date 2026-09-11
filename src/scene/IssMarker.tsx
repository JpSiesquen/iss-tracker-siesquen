import { useFrame } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import type { Group } from 'three';

import { altitudeToRadius, latLonToVector3 } from '../lib/coordinates';
import { propagateToGeodetic } from '../lib/orbit';
import { GroundTrack } from './GroundTrack';
import { useSatrecFromTle } from '../api/useSatrecFromTle';
import { useUiStore } from '../store/ui';
import { useSceneTime } from './sceneTime';
import {
  ISS_MARKER_COLOR,
  ISS_MARKER_EMISSIVE_INTENSITY,
  ISS_MARKER_SIZE,
} from './constants';
import { IssModel } from './IssModel';

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
  const posicionRef = useRef<Group>(null);
  const tiempo = useSceneTime();
  const satrec = useSatrecFromTle();

  /**
   * Selector, no el store entero.
   *
   * `useUiStore((s) => s.verOrbita)` suscribe este componente SOLO a ese
   * campo: alternar el panel no lo re-renderiza. Con el store completo
   * —`useUiStore()`— cualquier cambio provocaría un render aquí.
   */
  const verOrbita = useUiStore((s) => s.verOrbita);

  /**
   * La posición se calcula EN CADA FOTOGRAMA, no cuando llegan datos.
   *
   * Este es el cambio de fondo de la issue. Antes el marcador esperaba a que
   * la API dijera dónde estaba la ISS, cada cinco segundos, y entre medias
   * interpolaba hacia el último punto conocido.
   *
   * Ahora el proyecto **calcula** la posición: con los elementos orbitales y
   * la hora, SGP4 da dónde está la estación en ese instante exacto. No hay
   * dato que esperar ni hueco que rellenar — la trayectoria es continua porque
   * se evalúa una función, no porque se suavice entre lecturas.
   *
   * Por eso desaparece la interpolación de la issue #30: ya no hay saltos que
   * disimular.
   */
  useFrame(() => {
    const { date, gmst } = tiempo.current;

    if (grupoRef.current) {
      grupoRef.current.rotation.y = gmst;
    }

    const posicion = posicionRef.current;
    if (!posicion || !satrec) return;

    /**
     * ⚠️ La misma `date` que usa la Tierra para orientarse. Propagar con un
     * instante y orientar el globo con otro produce un desfase en longitud
     * consistente y difícil de detectar — el error clásico que advertía la
     * issue.
     */
    const geo = propagateToGeodetic(satrec, date);
    if (!geo) return;

    posicion.position.copy(
      latLonToVector3(geo.latitude, geo.longitude, altitudeToRadius(geo.altitude)),
    );
    // Una esfera ocultaba la orientación. El grupo mira al centro de la Tierra
    // para que el modelo asimétrico mantenga una actitud orbital coherente.
    posicion.lookAt(0, 0, 0);
  });

  // Sin elementos orbitales no hay nada que propagar.
  if (!satrec) return null;

  return (
    <>
      {/* La traza comparte el propagador y la jerarquía del marcador: ambos
          derivan del mismo cálculo, así que pasar por el mismo punto no es una
          coincidencia afortunada sino una consecuencia estructural. */}
      {verOrbita && <GroundTrack satrec={satrec} />}

      {/* El grupo separa responsabilidades: la rotación terrestre va en el
          grupo, la posición orbital en el hijo. Mezclarlas obligaría a
          recalcular el vector rotado en cada fotograma en lugar de dejar que lo
          haga la matriz de transformación, que es justo para lo que está. */}
      <group ref={grupoRef}>
        {/* La posición NO se pasa como prop: la controla useFrame. Darle una
            prop position haría que React la reescribiera en cada render,
            anulando el cálculo del fotograma. */}
        <group ref={posicionRef}>
          <Suspense fallback={<IssMarkerFallback />}>
            <IssModel />
          </Suspense>
        </group>
      </group>
    </>
  );
}

/** Punto visible mientras el modelo GLB está descargándose. */
function IssMarkerFallback() {
  return (
    <mesh>
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
  );
}
