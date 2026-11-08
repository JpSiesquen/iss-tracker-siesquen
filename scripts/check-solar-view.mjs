import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Vector3 } from 'three';

import { EARTH_RADIUS_KM } from '../src/lib/coordinates.ts';
import {
  createEphemeris,
  EPHEMERIS_ASSET_PATH,
  KM_PER_AU,
} from '../src/lib/ephemeris.ts';
import { CAMERA_VERTICAL_FOV, EARTH_TILT } from '../src/scene/constants.ts';
import {
  solarCameraFrame,
  solarCameraRange,
  solarPositionsAt,
} from '../src/scene/solarView.ts';

const file = readFileSync(new URL('../public' + EPHEMERIS_ASSET_PATH, import.meta.url));
const ephemeris = createEphemeris(
  file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
);
const { verification } = JSON.parse(
  readFileSync(new URL('./fixtures/horizons-v1.json', import.meta.url), 'utf8'),
);
const barycentric = new Map(
  verification.references
    .filter(({ origin }) => origin === 'solarSystemBarycenter')
    .map(({ body, positionsKm }) => [body, positionsKm]),
);

let maxErrorKm = 0;
for (const [index, jd] of verification.datesJdTdb.entries()) {
  const bodies = solarPositionsAt(ephemeris, jd);
  assert.ok(bodies);
  assert.deepEqual(
    bodies.map(({ id }) => id),
    [
      'sun',
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
    ],
  );
  const earth = new Vector3(...barycentric.get('earth')[index]);
  const sun = new Vector3(...barycentric.get('sun')[index]);
  for (const { id, position, distanceAu } of bodies) {
    const reference = new Vector3(...barycentric.get(id)[index]);
    const rotated = position.clone().applyAxisAngle(new Vector3(0, 0, 1), -EARTH_TILT);
    const positionKm = new Vector3(rotated.x, -rotated.z, rotated.y).multiplyScalar(
      EARTH_RADIUS_KM,
    );
    const errorKm = positionKm.distanceTo(reference.clone().sub(earth));
    assert.ok(errorKm < 40, id + ' fuera de tolerancia geocéntrica: ' + errorKm + ' km');
    assert.ok(Math.abs(distanceAu * KM_PER_AU - reference.distanceTo(sun)) < 40);
    maxErrorKm = Math.max(maxErrorKm, errorKm);
  }
}
assert.equal(solarPositionsAt(ephemeris, 0), null);

for (const aspect of [16 / 9, 1, 390 / 844, 320 / 640]) {
  const range = solarCameraRange(aspect);
  const moon = solarCameraFrame(range.overview, range);
  assert.deepEqual(moon, { radius: range.overview, focus: 0 });
  assert.deepEqual(solarCameraFrame(range.solarStart, range), {
    radius: range.solarStart,
    focus: 0,
  });
  assert.ok(
    solarCameraFrame(range.solarStart * (1 + 1e-7), range).radius - range.solarStart <
      0.01,
  );
  const full = solarCameraFrame(range.solarEnd, range);
  assert.ok(Math.abs(full.radius - range.solarRadius) < 1e-8);
  assert.equal(full.focus, 1);
  const halfVertical = (CAMERA_VERTICAL_FOV * Math.PI) / 360;
  const halfLimiting = Math.min(halfVertical, Math.atan(Math.tan(halfVertical) * aspect));
  const visibleRadiusAu =
    (full.radius * Math.sin(halfLimiting) * EARTH_RADIUS_KM) / KM_PER_AU;
  for (const jd of verification.datesJdTdb) {
    assert.ok(
      solarPositionsAt(ephemeris, jd).every(
        ({ distanceAu }) => distanceAu < visibleRadiusAu,
      ),
    );
  }
}

console.log(
  'Vista solar: nueve centros contrastados con Horizons, error máximo de ' +
    maxErrorKm.toFixed(3) +
    ' km.',
);
