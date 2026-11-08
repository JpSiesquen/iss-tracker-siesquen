import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

import {
  CATALOG_COVERAGE,
  CATALOG_HEADER_BYTES,
  CATALOG_MAGIC,
  catalogAssetPath,
  catalogBodyCode,
  catalogSampleCount,
} from '../src/lib/catalogEphemeris.ts';
import { EPHEMERIS_FORMAT, EPHEMERIS_ORIGINS } from '../src/lib/ephemeris.ts';
import { CATALOG_BODIES } from '../src/lib/solarCatalog.ts';
import {
  baseParameters,
  endpoint,
  queryHorizons,
  signatureVersion,
} from './horizons.mjs';

const { startJdTdb, endJdTdb } = CATALOG_COVERAGE;
const { sampleBytes } = EPHEMERIS_FORMAT;
const originId = EPHEMERIS_ORIGINS.solarSystemBarycenter;
const validationDates = Array.from({ length: 16 }, (_, index) => {
  const days = Math.floor(((index + 0.5) * (endJdTdb - startJdTdb)) / 16);
  return startJdTdb + days + ((index % 7) + 1) / 8;
});
const assets = [];
const records = {};
const sources = {};

for (const body of CATALOG_BODIES) {
  const { id, command, targetName, stepDays } = body;
  const escapedName = targetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const target = { command, name: new RegExp('^' + escapedName + '$') };
  const count = catalogSampleCount(stepDays);
  const sampleQuery = {
    START_TIME: 'JD' + startJdTdb,
    STOP_TIME: 'JD' + (startJdTdb + (count - 1) * stepDays),
    STEP_SIZE: stepDays + 'd',
  };
  const { samples, targetSource, originSource } = await queryHorizons(
    target,
    originId,
    sampleQuery,
  );
  assert.equal(samples.length, count, id);

  const asset = Buffer.alloc(CATALOG_HEADER_BYTES + sampleBytes * count);
  asset.writeUInt32LE(CATALOG_MAGIC);
  asset.writeUInt32LE(catalogBodyCode(id), 4);
  for (const [index, [jd, ...components]] of samples.entries()) {
    assert.equal(jd, startJdTdb + index * stepDays, id);
    for (const [axis, value] of components.entries()) {
      asset.writeDoubleLE(value, CATALOG_HEADER_BYTES + index * sampleBytes + axis * 8);
    }
  }

  const direct = await queryHorizons(target, originId, {
    TLIST_TYPE: 'JD',
    TLIST: validationDates.map((jd) => "'" + jd + "'").join(' '),
  });
  assert.equal(direct.targetSource, targetSource);
  assert.equal(direct.originSource, originSource);
  assert.deepEqual(
    direct.samples.map(([jd]) => jd),
    validationDates,
  );

  sources[id] = targetSource;
  records[id] = {
    command,
    sampleQuery,
    originSource,
    assetSha256: createHash('sha256').update(asset).digest('hex'),
    positionsKm: direct.samples.map(([, x, y, z]) => [x, y, z]),
  };
  assets.push([catalogAssetPath(id), asset]);
  console.log(id + ': ' + targetSource + ', ' + asset.length + ' bytes');
}

const provenance = { retrievedUtcDate: new Date().toISOString().slice(0, 10), sources };
const fixture = {
  endpoint,
  signatureVersion,
  baseParameters,
  originId,
  coverage: CATALOG_COVERAGE,
  validationDates,
  records,
};
// Se escriben los archivos solo después de validar las respuestas de los cuatro cuerpos.
for (const [path, asset] of assets) {
  await writeFile(new URL('../public' + path, import.meta.url), asset);
}
await writeFile(
  new URL('../src/lib/catalog-sources.json', import.meta.url),
  JSON.stringify(provenance, null, 2) + '\n',
);
await writeFile(
  new URL('./fixtures/horizons-catalog-v1.json', import.meta.url),
  JSON.stringify(fixture, null, 2) + '\n',
);
