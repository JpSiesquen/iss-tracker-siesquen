import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { MeshBasicMaterial } from 'three';

import {
  EARTH_RADIUS,
  EARTH_SEGMENTS,
  SCENE_LOADING_COLOR,
  SCENE_LOADING_OPACITY,
  SCENE_LOADING_PULSE_AMPLITUDE,
  SCENE_LOADING_PULSE_HZ,
} from './constants';

import './SceneLoadingFallback.css';

/**
 * Fallback del `<Suspense>` de la escena mientras `Earth` descarga texturas.
 *
 * No es un spinner genérico: una silueta del mismo radio que el globo real y
 * un texto de estado. El fondo sigue siendo `SPACE_COLOR` (el canvas) y el
 * campo de estrellas sigue montado fuera del Suspense, así que no se percibe
 * como pantalla rota.
 *
 * ⚠️ Vive dentro del `<Canvas>`: solo objetos de Three.js (y `Html` de drei
 * para la etiqueta). Los paneles de la app están fuera y siguen interactivos.
 */
export function SceneLoadingFallback() {
  const materialRef = useRef<MeshBasicMaterial>(null);
  const reduceMotionRef = useRef(prefersReducedMotion());

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      reduceMotionRef.current = media.matches;
      const material = materialRef.current;
      if (material && media.matches) {
        material.opacity = SCENE_LOADING_OPACITY;
      }
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useFrame(({ clock }) => {
    const material = materialRef.current;
    if (!material || reduceMotionRef.current) return;

    // Delta time implícito vía clock: la fase depende del tiempo real, no del
    // framerate. Con prefers-reduced-motion la opacidad queda fija arriba.
    const phase = clock.elapsedTime * Math.PI * 2 * SCENE_LOADING_PULSE_HZ;
    material.opacity =
      SCENE_LOADING_OPACITY + Math.sin(phase) * SCENE_LOADING_PULSE_AMPLITUDE;
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, EARTH_SEGMENTS, EARTH_SEGMENTS]} />
        <meshBasicMaterial
          ref={materialRef}
          color={SCENE_LOADING_COLOR}
          transparent
          opacity={SCENE_LOADING_OPACITY}
          depthWrite={false}
        />
      </mesh>

      {/* Debajo del globo: no tapa la silueta ni compite con el centro visual.
          pointer-events none para no robar el orbit control del canvas. */}
      <Html
        position={[0, -(EARTH_RADIUS + 0.35), 0]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <p className="scene-loading" role="status">
          Cargando escena…
        </p>
      </Html>
    </group>
  );
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
