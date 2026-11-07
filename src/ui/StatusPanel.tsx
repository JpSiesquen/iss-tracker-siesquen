import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { AnimatePresence, motion } from 'motion/react';
import type { AriaRole, ReactNode } from 'react';

import { useIssTelemetry } from '../api/useIssTelemetry';
import { useIssLocation } from '../api/useIssLocation';
import { MOTION_DURATION, MOTION_OFFSET } from './constants';
import { useTle } from '../api/useTle';
import { useUiStore } from '../store/ui';
import {
  formatAge,
  formatAltitude,
  formatCoordinate,
  formatSpeedKmh,
  formatSpeedKms,
} from './format';

import './StatusPanel.css';

/**
 * El panel de telemetría: dónde está la ISS, a qué altura y a qué velocidad.
 *
 * Es lo que convierte una animación bonita en una herramienta.
 *
 * ## Por qué va fuera del <Canvas>
 *
 * Es HTML normal, y dentro del Canvas solo viven objetos de Three.js. Se
 * superpone al globo con `position: absolute`.
 *
 * ## De dónde salen los números
 *
 * Del mismo cálculo SGP4 que mueve el marcador (#37), no de una API. Lo que se
 * lee aquí y lo que se ve ahí son el mismo dato, así que no pueden discrepar.
 *
 * ## Jerarquía visual
 *
 * La ubicación encabeza la barra inferior. Las coordenadas, las métricas y
 * la antigüedad de los elementos completan la lectura sin ocupar el centro.
 */
export function StatusPanel() {
  /**
   * Selector: este componente solo se re-renderiza si cambia `verPanel`,
   * no cuando se alterna la órbita o las referencias.
   */
  const verPanel = useUiStore((s) => s.verPanel);
  const posicion = useIssTelemetry();
  const ubicacion = useIssLocation(posicion);
  const { elementos, esObsoleto, edadMs, isError, isPending } = useTle();

  if (!verPanel) return null;

  if (isPending) {
    return (
      <PanelBase role="status" clave="cargando">
        <Box
          component="span"
          className="panel__punto panel__punto--cargando"
          aria-hidden="true"
        />
        Localizando la ISS…
      </PanelBase>
    );
  }

  /**
   * Sin elementos orbitales no se puede calcular nada.
   *
   * El mensaje responde tres cosas: qué pasó, qué se está haciendo y qué
   * significa. «Reintentando» no es un adorno — Query reintenta de verdad.
   */
  if (isError || !elementos || !posicion) {
    return (
      <PanelBase role="alert" borderColor="rgb(255 69 58 / 0.45)" clave="error">
        <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
          No se pudieron obtener los datos orbitales.
        </Typography>
        <span className="panel__detalle">Reintentando…</span>
      </PanelBase>
    );
  }

  const lugarDesactualizado = ubicacion.isRefetchError;
  const nombreUbicacion = ubicacion.data
    ? lugarDesactualizado
      ? ubicacion.data.nombre
      : `Sobre ${ubicacion.data.nombre}`
    : ubicacion.isError
      ? 'Ubicación no disponible'
      : 'Localizando…';
  const latitud = formatCoordinate(posicion.latitude, 'N', 'S');
  const longitud = formatCoordinate(posicion.longitude, 'E', 'O');

  return (
    <PanelBase
      role="region"
      ariaLabel="Telemetría actual de la ISS"
      borderColor={esObsoleto ? 'rgb(255 159 10 / 0.45)' : undefined}
      clave="datos"
    >
      <header className="panel__cabecera">
        <span className="panel__objeto">
          <Box
            component="span"
            className={`panel__punto ${
              esObsoleto ? 'panel__punto--aviso' : 'panel__punto--vivo'
            }`}
            aria-hidden="true"
          />
          {elementos.OBJECT_NAME}
        </span>

        {lugarDesactualizado && (
          <span className="panel__aviso-ubicacion">Último lugar conocido</span>
        )}
        <h2 className="panel__ubicacion">{nombreUbicacion}</h2>
        <span className="panel__coords" aria-hidden="true">
          {latitud} {longitud}
        </span>
        <span className="sr-only">
          Latitud {latitud}. Longitud {longitud}.
        </span>
      </header>

      <dl className="panel__metricas">
        <Dato etiqueta="Altitud" valor={formatAltitude(posicion.altitude)} />

        {/* Las dos velocidades dicen cosas distintas: km/h comunica magnitud a
            cualquiera, km/s es la cifra que usa quien conoce el tema. */}
        <Dato
          etiqueta="Velocidad"
          valor={formatSpeedKmh(posicion.speed)}
          valorSecundario={formatSpeedKms(posicion.speed)}
        />
      </dl>

      <footer className={`panel__pie ${esObsoleto ? 'panel__pie--aviso' : ''}`}>
        {/* Antigüedad de los ELEMENTOS, no de la posición: esa se propaga en
            local. El copy evita «Órbita», que sugería el periodo o un fallo. */}
        <span>Elementos orbitales</span>
        <span className="panel__edad">
          {edadMs !== undefined ? formatAge(edadMs) : '—'}
        </span>
        {esObsoleto && <span>Sin actualizar</span>}
      </footer>
    </PanelBase>
  );
}

/** Una fila de etiqueta y valor(es) de apoyo. */
function Dato({
  etiqueta,
  valor,
  valorSecundario,
}: {
  etiqueta: string;
  valor: string;
  valorSecundario?: string;
}) {
  return (
    <div className="panel__dato">
      <dt className="panel__etiqueta">{etiqueta}</dt>
      <dd className="panel__valores">
        <span className="panel__valor">{valor}</span>
        {valorSecundario ? (
          <span className="panel__valor-secundario">{valorSecundario}</span>
        ) : null}
      </dd>
    </div>
  );
}

/**
 * La superficie del panel.
 *
 * Comparte la superficie del pie con los controles y el crédito.
 */
function PanelBase({
  children,
  role,
  ariaLabel,
  borderColor,
  clave,
}: {
  children: ReactNode;
  role: AriaRole;
  ariaLabel?: string;
  borderColor?: string;
  clave: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        /**
         * ⚠️ Se anima el CAMBIO DE ESTADO, no el contenido.
         *
         * La `key` distinta por estado hace que React trate «cargando»,
         * «error» y «datos» como elementos diferentes, así que Motion puede
         * animar la salida de uno y la entrada del siguiente. Suaviza el salto
         * brusco entre no tener datos y tenerlos.
         *
         * Lo que NO se anima: los números de telemetría. Cambian cada segundo
         * y animarlos sería ruido constante, justo lo contrario de lo que se
         * busca en un dato que hay que poder leer.
         */
        key={clave}
        className="panel"
        data-estado={clave}
        initial={{ opacity: 0, y: MOTION_OFFSET }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: MOTION_OFFSET }}
        transition={{ duration: MOTION_DURATION, ease: 'easeOut' }}
        role={role}
        aria-label={ariaLabel}
        style={{ borderInlineStartColor: borderColor }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
