import { z } from 'zod';

const LOCATION_ENDPOINT = '/api/locate';
const CACHE_COORDINATE_STEP = 0.25;

export const locationResponseSchema = z.object({
  nombre: z.string().min(1),
  tipo: z.enum(['country', 'marine']),
});

export type LocationResponse = z.infer<typeof locationResponseSchema>;

function cacheCoordinate(value: number): number {
  return Math.round(value / CACHE_COORDINATE_STEP) * CACHE_COORDINATE_STEP;
}

export async function fetchLocation(
  latitude: number,
  longitude: number,
): Promise<LocationResponse> {
  const query = new URLSearchParams({
    lat: String(cacheCoordinate(latitude)),
    lon: String(cacheCoordinate(longitude)),
  });
  const response = await fetch(`${LOCATION_ENDPOINT}?${query}`);

  if (!response.ok) {
    throw new Error(`El servicio de ubicación respondió ${response.status}`);
  }

  const data: unknown = await response.json();
  return locationResponseSchema.parse(data);
}
