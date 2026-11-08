import { useState } from 'react';

import {
  CATALOG_BODIES,
  CATALOG_FAMILIES,
  searchCatalog,
  type CatalogBody,
} from '../lib/solarCatalog';
import provenance from '../lib/catalog-sources.json';

const auFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 3 });

export default function SolarCatalogSearch({
  selected,
  distance,
  unavailable,
  error,
  onSelect,
  onRetry,
}: {
  selected: CatalogBody | null;
  distance: number | undefined;
  unavailable: boolean;
  error: boolean;
  onSelect: (body: CatalogBody) => void;
  onRetry: () => void;
}) {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('');
  const results = searchCatalog(query, family);

  return (
    <>
      <div className="solar-catalog__filters">
        <label>
          Buscar por nombre o ID
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Familia
          <select value={family} onChange={(event) => setFamily(event.target.value)}>
            <option value="">Todas</option>
            {Object.entries(CATALOG_FAMILIES).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p role="status">
        {results.length === 0
          ? 'Sin resultados en este catálogo.'
          : results.length + ' de ' + CATALOG_BODIES.length + ' astros'}
      </p>
      <ul>
        {results.map((body) => (
          <li key={body.id}>
            <button
              type="button"
              aria-pressed={body.id === selected?.id}
              onClick={() => onSelect(body)}
            >
              <span className="solar-catalog__dot" aria-hidden />
              <span>{body.label}</span>
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <div className="solar-catalog__provenance">
          <p>
            <strong>{selected.label}</strong> · {CATALOG_FAMILIES[selected.family]}
          </p>
          <p>ID · {selected.designation}</p>
          <p>NASA/JPL Horizons · {provenance.sources[selected.id]}</p>
          <p>Consulta de origen · {provenance.retrievedUtcDate}</p>
          <p>Vigencia · 2026-01-01 a 2029-01-01 TDB</p>
          {unavailable || distance === undefined ? (
            <p role="status">
              {unavailable
                ? 'Fecha fuera de cobertura.'
                : error
                  ? 'No pudimos cargar su efeméride.'
                  : 'Calculando posición…'}
            </p>
          ) : (
            <>
              <p>{auFormat.format(distance)} UA del Sol</p>
              <p>Posición del {new Date().toISOString().slice(0, 10)} UTC</p>
            </>
          )}
          {error && !unavailable && (
            <button className="solar-catalog__action" type="button" onClick={onRetry}>
              Reintentar
            </button>
          )}
        </div>
      )}
    </>
  );
}
