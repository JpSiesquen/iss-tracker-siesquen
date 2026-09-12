import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const assetsDirectory = fileURLToPath(new URL('../dist/assets/', import.meta.url));
const assetNames = await readdir(assetsDirectory);
const javascriptAssets = assetNames.filter((name) => name.endsWith('.js'));
assert.ok(javascriptAssets.length > 0, 'el build no produjo JavaScript');

const serverOnlyMarkers = [
  'celestrak.org/NORAD/elements',
  'x-tle-cache',
  '[api/tle]',
  'No se pudo contactar con Celestrak',
];

for (const assetName of javascriptAssets) {
  const contents = await readFile(join(assetsDirectory, assetName), 'utf8');
  for (const marker of serverOnlyMarkers) {
    assert.equal(
      contents.includes(marker),
      false,
      `código del servidor encontrado en ${assetName}: ${marker}`,
    );
  }
}

console.log(`${javascriptAssets.length} assets del cliente sin código del BFF.`);
