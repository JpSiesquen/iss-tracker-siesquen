import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

import { useIssTelemetry } from '../api/useIssTelemetry';
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
 * ## Colocación
 *
 * Arriba a la izquierda, nunca centrado: el globo es el protagonista y la zona
 * central es donde se mira.
 */
export function StatusPanel() {
  /**
   * Selector: este componente solo se re-renderiza si cambia `verPanel`,
   * no cuando se alterna la órbita o las referencias.
   */
  const verPanel = useUiStore((s) => s.verPanel);
  const posicion = useIssTelemetry();
  const { elementos, esObsoleto, edadMs, isError, isPending } = useTle();

  if (!verPanel) return null;

  if (isPending) {
    return (
      <PanelBase role="status" clave="cargando">
        <Box component="span" className="panel__punto panel__punto--cargando" />
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

  return (
    <PanelBase
      role="status"
      borderColor={esObsoleto ? 'rgb(255 159 10 / 0.45)' : undefined}
      clave="datos"
    >
      <Box
        component="span"
        className={`panel__punto ${esObsoleto ? 'panel__punto--aviso' : 'panel__punto--vivo'}`}
      />

      <Typography
        component="span"
        variant="caption"
        color="text.secondary"
        sx={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}
      >
        {elementos.OBJECT_NAME}
      </Typography>

      {/* Las coordenadas son el dato principal: mayor y con más peso. */}
      <Box className="panel__coords">
        {formatCoordinate(posicion.latitude, 'N', 'S')}{' '}
        {formatCoordinate(posicion.longitude, 'E', 'O')}
      </Box>

      <Dato etiqueta="Altitud" valor={formatAltitude(posicion.altitude)} />

      {/* Las dos velocidades dicen cosas distintas: km/h comunica magnitud a
          cualquiera, km/s es la cifra que usa quien conoce el tema. */}
      <Dato etiqueta="Velocidad" valor={formatSpeedKmh(posicion.speed)} />
      <Dato etiqueta="" valor={formatSpeedKms(posicion.speed)} />

      <span className={`panel__detalle ${esObsoleto ? 'panel__detalle--aviso' : ''}`}>
        Órbita {edadMs !== undefined ? formatAge(edadMs).replace('hace ', '') : '—'}
        {esObsoleto ? ' · sin actualizar' : ''}
      </span>
    </PanelBase>
  );
}

/** Una fila de etiqueta y valor. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
      <Box component="span" sx={{ color: 'text.secondary' }}>
        {etiqueta}
      </Box>
      <Box component="span">{valor}</Box>
    </Box>
  );
}

/**
 * La superficie del panel.
 *
 * Un `Paper` de MUI, que toma del tema el fondo translúcido, el
 * `backdropFilter` y el borde. Aquí no se repite ninguna de esas decisiones:
 * viven en `theme.ts` porque son del sistema, no de este componente.
 *
 * ⚠️ `pointerEvents: none` es lo único que no puede ir en el tema, porque es
 * propio de un panel superpuesto a una escena navegable: sin él, el panel
 * captura el ratón y el globo deja de girar por debajo.
 */
function PanelBase({
  children,
  role,
  borderColor,
  clave,
}: {
  children: ReactNode;
  role: string;
  borderColor?: string;
  clave: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <Paper
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
        component={motion.div}
        initial={{ opacity: 0, y: -MOTION_OFFSET }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -MOTION_OFFSET }}
        transition={{ duration: MOTION_DURATION, ease: 'easeOut' }}
        role={role}
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.4,
          px: 1.75,
          py: 1.25,
          minWidth: 210,
          fontSize: '0.8rem',
          lineHeight: 1.45,
          pointerEvents: 'none',
          ...(borderColor ? { borderColor } : {}),
        }}
      >
        {children}
      </Paper>
    </AnimatePresence>
  );
}
