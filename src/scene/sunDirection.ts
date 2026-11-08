import { Vector3 } from 'three';

import { sunDirection } from '../lib/sun.ts';
import { EARTH_TILT } from './constants.ts';

const SCENE_Y_AXIS = new Vector3(0, 1, 0);
const SCENE_Z_AXIS = new Vector3(0, 0, 1);

/** Convierte la dirección ECEF en el mismo orden que el globo. */
export function sunDirectionInScene(date: Date, gmst: number): Vector3 {
  return sunDirection(date, 1)
    .applyAxisAngle(SCENE_Y_AXIS, gmst)
    .applyAxisAngle(SCENE_Z_AXIS, EARTH_TILT);
}
