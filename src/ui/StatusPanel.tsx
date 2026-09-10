import { ISS_STALE_WARNING_MS } from '../api/constants';
import { formatAge, useDataAge } from '../api/useDataAge';
import { useIssPosition } from '../api/useIssPosition';
import { useTle } from '../api/useTle';

import './StatusPanel.css';

/**
 * Avisos de carga, error y antigüedad del dato.
 *
 * ## Por qué va fuera del <Canvas>
 *
 * Es HTML normal, y dentro del Canvas solo viven objetos de Three.js. Se
 * superpone al globo con CSS. Son dos árboles que conviven: React DOM fuera,
 * R3F dentro.
 *
 * ## Por qué llama a useIssPosition en vez de recibir props
 *
 * La `queryKey` de #27 hace que dos componentes que pidan el mismo dato
 * compartan UNA petición y una copia. Este panel y el marcador 3D consultan lo
 * mismo sin coordinarse ni duplicar tráfico — comprobado en #27: tres
 * observadores, cero peticiones extra.
 */
export function StatusPanel() {
  const { data, isPending, isError, error, dataUpdatedAt } = useIssPosition();
  const antiguedad = useDataAge(dataUpdatedAt || undefined);

  /**
   * Primera carga: todavía no hay ningún dato.
   *
   * ⚠️ `isPending`, no `isFetching`. `isFetching` también es cierto durante
   * los refrescos de cada cinco segundos, así que usarlo aquí haría parpadear
   * el aviso continuamente aunque todo funcione. Esa distinción se midió en
   * #27: `isPending` vuelve a true 0 veces tras el primer dato.
   */
  if (isPending) {
    return (
      <div className="panel panel--info" role="status">
        <span className="panel__punto panel__punto--cargando" />
        Localizando la ISS…
      </div>
    );
  }

  /**
   * Error sin ningún dato previo: no hay nada que enseñar.
   *
   * El mensaje responde tres cosas: qué pasó, qué se está haciendo y qué
   * significa. «Reintentando» no es un adorno: Query reintenta de verdad, y
   * el refresco de cinco segundos sigue activo.
   */
  if (isError && !data) {
    return (
      <div className="panel panel--error" role="alert">
        <strong>No se pudo obtener la posición de la ISS.</strong>
        <span className="panel__detalle">
          Reintentando… {error instanceof Error ? error.message : ''}
        </span>
      </div>
    );
  }

  if (!data) return null;

  /**
   * Hay datos, pero puede que viejos.
   *
   * Este es el fallo peculiar de un tracker en vivo: si la conexión se corta,
   * la última posición conocida se queda en pantalla **como si fuera actual**.
   * El usuario ve un dato de hace minutos creyendo que es de ahora.
   *
   * En datos en vivo, la antigüedad del dato es parte del dato.
   */
  const viejo = antiguedad !== null && antiguedad > ISS_STALE_WARNING_MS;

  return (
    <div
      className={`panel ${viejo || isError ? 'panel--aviso' : 'panel--ok'}`}
      role="status"
    >
      <span
        className={`panel__punto ${viejo || isError ? 'panel__punto--aviso' : 'panel__punto--vivo'}`}
      />

      <span className="panel__coords">
        {formatCoord(data.latitude, 'N', 'S')} {formatCoord(data.longitude, 'E', 'O')}
      </span>

      <span className="panel__detalle">
        {data.altitude.toFixed(0)} km · {(data.velocity / 3600).toFixed(2)} km/s
      </span>

      <span className="panel__detalle">
        {viejo || isError ? 'Última posición conocida: ' : 'Actualizado '}
        {antiguedad !== null ? formatAge(antiguedad) : ''}
      </span>

      <TleEstado />
    </div>
  );
}

/**
 * Estado de los elementos orbitales que sirve el BFF.
 *
 * ## Por qué es un componente aparte y no unas líneas más arriba
 *
 * Porque su ritmo es distinto. La posición se refresca cada cinco segundos y
 * repinta el panel; los elementos se piden una vez cada seis horas. Aislarlos
 * en su propio componente evita que un dato que no cambia se vuelva a
 * renderizar sesenta veces por hora sin motivo.
 *
 * Es la misma idea que separa las dos consultas: **datos distintos, ritmos
 * distintos.**
 *
 * ## Qué muestra
 *
 * Solo se hace notar cuando hay algo que decir. Con todo en orden basta con el
 * nombre del objeto y la antigüedad de sus elementos; si el BFF no pudo
 * actualizar y está sirviendo el último dato conocido, lo dice.
 */
function TleEstado() {
  const { elementos, esObsoleto, edadMs, isError } = useTle();

  if (isError) {
    return (
      <span className="panel__detalle panel__detalle--aviso">Sin datos orbitales</span>
    );
  }

  if (!elementos) return null;

  return (
    <span className={`panel__detalle ${esObsoleto ? 'panel__detalle--aviso' : ''}`}>
      {elementos.OBJECT_NAME} · órbita{' '}
      {edadMs !== undefined ? formatAge(edadMs).replace('hace ', '') : '—'}
      {esObsoleto ? ' (sin actualizar)' : ''}
    </span>
  );
}

/**
 * Formatea una coordenada con su hemisferio.
 *
 * Se usa el signo para elegir la letra en vez de mostrarlo: «12.05° S» se lee
 * mejor que «-12.05°», y es como lo escriben las cartas náuticas.
 */
function formatCoord(valor: number, positivo: string, negativo: string) {
  return `${Math.abs(valor).toFixed(2)}° ${valor >= 0 ? positivo : negativo}`;
}
