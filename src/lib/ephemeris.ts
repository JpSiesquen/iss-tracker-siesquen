export const EPHEMERIS_ASSET_PATH = '/ephemeris/horizons-2025-2031-v1.bin';

export const EPHEMERIS_COVERAGE = {
  startJdTdb: 2460676.5, // 2025-01-01 00:00 TDB
  endJdTdb: 2462867.5, // 2031-01-01 00:00 TDB
} as const;

// El orden de los bloques forma parte del formato del archivo v1.
export const EPHEMERIS_BODIES = {
  sun: { horizonsId: 10, stepDays: 8 },
  mercury: { horizonsId: 199, stepDays: 1 },
  venus: { horizonsId: 299, stepDays: 2 },
  earth: { horizonsId: 399, stepDays: 2 },
  moon: { horizonsId: 301, stepDays: 1 },
  mars: { horizonsId: 499, stepDays: 4 },
  jupiter: { horizonsId: 599, stepDays: 1 },
  saturn: { horizonsId: 699, stepDays: 2 },
  uranus: { horizonsId: 799, stepDays: 2 },
  neptune: { horizonsId: 899, stepDays: 2 },
} as const;

export type EphemerisBody = keyof typeof EPHEMERIS_BODIES;
export type EphemerisOrigin = 'solarSystemBarycenter' | 'sun' | 'earth';
export type EphemerisUnit = 'km' | 'au';
type Vector = [x: number, y: number, z: number];

export const EPHEMERIS_ORIGINS = {
  solarSystemBarycenter: 0,
  sun: EPHEMERIS_BODIES.sun.horizonsId,
  earth: EPHEMERIS_BODIES.earth.horizonsId,
} as const satisfies Record<EphemerisOrigin, number>;

export const EPHEMERIS_FORMAT = {
  magic: 0x31565a48, // ASCII HZV1
  headerBytes: 4,
  sampleBytes: 6 * Float64Array.BYTES_PER_ELEMENT,
} as const;

const SECONDS_PER_DAY = 86_400;
export const KM_PER_AU = 149_597_870.7;
const { startJdTdb, endJdTdb } = EPHEMERIS_COVERAGE;
const { headerBytes, sampleBytes, magic } = EPHEMERIS_FORMAT;

export function ephemerisSampleCount(stepDays: number): number {
  return Math.ceil((endJdTdb - startJdTdb) / stepDays) + 1;
}

export function interpolateEphemeris(
  data: DataView,
  offset: number,
  sampleCount: number,
  stepDays: number,
  elapsedDays: number,
): Vector {
  const elapsedSteps = elapsedDays / stepDays;
  const index = Math.min(Math.floor(elapsedSteps), sampleCount - 2);
  const left = offset + index * sampleBytes;
  const right = left + sampleBytes;

  // Hermite cúbica con las posiciones y velocidades en ambos extremos.
  const t = elapsedSteps - index;
  const t2 = t * t;
  const t3 = t2 * t;
  const h01 = 3 * t2 - 2 * t3;
  const duration = stepDays * SECONDS_PER_DAY;
  const h10 = (t3 - 2 * t2 + t) * duration;
  const h11 = (t3 - t2) * duration;
  const vector: Vector = [0, 0, 0];
  for (let axis = 0; axis < vector.length; axis++) {
    const position = axis * Float64Array.BYTES_PER_ELEMENT;
    const velocity = position + 3 * Float64Array.BYTES_PER_ELEMENT;
    const p0 = data.getFloat64(left + position, true);
    const p1 = data.getFloat64(right + position, true);
    const v0 = data.getFloat64(left + velocity, true);
    const v1 = data.getFloat64(right + velocity, true);
    vector[axis] = p0 + h01 * (p1 - p0) + h10 * v0 + h11 * v1;
  }
  return vector;
}

export type EphemerisPosition =
  | {
      status: 'ok';
      target: EphemerisBody;
      targetCenter: 'physical';
      origin: EphemerisOrigin;
      unit: EphemerisUnit;
      vector: Vector;
    }
  | { status: 'out-of-coverage' };

/**
 * Lee una versión local de los estados geométricos de Horizons. El argumento
 * temporal es un día juliano TDB. Los ejes ICRF se conservan al cambiar de origen.
 */
export function createEphemeris(buffer: ArrayBuffer) {
  const data = new DataView(buffer);
  const offsets = new Map<string, number>();
  let nextOffset: number = headerBytes;

  for (const [body, { stepDays }] of Object.entries(EPHEMERIS_BODIES)) {
    offsets.set(body, nextOffset);
    nextOffset += ephemerisSampleCount(stepDays) * sampleBytes;
  }
  if (data.byteLength !== nextOffset || data.getUint32(0, true) !== magic) {
    throw new Error('Archivo de efemérides incompatible con el formato HZV1.');
  }

  function barycentricPosition(body: EphemerisBody, jdTdb: number): Vector {
    const stepDays = EPHEMERIS_BODIES[body].stepDays;
    return interpolateEphemeris(
      data,
      offsets.get(body)!,
      ephemerisSampleCount(stepDays),
      stepDays,
      jdTdb - startJdTdb,
    );
  }

  return {
    frame: 'ICRF',
    timeScale: 'TDB',
    coverage: EPHEMERIS_COVERAGE,
    position(
      target: EphemerisBody,
      jdTdb: number,
      origin: EphemerisOrigin = 'solarSystemBarycenter',
      unit: EphemerisUnit = 'km',
    ): EphemerisPosition {
      if (!Number.isFinite(jdTdb) || jdTdb < startJdTdb || jdTdb > endJdTdb) {
        return { status: 'out-of-coverage' };
      }

      const vector = barycentricPosition(target, jdTdb);
      const center =
        origin === 'solarSystemBarycenter'
          ? [0, 0, 0]
          : barycentricPosition(origin, jdTdb);
      const scale = unit === 'au' ? KM_PER_AU : 1;
      return {
        status: 'ok',
        target,
        targetCenter: 'physical',
        origin,
        unit,
        vector: [
          (vector[0] - center[0]) / scale,
          (vector[1] - center[1]) / scale,
          (vector[2] - center[2]) / scale,
        ],
      };
    },
  } as const;
}
