import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Vector3 } from 'three';

import { EARTH_RADIUS_KM } from '../src/lib/coordinates.ts';
import { createEphemeris, EPHEMERIS_ASSET_PATH } from '../src/lib/ephemeris.ts';
import { CAMERA_VERTICAL_FOV, EARTH_TILT } from '../src/scene/constants.ts';
import {
  LUNAR_BODY_SCALE,
  lunarCameraRange,
  lunarFrameAt,
  lunarZoomProgress,
  MOON_RADIUS,
  utcToJdTdb,
} from '../src/scene/lunarView.ts';

const data = readFileSync(new URL('../public' + EPHEMERIS_ASSET_PATH, import.meta.url));
const reader = createEphemeris(
  data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
);
const date = new Date('2026-11-08T15:00:00.000Z');

// NASA/JPL Horizons. COMMAND 301 y 10, CENTER 500@399, VECTORS, TIME_TYPE UT,
// REF_SYSTEM ICRF, REF_PLANE FRAME, OUT_UNITS KM-S, VEC_CORR NONE, VEC_TABLE 1.
// TLIST_TYPE CAL, TLIST '2026-11-08 15:00:00'.
const moonKm = new Vector3(-309985.4837562117, -210637.4811164155, -127103.5314241531);
const sunKm = new Vector3(-103248446.4451181, -97574618.03547153, -42296376.13374354);
const frame = lunarFrameAt(reader, date);
assert.ok(frame);
assert.ok(Math.abs((utcToJdTdb(date) - 2461353.125) * 86400 - 69.184) < 0.0001);
assert.equal(lunarFrameAt(reader, new Date('2032-01-01')), null);

function sceneToIcrf(vector) {
  const { x, y, z } = vector.clone().applyAxisAngle(new Vector3(0, 0, 1), -EARTH_TILT);
  return new Vector3(x, -z, y);
}

const observedMoonKm = sceneToIcrf(frame.position).multiplyScalar(EARTH_RADIUS_KM);
const errorKm = observedMoonKm.distanceTo(moonKm);
assert.ok(errorKm < 9, 'Error lunar geocéntrico: ' + errorKm + ' km');
const solarError = sceneToIcrf(frame.towardSun).angleTo(sunKm.sub(moonKm));
assert.ok(solarError < 1e-6, 'Dirección lunar hacia el Sol: ' + solarError + ' rad');

for (const aspect of [16 / 9, 1, 390 / 844, 320 / 640]) {
  const range = lunarCameraRange(aspect);
  assert.ok(range.initial < range.start && range.start < range.overview);
  assert.equal(lunarZoomProgress(range.initial, range), 0);
  assert.equal(lunarZoomProgress((range.start + range.overview) / 2, range), 0.5);
  assert.equal(lunarZoomProgress(range.overview, range), 1);

  const halfVertical = (CAMERA_VERTICAL_FOV * Math.PI) / 360;
  const limitingHalfFov = Math.min(
    halfVertical,
    Math.atan(Math.tan(halfVertical) * aspect),
  );
  const frameRadius = range.overview * Math.sin(limitingHalfFov);
  assert.ok(
    frame.position.length() / 2 + LUNAR_BODY_SCALE * Math.max(1, MOON_RADIUS) <
      frameRadius,
  );
}
console.log(
  'Vista lunar: ' +
    errorKm.toFixed(3) +
    ' km respecto a Horizons y encuadre comprobado en cuatro aspectos.',
);
