import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

import { Vector3 } from 'three';

import {
  CATALOG_COVERAGE,
  catalogAssetPath,
  createCatalogEphemeris,
} from '../src/lib/catalogEphemeris.ts';
import { EARTH_RADIUS_KM } from '../src/lib/coordinates.ts';
import {
  createEphemeris,
  EPHEMERIS_ASSET_PATH,
  KM_PER_AU,
} from '../src/lib/ephemeris.ts';
import {
  CATALOG_BODIES,
  CATALOG_FAMILIES,
  searchCatalog,
} from '../src/lib/solarCatalog.ts';
import { EARTH_TILT } from '../src/scene/constants.ts';
import { catalogPositionAt } from '../src/scene/solarView.ts';

function read(path) {
  return readFileSync(new URL(path, import.meta.url));
}

function arrayBuffer(file) {
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
}

const ephemeris = createEphemeris(arrayBuffer(read('../public' + EPHEMERIS_ASSET_PATH)));
const fixture = JSON.parse(read('./fixtures/horizons-catalog-v1.json'));
const provenance = JSON.parse(read('../src/lib/catalog-sources.json'));
const { startJdTdb, endJdTdb } = CATALOG_COVERAGE;
// El movimiento de Titán alrededor de Saturno domina el error a cadencia diaria.
const limitsKm = { ceres: 5, titan: 120, vesta: 5, '67p': 15 };
const sourceAllowanceKm = 3;

assert.deepEqual(fixture.coverage, CATALOG_COVERAGE);
assert.equal(fixture.originId, 0);
assert.equal(new Set(fixture.validationDates).size, 16);
assert.deepEqual(
  CATALOG_BODIES.map(({ family }) => family).sort(),
  Object.keys(CATALOG_FAMILIES).sort(),
);
assert.deepEqual(
  searchCatalog('titan', 'moon').map(({ id }) => id),
  ['titan'],
);
assert.deepEqual(
  searchCatalog(' 67P ', 'comet').map(({ id }) => id),
  ['67p'],
);
assert.deepEqual(searchCatalog('Vesta', 'dwarf'), []);
assert.deepEqual(searchCatalog('sin coincidencias', ''), []);

for (const body of CATALOG_BODIES) {
  const file = read('../public' + catalogAssetPath(body.id));
  const record = fixture.records[body.id];
  assert.ok(provenance.sources[body.id]);
  assert.equal(record.command, body.command);
  assert.equal(createHash('sha256').update(file).digest('hex'), record.assetSha256);

  const catalog = createCatalogEphemeris(arrayBuffer(file), body);
  assert.throws(() => createCatalogEphemeris(arrayBuffer(file.subarray(0, -1)), body));
  const wrongBody = CATALOG_BODIES.find(({ id }) => id !== body.id);
  assert.throws(() => createCatalogEphemeris(arrayBuffer(file), wrongBody));
  assert.ok(catalog.barycentricPosition(startJdTdb).every(Number.isFinite));
  assert.ok(catalog.barycentricPosition(endJdTdb).every(Number.isFinite));
  for (const invalid of [startJdTdb - 0.01, endJdTdb + 0.01, NaN, Infinity]) {
    assert.equal(catalogPositionAt(catalog, ephemeris, invalid), null);
  }

  let maxErrorKm = 0;
  let maxSceneErrorKm = 0;
  assert.equal(record.positionsKm.length, fixture.validationDates.length);
  for (const [index, jd] of fixture.validationDates.entries()) {
    assert.notEqual((jd - startJdTdb) % body.stepDays, 0);
    const expected = new Vector3(...record.positionsKm[index]);
    const actual = new Vector3(...catalog.barycentricPosition(jd));
    const errorKm = actual.distanceTo(expected);
    assert.ok(errorKm <= limitsKm[body.id], body.id + ': ' + errorKm + ' km');
    maxErrorKm = Math.max(maxErrorKm, errorKm);

    const { position, distanceAu } = catalogPositionAt(catalog, ephemeris, jd);
    const earth = new Vector3(...ephemeris.position('earth', jd).vector);
    const sun = new Vector3(...ephemeris.position('sun', jd).vector);
    const rotated = position.clone().applyAxisAngle(new Vector3(0, 0, 1), -EARTH_TILT);
    const positionKm = new Vector3(rotated.x, -rotated.z, rotated.y).multiplyScalar(
      EARTH_RADIUS_KM,
    );
    const sceneErrorKm = positionKm.distanceTo(expected.clone().sub(earth));
    assert.ok(sceneErrorKm <= limitsKm[body.id] + sourceAllowanceKm);
    assert.ok(
      Math.abs(distanceAu * KM_PER_AU - expected.distanceTo(sun)) <=
        limitsKm[body.id] + sourceAllowanceKm,
    );
    maxSceneErrorKm = Math.max(maxSceneErrorKm, sceneErrorKm);
  }

  console.log(
    body.id +
      ': ' +
      maxErrorKm.toFixed(4) +
      ' km baricéntricos, ' +
      maxSceneErrorKm.toFixed(4) +
      ' km en escena, ' +
      file.length +
      ' B (' +
      gzipSync(file).length +
      ' B gzip).',
  );
}
