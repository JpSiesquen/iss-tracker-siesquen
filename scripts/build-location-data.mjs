import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const NATURAL_EARTH_REVISION = 'ca96624a56bd078437bca8184e78163e5039ad19';
const COORDINATE_DECIMALS = 2;

const sources = [
  {
    key: 'countries',
    kind: 'country',
    scale: '1:110m',
    file: 'ne_110m_admin_0_countries.geojson',
    sha256: '6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f',
  },
  {
    key: 'marine',
    kind: 'marine',
    scale: '1:50m',
    file: 'ne_50m_geography_marine_polys.geojson',
    sha256: '6fe58083e0cc5c7fad9e396970e28a8580bbd8770cfa4d1d7b5a34423e912f97',
  },
];

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDirectory, '../api/_data/locations.json');

function sourceUrl(file) {
  return `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NATURAL_EARTH_REVISION}/geojson/${file}`;
}

async function download(source) {
  const response = await fetch(sourceUrl(source.file));

  if (!response.ok) {
    throw new Error(`Natural Earth respondió ${response.status} para ${source.file}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = createHash('sha256').update(bytes).digest('hex');

  if (digest !== source.sha256) {
    throw new Error(`SHA-256 inesperado para ${source.file}: ${digest}`);
  }

  return JSON.parse(bytes.toString('utf8'));
}

function round(value) {
  return Number(value.toFixed(COORDINATE_DECIMALS));
}

function roundPosition(position) {
  return [round(position[0]), round(position[1])];
}

function roundRing(ring) {
  const rounded = ring.map(roundPosition).filter((position, index, positions) => {
    if (index === 0) return true;
    const previous = positions[index - 1];
    return position[0] !== previous[0] || position[1] !== previous[1];
  });

  const first = rounded[0];
  const last = rounded.at(-1);
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    rounded.push([...first]);
  }

  return rounded;
}

function normalizePolygons(geometry) {
  const polygons =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map((polygon) => polygon.map(roundRing));
}

function spanishName(feature, kind) {
  const properties = feature.properties;
  const localized = kind === 'country' ? properties.NAME_ES : properties.name_es;
  const fallback = kind === 'country' ? properties.NAME : properties.name;
  const name = localized && localized !== '-99' ? localized : fallback;
  const cleaned = name.trim().replace(/\.$/, '');
  return cleaned.charAt(0).toLocaleUpperCase('es') + cleaned.slice(1);
}

function bboxArea(bbox) {
  return (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]);
}

function reduceCollection(collection, kind) {
  return collection.features
    .map((feature) => ({
      n: spanishName(feature, kind),
      b: feature.bbox.map(round),
      p: normalizePolygons(feature.geometry),
    }))
    .sort((left, right) => bboxArea(left.b) - bboxArea(right.b));
}

const downloaded = await Promise.all(sources.map(download));
const data = {
  meta: {
    source: 'Natural Earth',
    revision: NATURAL_EARTH_REVISION,
    coordinateDecimals: COORDINATE_DECIMALS,
    datasets: Object.fromEntries(
      sources.map((source) => [source.key, { file: source.file, scale: source.scale }]),
    ),
  },
  countries: reduceCollection(downloaded[0], 'country'),
  marine: reduceCollection(downloaded[1], 'marine'),
};

const serialized = JSON.stringify(data);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${serialized}\n`);

console.log(
  JSON.stringify(
    {
      output: outputPath,
      countries: data.countries.length,
      marineAreas: data.marine.length,
      bytes: Buffer.byteLength(serialized),
      gzipBytes: gzipSync(serialized).byteLength,
    },
    null,
    2,
  ),
);
