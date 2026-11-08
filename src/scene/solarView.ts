import { MathUtils } from 'three';

import { EARTH_RADIUS_KM } from '../lib/coordinates.ts';
import { KM_PER_AU, type EphemerisBody } from '../lib/ephemeris.ts';
import { frameDistance } from './camera.ts';
import { EARTH_TILT } from './constants.ts';
import { icrfToScene, lunarCameraRange, type LunarEphemeris } from './lunarView.ts';

export const SOLAR_BODIES = [
  { id: 'sun', label: 'Sol', color: '#ffb454', diameter: 30 },
  { id: 'mercury', label: 'Mercurio', color: '#a9a59f', diameter: 7 },
  { id: 'venus', label: 'Venus', color: '#e8bb78', diameter: 10 },
  { id: 'earth', label: 'Tierra', color: '#66b3ff', diameter: 10 },
  { id: 'mars', label: 'Marte', color: '#eb795a', diameter: 8 },
  { id: 'jupiter', label: 'Júpiter', color: '#e6aa83', diameter: 19 },
  { id: 'saturn', label: 'Saturno', color: '#e7ce9c', diameter: 25 },
  { id: 'uranus', label: 'Urano', color: '#a0dde3', diameter: 13 },
  { id: 'neptune', label: 'Neptuno', color: '#739cff', diameter: 13 },
] as const satisfies readonly {
  id: EphemerisBody;
  label: string;
  color: string;
  diameter: number;
}[];

export type SolarBodyId = (typeof SOLAR_BODIES)[number]['id'];
export type SolarDistances = ReadonlyMap<SolarBodyId, number>;

export const EARTH_RADII_PER_AU = KM_PER_AU / EARTH_RADIUS_KM;
export const ECLIPTIC_NORTH = icrfToScene([
  0,
  -Math.sin(EARTH_TILT),
  Math.cos(EARTH_TILT),
]);

const LUNAR_ZOOM_BUFFER = 1.12;
const SOLAR_SCROLL_RANGE = 5.2;
const SOLAR_FRAME_RADIUS_AU = 34;

export function solarCameraRange(aspect: number) {
  const lunar = lunarCameraRange(aspect);
  const frameAu = (au: number) => frameDistance(au * EARTH_RADII_PER_AU, aspect);
  return {
    ...lunar,
    solarStart: lunar.overview * LUNAR_ZOOM_BUFFER,
    solarEnd: lunar.overview * SOLAR_SCROLL_RANGE,
    solarRadius: frameAu(SOLAR_FRAME_RADIUS_AU),
    detailEnd: frameAu(0.04),
    focusStart: frameAu(0.55),
    focusEnd: frameAu(2.4),
  };
}

export function solarCameraFrame(
  zoom: number,
  range: ReturnType<typeof solarCameraRange>,
) {
  if (zoom <= range.solarStart) return { radius: zoom, focus: 0 };
  const progress = MathUtils.clamp(
    Math.log(zoom / range.solarStart) / Math.log(range.solarEnd / range.solarStart),
    0,
    1,
  );
  const expansion = progress ** 1.18;
  const radius = range.solarStart * (range.solarRadius / range.solarStart) ** expansion;
  return {
    radius,
    focus: MathUtils.smoothstep(radius, range.focusStart, range.focusEnd),
  };
}

export function solarPositionsAt(ephemeris: LunarEphemeris, jd: number) {
  const earth = ephemeris.position('earth', jd, 'sun', 'au');
  if (earth.status !== 'ok') return null;

  // El origen de render sigue en la Tierra. La cámara cambia su foco, no los ejes.
  const earthPosition = icrfToScene(earth.vector);
  return SOLAR_BODIES.map((body) => {
    const result =
      body.id === 'earth' ? earth : ephemeris.position(body.id, jd, 'sun', 'au');
    if (result.status !== 'ok') throw new Error('Efeméride solar fuera de cobertura.');
    const relativeToSun = icrfToScene(result.vector);
    return {
      ...body,
      distanceAu: relativeToSun.length(),
      position: relativeToSun.sub(earthPosition).multiplyScalar(EARTH_RADII_PER_AU),
    };
  });
}
