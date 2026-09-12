import assert from 'node:assert/strict';

import { ommSchema } from '../shared/omm.ts';
import { tleResponseSchema } from '../src/api/tle.ts';

const validOmm = {
  OBJECT_NAME: 'ISS (ZARYA)',
  OBJECT_ID: '1998-067A',
  ELEMENT_SET_NO: 999,
  EPOCH: '2026-09-11T12:00:00.000000',
  NORAD_CAT_ID: 25544,
  MEAN_MOTION: 15.5,
  ECCENTRICITY: 0.0005,
  INCLINATION: 51.64,
  RA_OF_ASC_NODE: 120,
  ARG_OF_PERICENTER: 80,
  MEAN_ANOMALY: 280,
  BSTAR: 0.0001,
  MEAN_MOTION_DOT: 0.0002,
  MEAN_MOTION_DDOT: 0,
};

const validResponse = {
  elementos: validOmm,
  descargadoEn: 1_789_117_200_000,
  edadMs: 0,
  fuente: 'celestrak.org',
};

assert.equal(Object.keys(ommSchema.shape).length, 14, 'cantidad de campos OMM');
assert.equal(ommSchema.safeParse(validOmm).success, true, 'OMM válido en el BFF');
assert.equal(
  tleResponseSchema.safeParse(validResponse).success,
  true,
  'OMM válido en el cliente',
);

const invalidOmm = { ...validOmm, INCLINATION: 200 };
assert.equal(ommSchema.safeParse(invalidOmm).success, false, 'OMM inválido en el BFF');
assert.equal(
  tleResponseSchema.safeParse({ ...validResponse, elementos: invalidOmm }).success,
  false,
  'OMM inválido en el cliente',
);

console.log('El esquema OMM compartido valida las dos fronteras.');
