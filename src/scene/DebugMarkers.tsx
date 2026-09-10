import { latLonToVector3 } from '../lib/coordinates';
import { DEBUG_MARKER_RADIUS, DEBUG_MARKER_SIZE } from './constants';

/**
 * Puntos de referencia conocidos, para verificar a ojo la conversión de
 * coordenadas contra la textura.
 *
 * La verificación numérica (contra el mapeo UV de la geometría y contra
 * haversine) demuestra que la fórmula es correcta, pero no que la TEXTURA esté
 * enrollada como se espera. Solo mirar puede confirmar eso.
 */
const REFERENCIAS = [
  { nombre: 'Golfo de Guinea', lat: 0, lon: 0, color: '#ff3b30' },
  { nombre: 'Polo Norte', lat: 90, lon: 0, color: '#ffffff' },
  { nombre: 'Polo Sur', lat: -90, lon: 0, color: '#8e8e93' },
  { nombre: 'Lima', lat: -12.05, lon: -77.04, color: '#34c759' },
  { nombre: 'Yakarta', lat: -6.2, lon: 106.8, color: '#ff9500' },
] as const;

/**
 * Marcadores de depuración sobre puntos geográficos conocidos.
 *
 * ⚠️ No se renderiza en producción: va tras `import.meta.env.DEV`, que Vite
 * sustituye por una constante al compilar, de modo que el minificador elimina
 * el bloque entero.
 *
 * Los marcadores son hijos del mesh que rota, a diferencia de la ISS: un punto
 * fijo de la superficie SÍ debe girar con ella. Es justo el caso contrario al
 * del satélite, y por eso conviene tenerlos a la vista al montar el marcador
 * en la issue #29.
 */
export function DebugMarkers() {
  return (
    <>
      {REFERENCIAS.map(({ nombre, lat, lon, color }) => (
        <mesh key={nombre} position={latLonToVector3(lat, lon, DEBUG_MARKER_RADIUS)}>
          <sphereGeometry args={[DEBUG_MARKER_SIZE, 12, 12]} />
          {/* MeshBasicMaterial NO obedece a la luz: un marcador de referencia
              debe verse igual en la cara diurna y en la nocturna. */}
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </>
  );
}
