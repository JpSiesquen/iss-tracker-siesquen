import { MathUtils, Vector3 } from 'three';

import { EARTH_RADIUS_KM } from '../lib/coordinates.ts';
import type { createEphemeris } from '../lib/ephemeris.ts';
import { frameDistance, initialCameraDistance } from './camera.ts';
import { CAMERA_MAX_DISTANCE, EARTH_TILT } from './constants.ts';

export type LunarEphemeris = ReturnType<typeof createEphemeris>;
export type CameraDestination = 'iss' | 'moon' | 'solar';

export const MOON_RADIUS = 1737.4 / EARTH_RADIUS_KM;
export const LUNAR_BODY_SCALE = 8;
export const LUNAR_CENTER_LIMIT = 33; // mitad de la separación máxima, en radios terrestres
const LUNAR_FRAME_MARGIN = 1.25;
const UNIX_EPOCH_JD = 2440587.5;
const MS_PER_DAY = 86_400_000;
// IERS Bulletin C 72: TAI − UTC = 37 s. TT − TAI = 32.184 s.
// TT aproxima TDB con un error inferior a 2 ms para la ventana de la tabla.
const TT_MINUS_UTC_MS = 69_184;
const Z_AXIS = new Vector3(0, 0, 1);

export function utcToJdTdb(date: Date): number {
  return UNIX_EPOCH_JD + (date.getTime() + TT_MINUS_UTC_MS) / MS_PER_DAY;
}

export function lunarCameraRange(aspect: number) {
  const initial = initialCameraDistance(aspect);
  return {
    initial,
    start: Math.max(CAMERA_MAX_DISTANCE, initial * 1.3),
    overview: frameDistance(
      (LUNAR_CENTER_LIMIT + LUNAR_BODY_SCALE) * LUNAR_FRAME_MARGIN,
      aspect,
    ),
  };
}

export function lunarZoomProgress(
  distance: number,
  range: ReturnType<typeof lunarCameraRange>,
): number {
  return MathUtils.smoothstep(distance, range.start, range.overview);
}

export function icrfToScene([x, y, z]: [number, number, number]): Vector3 {
  return new Vector3(x, z, -y).applyAxisAngle(Z_AXIS, EARTH_TILT);
}

export function lunarFrameAt(ephemeris: LunarEphemeris, date: Date) {
  const jd = utcToJdTdb(date);
  const moon = ephemeris.position('moon', jd, 'earth');
  const sun = ephemeris.position('sun', jd, 'earth');
  if (moon.status !== 'ok' || sun.status !== 'ok') return null;

  const moonKm = icrfToScene(moon.vector);
  const sunKm = icrfToScene(sun.vector);
  return {
    towardSun: sunKm.clone().sub(moonKm).normalize(),
    position: moonKm.divideScalar(EARTH_RADIUS_KM),
    sunPosition: sunKm.divideScalar(EARTH_RADIUS_KM),
  };
}
