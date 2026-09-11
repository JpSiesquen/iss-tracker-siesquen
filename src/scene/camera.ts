import { MathUtils } from 'three';

import {
  CAMERA_FRAME_MARGIN,
  CAMERA_ORBIT_FRAME_RADIUS,
  CAMERA_VERTICAL_FOV,
} from './constants';

/**
 * Distancia necesaria para encuadrar la órbita completa en un viewport.
 *
 * Three.js expresa el FOV en vertical. En formato apaisado ese es el límite;
 * en formato vertical se obtiene el medio FOV horizontal a partir del aspecto.
 * La distancia de una esfera tangente al borde es radio / sin(medio FOV).
 */
export function initialCameraDistance(aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) {
    throw new RangeError('El aspecto de cámara debe ser un número positivo');
  }

  const halfVerticalFov = MathUtils.degToRad(CAMERA_VERTICAL_FOV / 2);
  const halfLimitingFov =
    aspect >= 1 ? halfVerticalFov : Math.atan(Math.tan(halfVerticalFov) * aspect);

  return (CAMERA_ORBIT_FRAME_RADIUS * CAMERA_FRAME_MARGIN) / Math.sin(halfLimitingFov);
}
