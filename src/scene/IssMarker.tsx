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
 * Aquí converge todo lo anterior: los elementos llegan del BFF (#25) validados
 * por Zod (#26) y refrescados por Query (#27), y la conversión de #28 los
 * traduce a un punto del espacio.
 *
 * ## Dónde va en la jerarquía, y por qué
 *
 * Dentro de `EcefFrame`, junto a la Tierra y la traza. Hereda la inclinación
 * axial del grupo exterior y la rotación GMST del marco terrestre por
 * estructura: su lat/lon nace en ECEF y no hace falta volver a aplicar
 * `gstime()` al vector.
 *
 * No es hija del mesh de la Tierra: la estación no está pegada a la
 * superficie, pero sí comparte el mismo marco que gira con el planeta.
 */
export function IssMarker() {
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
   * Antes el marcador esperaba a que una API dijera dónde estaba la ISS,
   * cada cinco segundos, y entre medias interpolaba hacia el último punto
   * conocido. Eso desapareció con #37 y #30: con los elementos orbitales y la
   * hora, SGP4 da dónde está la estación en ese instante exacto. No hay dato
   * que esperar ni hueco que rellenar — la trayectoria es continua porque se
   * evalúa una función.
   */
  useFrame(() => {
    const { date } = tiempo.current;

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

      {/* La posición NO se pasa como prop: la controla useFrame. Darle una
          prop position haría que React la reescribiera en cada render,
          anulando el cálculo del fotograma. La rotación terrestre se hereda
          del EcefFrame que envuelve al componente. */}
      <group ref={posicionRef}>
        <Suspense fallback={<IssMarkerFallback />}>
          <IssModel />
        </Suspense>
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
