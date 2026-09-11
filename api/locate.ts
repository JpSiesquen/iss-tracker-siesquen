import { z } from 'zod';

import { locateCoordinates } from './_location.js';

const coordinateParameter = z
  .string()
  .trim()
  .min(1)
  .transform(Number)
  .pipe(z.number().finite());

const querySchema = z.object({
  lat: coordinateParameter.pipe(z.number().min(-90).max(90)),
  lon: coordinateParameter.pipe(z.number().min(-180).max(180)),
});

/** Geocodificación inversa local: `GET /api/locate?lat=&lon=`. */
export function GET(request: Request): Response {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    lat: url.searchParams.get('lat') ?? undefined,
    lon: url.searchParams.get('lon') ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: 'Las coordenadas deben estar dentro de los rangos válidos.' },
      { status: 400, headers: { 'cache-control': 'no-store' } },
    );
  }

  const location = locateCoordinates(parsed.data.lat, parsed.data.lon);

  return Response.json(
    { nombre: location.name, tipo: location.kind },
    {
      headers: {
        'cache-control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  );
}
