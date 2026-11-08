import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import {
  createEphemeris,
  EPHEMERIS_ASSET_PATH,
  EPHEMERIS_BODIES,
  EPHEMERIS_ORIGINS,
} from '../src/lib/ephemeris.ts';

const data = readFileSync(new URL('../public' + EPHEMERIS_ASSET_PATH, import.meta.url));
const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/horizons-v1.json', import.meta.url), 'utf8'),
);
assert.equal(createHash('sha256').update(data).digest('hex'), fixture.assetSha256);

const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
const ephemeris = createEphemeris(buffer);
assert.equal(ephemeris.frame, 'ICRF');
assert.equal(ephemeris.timeScale, 'TDB');
assert.deepEqual(ephemeris.coverage, fixture.coverage);

const corrupted = buffer.slice(0);
new DataView(corrupted).setUint32(0, 0);
assert.throws(() => createEphemeris(corrupted), /HZV1/);
assert.throws(() => createEphemeris(buffer.slice(0, -1)), /HZV1/);

const tolerancesKm = {
  solarSystemBarycenter: {
    sun: 0.05,
    mercury: 35,
    venus: 5,
    earth: 3,
    moon: 8,
    mars: 4,
    jupiter: 12,
    saturn: 4,
    uranus: 7,
    neptune: 7,
  },
  earth: { moon: 9 },
  sun: { earth: 3 },
};

function position(body, jdTdb, origin, unit = 'km') {
  const result = ephemeris.position(body, jdTdb, origin, unit);
  assert.equal(result.status, 'ok');
  assert.equal(result.target, body);
  assert.equal(result.targetCenter, 'physical');
  assert.equal(result.origin, origin);
  assert.equal(result.unit, unit);
  return result.vector;
}

const { startJdTdb, endJdTdb } = ephemeris.coverage;
for (const jd of [startJdTdb, endJdTdb]) {
  for (const body of Object.keys(EPHEMERIS_BODIES)) {
    assert.ok(position(body, jd, 'solarSystemBarycenter').every(Number.isFinite));
  }
}
for (const jd of [startJdTdb - 0.001, endJdTdb + 0.001, NaN, Infinity]) {
  assert.deepEqual(ephemeris.position('moon', jd, 'earth'), {
    status: 'out-of-coverage',
  });
}

const { datesJdTdb, references } = fixture.verification;
assert.equal(new Set(datesJdTdb).size, 48);
assert.ok(datesJdTdb[0] - startJdTdb < 30);
assert.ok(endJdTdb - datesJdTdb.at(-1) < 30);
assert.equal(new Set(references.map(({ body, origin }) => body + '/' + origin)).size, 12);
assert.deepEqual(
  references
    .filter(({ origin }) => origin === 'solarSystemBarycenter')
    .map(({ body }) => body)
    .sort(),
  Object.keys(EPHEMERIS_BODIES).sort(),
);

for (const { body, origin, targetId, originId, positionsKm } of references) {
  assert.equal(targetId, EPHEMERIS_BODIES[body].horizonsId);
  assert.equal(originId, EPHEMERIS_ORIGINS[origin]);
  const tolerance = tolerancesKm[origin][body];
  assert.equal(positionsKm.length, datesJdTdb.length);

  let maxErrorKm = 0;
  for (const [index, jd] of datesJdTdb.entries()) {
    const cadence = EPHEMERIS_BODIES[body].stepDays;
    assert.notEqual(
      (jd - startJdTdb) % cadence,
      0,
      'La referencia debe estar entre muestras',
    );
    const actual = position(body, jd, origin);
    const expected = positionsKm[index];
    const errorKm = Math.hypot(
      ...actual.map((component, axis) => component - expected[axis]),
    );
    assert.ok(
      errorKm <= tolerance,
      body + '/' + origin + ' en ' + jd + ': ' + errorKm + ' km > ' + tolerance + ' km',
    );
    maxErrorKm = Math.max(maxErrorKm, errorKm);
  }
  console.log(
    body +
      '/' +
      origin +
      ': ' +
      maxErrorKm.toFixed(4) +
      ' km de diferencia máxima (límite ' +
      tolerance +
      ' km)',
  );
}

const [jd] = datesJdTdb;
const moonBarycentric = position('moon', jd, 'solarSystemBarycenter');
const earthBarycentric = position('earth', jd, 'solarSystemBarycenter');
const moonGeocentric = position('moon', jd, 'earth');
assert.deepEqual(
  moonGeocentric,
  moonBarycentric.map((value, axis) => value - earthBarycentric[axis]),
);
assert.deepEqual(position('earth', jd, 'earth'), [0, 0, 0]);
assert.deepEqual(position('sun', jd, 'sun'), [0, 0, 0]);

const moonInAu = position('moon', jd, 'earth', 'au');
for (const [axis, value] of moonInAu.entries()) {
  assert.ok(Math.abs(value * 149_597_870.7 - moonGeocentric[axis]) < 1e-9);
}
console.log(
  references.length * datesJdTdb.length + ' referencias de Horizons verificadas.',
);
