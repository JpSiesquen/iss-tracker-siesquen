import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import type { GeodeticPosition } from '../lib/orbit';
import { LOCATION_REFRESH_INTERVAL_MS } from './constants';
import { fetchLocation } from './location';

export const ISS_LOCATION_QUERY_KEY = ['iss-location'] as const;

/**
 * El país, mar u océano bajo la ISS, a un ritmo independiente de la telemetría.
 *
 * La posición cambia cada segundo, pero un nombre geográfico cambia mucho más
 * despacio. El ref permite que cada consulta use las coordenadas más recientes
 * sin convertirlas en una clave nueva ni disparar una petición por render.
 */
export function useIssLocation(position: GeodeticPosition | null) {
  const positionRef = useRef(position);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  return useQuery({
    queryKey: ISS_LOCATION_QUERY_KEY,
    queryFn: () => {
      const current = positionRef.current;
      if (!current) throw new Error('No hay una posición que localizar.');
      return fetchLocation(current.latitude, current.longitude);
    },
    enabled: position !== null,
    refetchInterval: LOCATION_REFRESH_INTERVAL_MS,
    staleTime: LOCATION_REFRESH_INTERVAL_MS,
    retry: 1,
  });
}
