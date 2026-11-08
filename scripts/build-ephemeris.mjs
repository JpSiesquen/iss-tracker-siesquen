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

const endpoint = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const userAgent =
  'ISS-Tracker-Ephemeris/1.0 (+https://github.com/JpSiesquen/iss-tracker-siesquen/issues/172)';
const signatureVersion = '1.2';
const { startJdTdb, endJdTdb } = EPHEMERIS_COVERAGE;
const baseParameters = {
  format: 'json',
  OBJ_DATA: 'NO',
  MAKE_EPHEM: 'YES',
  EPHEM_TYPE: 'VECTORS',
  REF_PLANE: 'FRAME',
  REF_SYSTEM: 'ICRF',
  OUT_UNITS: 'KM-S',
  VEC_CORR: 'NONE',
  VEC_TABLE: '2',
  CSV_FORMAT: 'YES',
  TIME_TYPE: 'TDB',
};

// Fechas separadas por aproximadamente 46 días, con fases variadas de
// interpolación. Ninguna coincide con un nodo entero de la tabla.
const validationDates = Array.from({ length: 48 }, (_, index) => {
  const days = Math.floor(((index + 0.5) * (endJdTdb - startJdTdb)) / 48);
  const hour = 3 + (index % 7) * 3;
  return Number((startJdTdb + days + hour / 24).toFixed(9));
});

async function queryHorizons(targetId, originId, timeParameters) {
  const url = new URL(endpoint);
  const parameters = {
    ...baseParameters,
    COMMAND: String(targetId),
    CENTER: '500@' + originId,
    ...timeParameters,
  };
  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(
      key,
      key === 'format' || key === 'TLIST' ? value : "'" + value + "'",
    );
  }

  // Una petición a la vez. Ante un error o límite, se detiene la descarga.
  const response = await fetch(url, {
    headers: { 'User-Agent': userAgent },
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    throw new Error(
      'Horizons HTTP ' + response.status + ' para ' + targetId + ' desde ' + originId,
    );
  }
  const { signature, error, result } = await response.json();
  assert.equal(signature?.source, 'NASA/JPL Horizons API');
  assert.equal(signature?.version, signatureVersion, 'Revisar el formato de Horizons');
  assert.ok(!error, error);

  const [header, rowsAndFooter] = result.split('$$SOE');
  const [rows, footer] = rowsAndFooter?.split('$$EOE') ?? [];
  assert.ok(rows && footer, 'Falta el bloque de vectores');
  const target = header.match(/^Target body name:.*\((\d+)\)\s+\{source: ([^}]+)\}/m);
  const center = header.match(/^Center body name:.*\((\d+)\)\s+\{source: ([^}]+)\}/m);
  assert.equal(Number(target?.[1]), targetId);
  assert.equal(Number(center?.[1]), originId);
  assert.match(header, /Output units\s*:\s*KM-S/);
  assert.match(header, /Reference frame\s*:\s*ICRF/);
  assert.match(header, /Output type\s*:\s*GEOMETRIC cartesian states/);
  assert.match(header, /JDTDB/);

  const samples = rows
    .trim()
    .split(/\r?\n/)
    .map((row) => {
      const [jd, , ...components] = row.split(',');
      const values = components.slice(0, 6);
      assert.equal(values.length, 6);
      const state = [jd, ...values].map((value) => {
        assert.ok(value.trim());
        const number = Number(value);
        assert.ok(Number.isFinite(number));
        return number;
      });
      return state;
    });

  return { targetSource: target[2], originSource: center[2], samples };
}

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
