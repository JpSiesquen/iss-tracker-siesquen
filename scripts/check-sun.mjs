import assert from 'node:assert/strict';

import { subsolarPoint } from '../src/lib/sun.ts';

// Valores producidos antes de centralizar la normalización en la issue #112.
// Las fechas cubren el origen J2000, equinoccio, ambos solsticios y una
// longitud cercana al extremo positivo del rango.
const cases = [
  [
    '2000-01-01T12:00:00.000Z',
    { latitude: -23.033623907959207, longitude: 1.132731118518052 },
  ],
  [
    '2024-03-20T12:00:00.000Z',
    { latitude: -0.015344224524318396, longitude: 1.9647513861866628 },
  ],
  [
    '2024-06-20T20:51:00.000Z',
    { latitude: 23.43905479811584, longitude: -132.24076148947967 },
  ],
  [
    '2024-12-21T09:20:00.000Z',
    { latitude: -23.439032265496202, longitude: 39.61968495616219 },
  ],
  [
    '2030-11-01T00:00:00.000Z',
    { latitude: -14.201671569085766, longitude: 175.95217070110016 },
  ],
];

for (const [isoDate, expected] of cases) {
  assert.deepEqual(subsolarPoint(new Date(isoDate)), expected, isoDate);
}

console.log(`${cases.length} puntos subsolares conservaron sus valores exactos.`);
