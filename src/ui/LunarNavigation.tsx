import Button from '@mui/material/Button';
import { Moon, Satellite } from 'lucide-react';

import './LunarNavigation.css';

const integerFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });

export function LunarNavigation({
  returnToIss,
  pending,
  error,
  distanceKm,
  onNavigate,
}: {
  returnToIss: boolean;
  pending: boolean;
  error: string | null;
  distanceKm: number | null;
  onNavigate: () => void;
}) {
  return (
    <div className="lunar-navigation">
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
        onClick={onNavigate}
      >
        {returnToIss ? 'Volver a la ISS' : 'Explorar la Luna'}
      </Button>
      {distanceKm !== null && (
        <div className="lunar-navigation__overview">
          <span className="lunar-navigation__title">Tierra y Luna</span>
          <span>{integerFormat.format(distanceKm)} km entre centros</span>
          <span>Discos ampliados</span>
        </div>
      )}
      <span
        className={pending || error ? 'lunar-navigation__status' : 'sr-only'}
        role="status"
      >
        {error ??
          (pending
            ? 'Cargando vista lunar…'
            : distanceKm !== null
              ? 'Vista Tierra y Luna.'
              : '')}
      </span>
    </div>
  );
}
