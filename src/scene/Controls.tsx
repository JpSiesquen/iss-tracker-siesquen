import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, type ComponentRef, type RefObject } from 'react';
import { MathUtils, type Group, Vector3 } from 'three';

import { EARTH_RADIUS_KM } from '../lib/coordinates';
import { useUiStore } from '../store/ui';
import { CAMERA_MIN_DISTANCE, STAR_RADIUS_MAX, STAR_RADIUS_MIN } from './constants';
import {
  type CameraDestination,
  type LunarEphemeris,
  LUNAR_BODY_SCALE,
  LUNAR_CENTER_LIMIT,
  lunarCameraRange,
  lunarFrameAt,
  lunarZoomProgress,
} from './lunarView';
import { useSceneTime } from './sceneTime';

interface ControlsProps {
  earth: RefObject<Group | null>;
  moon: RefObject<Group | null>;
  moonLight: RefObject<Vector3>;
  ephemeris?: LunarEphemeris;
  requested: boolean;
  destination: CameraDestination | null;
  wide: boolean;
  reducedMotion: boolean;
  onRequest: () => void;
  onArrive: () => void;
  onOverview: (km: number | null) => void;
  onMoonVisibility: (visible: boolean) => void;
  onCoverageChange: (outOfCoverage: boolean) => void;
}

const ORBIT_ZOOM_SPEED = 0.8;
const LUNAR_ZOOM_SPEED = 4.4;
const ZOOM_EASE = 13;
const NAVIGATION_EASE = 5;
const MIN_PROGRESS_FOR_HUD = 0.08;

export function Controls({
  earth,
  moon,
  moonLight,
  ephemeris,
  requested,
  destination,
  wide,
  reducedMotion,
  onRequest,
  onArrive,
  onOverview,
  onMoonVisibility,
  onCoverageChange,
}: ControlsProps) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const time = useSceneTime();
  const autoRotate = useUiStore((state) => state.rotacionAutomatica);
  const aspect = useThree(({ size }) => (size.height ? size.width / size.height : 1));
  const range = useMemo(() => lunarCameraRange(aspect || 1), [aspect]);
  const motion = useRef({
    radius: 0,
    desiredRadius: 0,
    overviewLimit: range.overview,
    progress: 0,
    reportedKm: null as number | null,
    outOfCoverage: false,
    offset: new Vector3(),
    axis: new Vector3(),
    side: new Vector3(),
  });

  const starfieldExtent = 1 + (2 * STAR_RADIUS_MAX) / STAR_RADIUS_MIN;
  const far = Math.max(1000, (range.overview + LUNAR_CENTER_LIMIT) * starfieldExtent);

  useFrame(({ camera }, delta) => {
    if (camera.far !== far) {
      camera.far = far;
      camera.updateProjectionMatrix();
    }
    const orbit = controls.current;
    if (!orbit) return;

    const state = motion.current;
    const rawRadius = orbit.getDistance();
    if (rawRadius <= 0) return;
    if (state.radius === 0) {
      state.radius = rawRadius;
      state.desiredRadius = rawRadius;
    }
    if (
      destination === null &&
      state.progress === 0 &&
      state.radius < range.start * 0.8 &&
      Math.abs(rawRadius - state.radius) < 1e-8 &&
      Math.abs(state.desiredRadius - state.radius) < 1e-8
    ) {
      return;
    }
    // OrbitControls conserva rueda, pellizco y arrastre. Su delta modifica
    // el objetivo; el radio renderizado converge por separado.
    state.desiredRadius *= rawRadius / state.radius;
    if (state.overviewLimit !== range.overview && state.progress > 0) {
      state.desiredRadius *= range.overview / state.overviewLimit;
    }
    state.overviewLimit = range.overview;

    if (!requested && state.desiredRadius >= range.start * 0.8) onRequest();
    const wantsOverview =
      state.desiredRadius >= range.start || state.progress > 0 || destination === 'moon';
    const lunar =
      ephemeris && wantsOverview ? lunarFrameAt(ephemeris, time.current.date) : null;
    const outOfCoverage = Boolean(ephemeris && wantsOverview && !lunar);
    if (outOfCoverage !== state.outOfCoverage) {
      state.outOfCoverage = outOfCoverage;
      onCoverageChange(outOfCoverage);
    }

    const goal =
      destination === 'iss'
        ? range.initial
        : destination === 'moon' && lunar
          ? range.overview
          : null;
    state.desiredRadius = MathUtils.clamp(
      goal ?? state.desiredRadius,
      CAMERA_MIN_DISTANCE,
      range.overview,
    );
    // Mientras llegan las efemérides, conservamos la intención de la rueda
    // y detenemos solo el encuadre. El zoom continúa al disponer del vector.
    const targetRadius = lunar
      ? state.desiredRadius
      : Math.min(state.desiredRadius, range.start);
    const ease = goal === null ? ZOOM_EASE : NAVIGATION_EASE;
    let radius = reducedMotion
      ? targetRadius
      : Math.exp(
          MathUtils.damp(Math.log(state.radius), Math.log(targetRadius), ease, delta),
        );
    if (Math.abs(radius - targetRadius) < targetRadius * 0.002) {
      radius = targetRadius;
      if (goal !== null) onArrive();
    }
    state.radius = radius;

    const progress = lunar ? lunarZoomProgress(radius, range) : 0;
    state.offset.copy(camera.position).sub(orbit.target).normalize();

    // Solo al alejarse se busca una perspectiva lateral. Una vez encuadrados
    // los dos cuerpos, el usuario puede orbitar libremente.
    if (lunar && progress > state.progress) {
      state.axis.copy(lunar.position).normalize();
      state.side
        .copy(state.offset)
        .addScaledVector(state.axis, -state.offset.dot(state.axis));
      if (state.side.lengthSq() < 0.0001) {
        state.side.crossVectors(camera.up, state.axis);
      }
      const turn = (progress - state.progress) / (1 - state.progress);
      state.offset.lerp(state.side.normalize(), turn).normalize();
    }

    if (lunar) {
      orbit.target.copy(lunar.position).multiplyScalar(progress * 0.5);
      moonLight.current.copy(lunar.towardSun);
      if (moon.current) moon.current.position.copy(lunar.position);
    } else {
      orbit.target.set(0, 0, 0);
    }
    camera.position.copy(orbit.target).addScaledVector(state.offset, radius);
    camera.lookAt(orbit.target);
    orbit.zoomSpeed = MathUtils.lerp(
      ORBIT_ZOOM_SPEED,
      LUNAR_ZOOM_SPEED,
      MathUtils.smoothstep(radius, range.initial, range.start),
    );

    if (progress > 0 !== state.progress > 0) onMoonVisibility(progress > 0);
    if (progress !== state.progress) {
      const scale = MathUtils.lerp(1, LUNAR_BODY_SCALE, progress);
      earth.current?.scale.setScalar(scale);
      moon.current?.scale.setScalar(scale);
      state.progress = progress;
    }

    const overviewKm =
      lunar && progress >= MIN_PROGRESS_FOR_HUD
        ? Math.round((lunar.position.length() * EARTH_RADIUS_KM) / 1000) * 1000
        : null;
    if (overviewKm !== state.reportedKm) {
      state.reportedKm = overviewKm;
      onOverview(overviewKm);
    }
  });

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      autoRotate={autoRotate && !wide && destination === null && !reducedMotion}
      autoRotateSpeed={0.4}
      minDistance={CAMERA_MIN_DISTANCE}
      maxDistance={range.overview}
      enableDamping={!reducedMotion}
      dampingFactor={0.05}
      rotateSpeed={0.4}
      zoomSpeed={ORBIT_ZOOM_SPEED}
      onStart={onArrive}
    />
  );
}
