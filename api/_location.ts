import locationData from './_data/locations.json' with { type: 'json' };

type LocationKind = 'country' | 'marine';

export interface LocationResult {
  name: string;
  kind: LocationKind;
}

interface LocationFeature {
  n: string;
  b: number[];
  p: number[][][][];
}

const LONGITUDE_HALF_TURN = 180;
const LONGITUDE_FULL_TURN = 360;
const SEGMENT_EPSILON = 1e-9;

function longitudeNear(longitude: number, reference: number): number {
  let normalized = longitude;

  while (normalized - reference > LONGITUDE_HALF_TURN) normalized -= LONGITUDE_FULL_TURN;
  while (normalized - reference < -LONGITUDE_HALF_TURN) normalized += LONGITUDE_FULL_TURN;

  return normalized;
}

function isOnSegment(
  longitude: number,
  latitude: number,
  start: number[],
  end: number[],
): boolean {
  const startLongitude = longitudeNear(start[0], longitude);
  const endLongitude = longitudeNear(end[0], longitude);
  const crossProduct =
    (latitude - start[1]) * (endLongitude - startLongitude) -
    (longitude - startLongitude) * (end[1] - start[1]);

  if (Math.abs(crossProduct) > SEGMENT_EPSILON) return false;

  return (
    longitude >= Math.min(startLongitude, endLongitude) - SEGMENT_EPSILON &&
    longitude <= Math.max(startLongitude, endLongitude) + SEGMENT_EPSILON &&
    latitude >= Math.min(start[1], end[1]) - SEGMENT_EPSILON &&
    latitude <= Math.max(start[1], end[1]) + SEGMENT_EPSILON
  );
}

/** Ray casting con soporte explícito para anillos que cruzan ±180°. */
function isInsideRing(longitude: number, latitude: number, ring: number[][]): boolean {
  let inside = false;

  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index++
  ) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];

    if (isOnSegment(longitude, latitude, previousPoint, currentPoint)) return true;

    const currentLongitude = longitudeNear(currentPoint[0], longitude);
    const previousLongitude = longitudeNear(previousPoint[0], longitude);
    const crossesLatitude = currentPoint[1] > latitude !== previousPoint[1] > latitude;
    const intersectionLongitude =
      ((previousLongitude - currentLongitude) * (latitude - currentPoint[1])) /
        (previousPoint[1] - currentPoint[1]) +
      currentLongitude;

    if (crossesLatitude && longitude < intersectionLongitude) inside = !inside;
  }

  return inside;
}

function isInsidePolygon(
  longitude: number,
  latitude: number,
  rings: number[][][],
): boolean {
  const [outerRing, ...holes] = rings;
  if (!outerRing || !isInsideRing(longitude, latitude, outerRing)) return false;
  return !holes.some((hole) => isInsideRing(longitude, latitude, hole));
}

function bboxContains(longitude: number, latitude: number, bbox: number[]): boolean {
  return (
    longitude >= bbox[0] &&
    longitude <= bbox[2] &&
    latitude >= bbox[1] &&
    latitude <= bbox[3]
  );
}

function featureContains(
  feature: LocationFeature,
  longitude: number,
  latitude: number,
): boolean {
  if (!bboxContains(longitude, latitude, feature.b)) return false;
  return feature.p.some((polygon) => isInsidePolygon(longitude, latitude, polygon));
}

function findFeature(
  features: LocationFeature[],
  longitude: number,
  latitude: number,
): LocationFeature | undefined {
  return features.find((feature) => featureContains(feature, longitude, latitude));
}

/** Último recurso para puntos que caen justo fuera de la geometría marina aproximada. */
function oceanByCoordinates(longitude: number, latitude: number): string {
  if (latitude >= 66) return 'Océano Ártico';
  if (latitude <= -60) return 'Océano Antártico';
  if (longitude >= 20 && longitude <= 147 && latitude <= 30) return 'Océano Índico';
  if (longitude >= -70 && longitude <= 20) return 'Océano Atlántico';
  return 'Océano Pacífico';
}

export function locateCoordinates(latitude: number, longitude: number): LocationResult {
  const country = findFeature(locationData.countries, longitude, latitude);
  if (country) return { name: country.n, kind: 'country' };

  // La colección está ordenada de menor a mayor caja: un mar específico gana
  // al océano genérico que también lo contiene.
  const marine = findFeature(locationData.marine, longitude, latitude);
  if (marine) return { name: marine.n, kind: 'marine' };

  return { name: oceanByCoordinates(longitude, latitude), kind: 'marine' };
}
