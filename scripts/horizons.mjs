import assert from 'node:assert/strict';

export const endpoint = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const userAgent =
  'ISS-Tracker-Ephemeris/1.0 (+https://github.com/JpSiesquen/iss-tracker-siesquen/issues/175)';
export const signatureVersion = '1.2';
export const baseParameters = {
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

export async function queryHorizons(targetId, originId, timeParameters) {
  const command = typeof targetId === 'number' ? String(targetId) : targetId.command;
  const url = new URL(endpoint);
  const parameters = {
    ...baseParameters,
    COMMAND: command,
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
      'Horizons HTTP ' + response.status + ' para ' + command + ' desde ' + originId,
    );
  }
  const { signature, error, result } = await response.json();
  assert.equal(signature?.source, 'NASA/JPL Horizons API');
  assert.equal(signature?.version, signatureVersion, 'Revisar el formato de Horizons');
  assert.ok(!error, error);

  assert.equal(typeof result, 'string');
  const [header, rowsAndFooter] = result.split('$$SOE');
  const [rows, footer] = rowsAndFooter?.split('$$EOE') ?? [];
  assert.ok(rows && footer, 'Falta el bloque de vectores');
  const target = header.match(/^Target body name:\s*(.*?)\s+\{source: ([^}]+)\}/m);
  assert.ok(target, 'Horizons omitió el nombre y la fuente del objeto.');
  const center = header.match(/^Center body name:.*\((\d+)\)\s+\{source: ([^}]+)\}/m);
  if (typeof targetId === 'number') {
    assert.ok(target[1].endsWith('(' + targetId + ')'));
  } else {
    assert.match(target[1], targetId.name);
  }
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

  return {
    targetName: target[1],
    targetSource: target[2],
    originSource: center[2],
    samples,
  };
}
