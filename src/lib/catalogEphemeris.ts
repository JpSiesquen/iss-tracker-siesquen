import { EPHEMERIS_FORMAT, interpolateEphemeris } from './ephemeris.ts';
import type { CatalogBody, CatalogBodyId } from './solarCatalog.ts';

export const CATALOG_COVERAGE = {
  startJdTdb: 2461041.5, // 2026-01-01 00:00 TDB
  endJdTdb: 2462137.5, // 2029-01-01 00:00 TDB
} as const;

const { startJdTdb, endJdTdb } = CATALOG_COVERAGE;
const { sampleBytes } = EPHEMERIS_FORMAT;
export const CATALOG_MAGIC = 0x31435a48; // ASCII HZC1
export const CATALOG_HEADER_BYTES = 8;

export function catalogBodyCode(id: CatalogBodyId) {
  return Array.from(id).reduceRight(
    (code, letter) => (Math.imul(code, 31) + letter.charCodeAt(0)) >>> 0,
    0,
  );
}

export function catalogAssetPath(id: CatalogBodyId) {
  return '/ephemeris/catalog-v1-' + id + '.bin';
}

export function catalogSampleCount(stepDays: number) {
  return Math.ceil((endJdTdb - startJdTdb) / stepDays) + 1;
}

export function hasCatalogCoverage(jdTdb: number) {
  return jdTdb >= startJdTdb && jdTdb <= endJdTdb;
}

export function createCatalogEphemeris(buffer: ArrayBuffer, body: CatalogBody) {
  const data = new DataView(buffer);
  const count = catalogSampleCount(body.stepDays);
  if (
    data.byteLength !== CATALOG_HEADER_BYTES + count * sampleBytes ||
    data.getUint32(0, true) !== CATALOG_MAGIC ||
    data.getUint32(4, true) !== catalogBodyCode(body.id)
  ) {
    throw new Error('Archivo del catálogo incompatible con el formato HZC1.');
  }
  for (let offset = CATALOG_HEADER_BYTES; offset < data.byteLength; offset += 8) {
    if (!Number.isFinite(data.getFloat64(offset, true))) {
      throw new Error('El catálogo contiene un estado orbital inválido.');
    }
  }
  return {
    body,
    barycentricPosition(jdTdb: number) {
      if (!hasCatalogCoverage(jdTdb)) return null;
      return interpolateEphemeris(
        data,
        CATALOG_HEADER_BYTES,
        count,
        body.stepDays,
        jdTdb - startJdTdb,
      );
    },
  };
}

export type CatalogEphemeris = ReturnType<typeof createCatalogEphemeris>;
