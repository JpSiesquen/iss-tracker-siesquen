import useMediaQuery from '@mui/material/useMediaQuery';
import { Canvas } from '@react-three/fiber';
import { useQuery } from '@tanstack/react-query';
import { Suspense, useRef, useState } from 'react';
import { type Group, Vector3 } from 'three';

import {
  catalogAssetPath,
  createCatalogEphemeris,
  hasCatalogCoverage,
} from '../lib/catalogEphemeris';
import type { CatalogBody } from '../lib/solarCatalog';
import { createEphemeris, EPHEMERIS_ASSET_PATH } from '../lib/ephemeris';
import { LunarNavigation } from '../ui/LunarNavigation';

import { initialCameraDistance } from './camera';
import {
  CAMERA_VERTICAL_FOV,
  DESKTOP_MAX_DPR,
  EARTH_TILT,
  MOBILE_MAX_DPR,
  MOBILE_PERFORMANCE_MEDIA_QUERY,
  SPACE_COLOR,
} from './constants';
import { Controls } from './Controls';
import { Earth } from './Earth';
import { EcefFrame } from './EcefFrame';
import { IssMarker } from './IssMarker';
import { Lights } from './Lights';
import { utcToJdTdb, type CameraDestination } from './lunarView';
import { Moon } from './Moon';
import { SceneLoadingFallback } from './SceneLoadingFallback';
import { SceneTimeProvider } from './SceneTimeContext';
import { SolarSystem } from './SolarSystem';
import type { SolarBodyId, SolarDistances } from './solarView';
import { Starfield } from './Starfield';

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
 * dentro—. La composición de la aplicación coloca la telemetría fuera del lienzo.
 */
export function Scene() {
  const usarPerfilMovil = useMediaQuery(MOBILE_PERFORMANCE_MEDIA_QUERY);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const earth = useRef<Group>(null);
  const moon = useRef<Group>(null);
  const moonLight = useRef(new Vector3());
  const [requested, setRequested] = useState(false);
  const [destination, setDestination] = useState<CameraDestination | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [solar, setSolar] = useState(false);
  const [detailedEarth, setDetailedEarth] = useState(true);
  const [solarDistances, setSolarDistances] = useState<SolarDistances | null>(null);
  const [selected, setSelected] = useState<SolarBodyId | null>(null);
  const [catalogSelection, setCatalogSelection] = useState<CatalogBody | null>(null);
  const [outOfCoverage, setOutOfCoverage] = useState(false);
  const ephemeris = useQuery({
    queryKey: ['ephemeris', EPHEMERIS_ASSET_PATH],
    enabled: requested,
    staleTime: Infinity,
    retry: false,
    queryFn: async ({ signal }) => {
      const response = await fetch(EPHEMERIS_ASSET_PATH, { signal });
      if (!response.ok) throw new Error('No se pudieron cargar las efemérides.');
      return createEphemeris(await response.arrayBuffer());
    },
  });

  const catalogUnavailable = !hasCatalogCoverage(utcToJdTdb(new Date()));
  const catalog = useQuery({
    queryKey: ['catalog-ephemeris', catalogSelection?.id],
    enabled: solar && catalogSelection !== null && !catalogUnavailable,
    staleTime: Infinity,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!catalogSelection) throw new Error('No hay un astro seleccionado.');
      const response = await fetch(catalogAssetPath(catalogSelection.id), { signal });
      if (!response.ok) throw new Error('No se pudo cargar la efeméride del astro.');
      return createCatalogEphemeris(await response.arrayBuffer(), catalogSelection);
    },
  });

  const wide = distanceKm !== null;
  const returnToIss =
    wide ||
    solar ||
    (destination !== null &&
      destination !== 'iss' &&
      !ephemeris.isError &&
      !outOfCoverage);

  function navigate(next: CameraDestination) {
    setDestination(next);
    if (next === 'iss') return;
    setRequested(true);
    if (ephemeris.isError) void ephemeris.refetch();
  }

  return (
    <>
      <Canvas
        // WebGL no expone una estructura útil a tecnología asistiva. La
        // alternativa textual está junto al Canvas en App y la telemetría
        // comunica la misma posición con HTML semántico.
        aria-hidden="true"
        // La distancia se ajusta al tamaño REAL del canvas al crearlo. Usar un
        // z fijo solo funcionaría para la relación de aspecto donde se tanteó.
        camera={{ fov: CAMERA_VERTICAL_FOV, near: 0.1, far: 1000 }}
        onCreated={({ camera, size }) => {
          camera.position.set(0, 0, initialCameraDistance(size.width / size.height));
          camera.updateProjectionMatrix();
        }}
        // Limita la densidad de píxeles. En pantallas de alta densidad el
        // navegador renderizaría a 3x, que son nueve veces más píxeles para
        // una mejora casi imperceptible. #45 reduce además el máximo móvil.
        dpr={[1, usarPerfilMovil ? MOBILE_MAX_DPR : DESKTOP_MAX_DPR]}
        // El espacio no es gris.
        style={{ background: SPACE_COLOR }}
      >
        {/* Fondo de escena, fuera de ECEF y del tiempo: no gira con el planeta
          ni depende del Sol. Ver Starfield.tsx. */}
        <Starfield />

        {/* El proveedor calcula el instante una vez por fotograma y lo reparte.
          Envuelve a la Tierra y al marcador para que ambos se orienten y se
          propaguen con exactamente el mismo tiempo: usar instantes distintos
          produce un desfase en longitud consistente y difícil de detectar. */}
        <SceneTimeProvider>
          <Controls
            earth={earth}
            moon={moon}
            moonLight={moonLight}
            ephemeris={ephemeris.data}
            requested={requested}
            destination={destination}
            wide={wide || solar}
            reducedMotion={reducedMotion}
            onRequest={() => setRequested(true)}
            onArrive={() => setDestination(null)}
            onOverview={setDistanceKm}
            onSolarView={setSolar}
            onDetailVisibility={(earthVisible, moonVisible) => {
              if (earth.current) earth.current.visible = earthVisible;
              if (moon.current) moon.current.visible = moonVisible;
              setDetailedEarth(earthVisible);
            }}
            onCoverageChange={setOutOfCoverage}
          />
          {ephemeris.data && <Moon object={moon} light={moonLight} showLabel={wide} />}
          {solar && ephemeris.data && (
            <SolarSystem
              ephemeris={ephemeris.data}
              detailedEarth={detailedEarth}
              selected={selected}
              catalogEphemeris={catalogUnavailable ? undefined : catalog.data}
              onDistances={setSolarDistances}
            />
          )}
          {/* Las luces van DENTRO del proveedor, pero FUERA de EcefFrame: la
            dirección solar ya llega convertida a coordenadas de escena. */}
          <Lights />

          {/* <Earth> se suspende mientras carga sus texturas: necesita Suspense
            por encima. El fallback es una silueta del mismo radio (#134), no
            null: una pantalla negra se lee como fallo, no como espera.

            La inclinación axial envuelve también al fallback para que el
            globo texturizado aparezca en el mismo sitio, sin salto de pose.
            Starfield y paneles quedan fuera: la carga no bloquea la UI.

            ⚠️ El Suspense debe ENVOLVER al componente que carga, no ir
            dentro: un componente no puede ser su propio fallback. */}
          <group ref={earth} rotation={[0, 0, EARTH_TILT]}>
            <Suspense fallback={<SceneLoadingFallback />}>
              <EcefFrame>
                <Earth usarPerfilMovil={usarPerfilMovil} />
                <IssMarker />
              </EcefFrame>
            </Suspense>
          </group>
        </SceneTimeProvider>
      </Canvas>
      <LunarNavigation
        returnToIss={returnToIss}
        pending={requested && ephemeris.isPending}
        error={
          outOfCoverage
            ? 'Fecha fuera de la cobertura de las efemérides.'
            : ephemeris.isError
              ? 'No pudimos cargar las efemérides. Vuelve a intentarlo.'
              : null
        }
        distanceKm={distanceKm}
        solar={solar}
        distances={solarDistances}
        selected={selected}
        catalogSelection={catalogSelection}
        catalogUnavailable={catalogUnavailable}
        catalogError={catalog.isError}
        onCatalogRetry={() => void catalog.refetch()}
        onCatalogSelect={(body) => {
          if (body) setSelected(null);
          setCatalogSelection((current) => (current?.id === body?.id ? null : body));
        }}
        onSelect={(id) => {
          setCatalogSelection(null);
          setSelected((current) => (current === id ? null : id));
        }}
        onNavigate={navigate}
      />
    </>
  );
}
