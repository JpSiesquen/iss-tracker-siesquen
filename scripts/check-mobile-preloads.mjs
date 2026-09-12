import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  DESKTOP_EARTH_TEXTURE_PATHS,
  MOBILE_EARTH_TEXTURE_PATHS,
  MOBILE_PERFORMANCE_MEDIA_QUERY,
} from '../src/scene/constants.ts';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const linkTags = [...html.matchAll(/<link\b[^>]*>/g)].map(([tag]) => tag);

function attribute(tag, name) {
  return tag.match(new RegExp(`${name}="([^"]+)"`))?.[1];
}

const imagePreloads = linkTags
  .filter(
    (tag) => attribute(tag, 'rel') === 'preload' && attribute(tag, 'as') === 'image',
  )
  .map((tag) => ({
    href: attribute(tag, 'href'),
    media: attribute(tag, 'media'),
  }));

assert.deepEqual(
  imagePreloads.map(({ href }) => href),
  MOBILE_EARTH_TEXTURE_PATHS,
  'index.html debe precargar una vez y en orden las cuatro texturas móviles',
);

assert.ok(
  imagePreloads.every(({ media }) => media === MOBILE_PERFORMANCE_MEDIA_QUERY),
  'cada precarga debe reutilizar exactamente la media query del perfil móvil',
);

assert.ok(
  DESKTOP_EARTH_TEXTURE_PATHS.every(
    (desktopPath) => !imagePreloads.some(({ href }) => href === desktopPath),
  ),
  'index.html no debe precargar texturas de escritorio',
);

console.log('4 precargas móviles coinciden con la escena; escritorio queda fuera.');
