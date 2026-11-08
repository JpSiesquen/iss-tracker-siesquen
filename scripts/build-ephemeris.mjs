import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

import {
  EPHEMERIS_ASSET_PATH,
  EPHEMERIS_BODIES,
  EPHEMERIS_COVERAGE,
  EPHEMERIS_FORMAT,
  EPHEMERIS_ORIGINS,
  ephemerisSampleCount,
} from '../src/lib/ephemeris.ts';

import {
  baseParameters,
  endpoint,
  queryHorizons,
  signatureVersion,
} from './horizons.mjs';

const { startJdTdb, endJdTdb } = EPHEMERIS_COVERAGE;

// Fechas separadas por aproximadamente 46 días, con fases variadas de
// interpolación. Ninguna coincide con un nodo entero de la tabla.
const validationDates = Array.from({ length: 48 }, (_, index) => {
  const days = Math.floor(((index + 0.5) * (endJdTdb - startJdTdb)) / 48);
  const hour = 3 + (index % 7) * 3;
  return Number((startJdTdb + days + hour / 24).toFixed(9));
});

const sampleBlocks = [];
const references = [];

for (const [body, { horizonsId, stepDays }] of Object.entries(EPHEMERIS_BODIES)) {
  const count = ephemerisSampleCount(stepDays);
  const query = {
    START_TIME: 'JD' + startJdTdb,
    STOP_TIME: 'JD' + (startJdTdb + (count - 1) * stepDays),
    STEP_SIZE: stepDays + 'd',
  };
  console.log(body + ': ' + count + ' estados baricéntricos');
  const { targetSource, originSource, samples } = await queryHorizons(
    horizonsId,
    EPHEMERIS_ORIGINS.solarSystemBarycenter,
    query,
  );
  assert.equal(samples.length, count, body);
  const block = Buffer.alloc(count * EPHEMERIS_FORMAT.sampleBytes);
  for (const [index, [jd, ...components]] of samples.entries()) {
    assert.equal(jd, startJdTdb + index * stepDays, body);
    for (const [axis, value] of components.entries()) {
      block.writeDoubleLE(value, index * EPHEMERIS_FORMAT.sampleBytes + axis * 8);
    }
  }
  sampleBlocks.push({ body, horizonsId, query, targetSource, originSource, block });
}

const verificationQueries = [
  ...Object.keys(EPHEMERIS_BODIES).map((body) => [body, 'solarSystemBarycenter']),
  ['moon', 'earth'],
  ['earth', 'sun'],
];

for (const [body, origin] of verificationQueries) {
  const { horizonsId } = EPHEMERIS_BODIES[body];
  const originId = EPHEMERIS_ORIGINS[origin];
  console.log(body + ' / ' + origin + ': ' + validationDates.length + ' referencias');
  const { targetSource, originSource, samples } = await queryHorizons(
    horizonsId,
    originId,
    {
      TLIST_TYPE: 'JD',
      TLIST: validationDates.map((jd) => "'" + jd + "'").join(' '),
    },
  );
  assert.equal(samples.length, validationDates.length, body);
  assert.equal(
    targetSource,
    sampleBlocks.find((entry) => entry.body === body).targetSource,
  );
  for (const [index, [jd]] of samples.entries()) {
    assert.ok(Math.abs(jd - validationDates[index]) <= 1e-8);
  }
  references.push({
    body,
    origin,
    targetId: horizonsId,
    originId,
    targetSource,
    originSource,
    positionsKm: samples.map(([, x, y, z]) => [x, y, z]),
  });
}

const header = Buffer.alloc(EPHEMERIS_FORMAT.headerBytes);
header.writeUInt32LE(EPHEMERIS_FORMAT.magic);
const data = Buffer.concat([header, ...sampleBlocks.map(({ block }) => block)]);
const fixture = {
  endpoint,
  signatureVersion,
  retrievedUtcDate: new Date().toISOString().slice(0, 10),
  baseParameters,
  sampleOriginId: EPHEMERIS_ORIGINS.solarSystemBarycenter,
  coverage: EPHEMERIS_COVERAGE,
  assetSha256: createHash('sha256').update(data).digest('hex'),
  sampleQueries: sampleBlocks.map(
    ({ body, horizonsId, query, targetSource, originSource }) => ({
      body,
      targetId: horizonsId,
      query,
      targetSource,
      originSource,
    }),
  ),
  verification: { TLIST_TYPE: 'JD', datesJdTdb: validationDates, references },
};
await mkdir(new URL('../public/ephemeris/', import.meta.url), { recursive: true });
await mkdir(new URL('./fixtures/', import.meta.url), { recursive: true });
await writeFile(new URL('../public' + EPHEMERIS_ASSET_PATH, import.meta.url), data);
await writeFile(
  new URL('./fixtures/horizons-v1.json', import.meta.url),
  JSON.stringify(fixture, null, 2) + '\n',
);
console.log(data.length + ' bytes guardados; SHA-256: ' + fixture.assetSha256);
