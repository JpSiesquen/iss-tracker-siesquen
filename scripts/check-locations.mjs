import assert from 'node:assert/strict';

import { locateCoordinates } from '../api/_location.ts';

const cases = [
  ['Lima', -12.0464, -77.0428, 'Perú', 'country'],
  ['Pacífico central', 0, -140, 'Océano Pacífico', 'marine'],
  ['Amazonas', -3.4653, -62.2159, 'Brasil', 'country'],
  ['Mar del Norte', 56, 3, 'Mar del Norte', 'marine'],
  ['Tokio', 35.6762, 139.6503, 'Japón', 'country'],
  ['El Cairo', 30.0444, 31.2357, 'Egipto', 'country'],
  ['Sídney', -33.8688, 151.2093, 'Australia', 'country'],
  ['Ciudad del Cabo', -33.9249, 18.4241, 'Sudáfrica', 'country'],
  ['Lesoto', -29.61, 28.23, 'Lesoto', 'country'],
  ['Fiyi al este de ±180°', -17.7134, 178.065, 'Fiyi', 'country'],
  ['Fiyi al oeste de ±180°', -16.3, -179.9, 'Fiyi', 'country'],
  ['Antimeridiano este', 0, 179.9, 'Océano Pacífico', 'marine'],
  ['Antimeridiano oeste', 0, -179.9, 'Océano Pacífico', 'marine'],
];

for (const [description, latitude, longitude, expectedName, expectedKind] of cases) {
  const actual = locateCoordinates(latitude, longitude);
  assert.deepEqual(actual, { name: expectedName, kind: expectedKind }, description);
}

console.log(`${cases.length} ubicaciones verificadas.`);
