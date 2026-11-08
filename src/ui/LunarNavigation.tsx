import Button from '@mui/material/Button';
import { Moon, Satellite, Sun } from 'lucide-react';

import type { CameraDestination } from '../scene/lunarView';
import { SOLAR_BODIES, type SolarBodyId, type SolarDistances } from '../scene/solarView';

import './LunarNavigation.css';

const integerFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
const auFormat = new Intl.NumberFormat('es', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

export function LunarNavigation({
  returnToIss,
  pending,
  error,
  distanceKm,
  solar,
  distances,
  selected,
  onSelect,
  onNavigate,
}: {
  returnToIss: boolean;
  pending: boolean;
  error: string | null;
  distanceKm: number | null;
  solar: boolean;
  distances: SolarDistances | null;
  selected: SolarBodyId | null;
  onSelect: (id: SolarBodyId) => void;
  onNavigate: (destination: CameraDestination) => void;
}) {
  return (
    <div className="lunar-navigation">
      <div className="lunar-navigation__actions">
        {(solar || distanceKm !== null) && (
          <Button
            type="button"
            variant="outlined"
            color="inherit"
            className="lunar-navigation__button"
            startIcon={
              solar ? <Moon size={16} aria-hidden /> : <Sun size={16} aria-hidden />
            }
            onClick={() => onNavigate(solar ? 'moon' : 'solar')}
          >
            {solar ? 'Tierra y Luna' : 'Sistema solar'}
          </Button>
        )}
        <Button
          type="button"
          variant="outlined"
          color="inherit"
          className="lunar-navigation__button"
          startIcon={
            returnToIss ? (
              <Satellite size={16} aria-hidden />
            ) : (
              <Moon size={16} aria-hidden />
            )
          }
          onClick={() => onNavigate(returnToIss ? 'iss' : 'moon')}
        >
          {returnToIss ? 'Volver a la ISS' : 'Explorar la Luna'}
        </Button>
      </div>

      {solar ? (
        <div className="lunar-navigation__overview">
          <span className="lunar-navigation__title">Sistema solar</span>
          <span>Marcadores ampliados</span>
          <span>Anillos de referencia en UA</span>
        </div>
      ) : (
        distanceKm !== null && (
          <div className="lunar-navigation__overview">
            <span className="lunar-navigation__title">Tierra y Luna</span>
            <span>{integerFormat.format(distanceKm)} km entre centros</span>
            <span>Discos ampliados</span>
          </div>
        )
      )}

      {solar && distances && (
        <details className="solar-catalog">
          <summary>Astros y distancias</summary>
          <p>Distancia al Sol</p>
          <ul>
            {SOLAR_BODIES.map(({ id, label, color }) => {
              const distance = distances.get(id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-pressed={id === selected}
                    onClick={() => onSelect(id)}
                  >
                    <span
                      className="solar-catalog__dot"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <span>{label}</span>
                    <span className="solar-catalog__distance">
                      {distance === undefined ? '—' : auFormat.format(distance) + ' UA'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <span
        className={pending || error ? 'lunar-navigation__status' : 'sr-only'}
        role="status"
      >
        {error ??
          (pending
            ? 'Cargando efemérides…'
            : solar
              ? 'Vista del sistema solar.'
              : distanceKm !== null
                ? 'Vista Tierra y Luna.'
                : '')}
      </span>
    </div>
  );
}
