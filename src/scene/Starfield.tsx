import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';

import {
  STAR_COLOR,
  STAR_COUNT,
  STAR_OPACITY,
  STAR_RADIUS_MAX,
  STAR_RADIUS_MIN,
  STAR_SIZE,
} from './constants';

/**
 * Fondo de estrellas sutiles detrás del globo.
 *
 * ## Por qué un campo de puntos y no un skybox
 *
 * Una textura o cubemap añadiría VRAM y una costura posible con
 * `SPACE_COLOR`. Un `Points` estático son ~1 400 vértices, un material y un
 * draw call: se lee como cielo sin competir con Tierra, traza ni ISS.
 *
 * ## Fuera de ECEF a propósito
 *
 * Vive en coordenadas de escena, no dentro de `EcefFrame`. Si rotara con el
 * GMST, el cielo daría una vuelta al día y distraería del dato orbital. Al
 * orbitar la cámara, las estrellas se mueven con el mundo —como un fondo fijo—
 * y el planeta gira debajo.
 *
 * ## Sin animación
 *
 * No hay `useFrame` ni parallax. Con `prefers-reduced-motion` el campo ya es
 * estático; no hay nada que desactivar.
 */
export function Starfield() {
  const geometry = useMemo(() => buildStarGeometry(), []);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color={STAR_COLOR}
        size={STAR_SIZE}
        sizeAttenuation
        transparent
        opacity={STAR_OPACITY}
        depthWrite={false}
        /**
         * ACES comprimiría puntos tenues hasta hacerlos ilegibles. Sin tone
         * mapping, la opacidad es el único dial de sutileza.
         */
        toneMapped={false}
      />
    </points>
  );
}

/**
 * Distribuye puntos de forma uniforme en un casquete esférico.
 *
 * Semilla fija: el mismo cielo en cada carga (sin parpadeo al remount) y
 * revisable en captura.
 */
function buildStarGeometry(): BufferGeometry {
  const positions = new Float32Array(STAR_COUNT * 3);
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < STAR_COUNT; i++) {
    const u = rand();
    const v = rand();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const radius = STAR_RADIUS_MIN + rand() * (STAR_RADIUS_MAX - STAR_RADIUS_MIN);
    const sinPhi = Math.sin(phi);

    const offset = i * 3;
    positions[offset] = radius * sinPhi * Math.cos(theta);
    positions[offset + 1] = radius * sinPhi * Math.sin(theta);
    positions[offset + 2] = radius * Math.cos(phi);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  return geometry;
}
