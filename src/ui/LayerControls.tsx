import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

import { Orbit, Lightbulb, RefreshCw, MapPin } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useUiStore } from '../store/ui';
import { ICON_SIZE, ICON_STROKE } from './constants';

/**
 * Los interruptores de las capas de la escena.
 *
 * ## Cómo se conectan con el 3D sin acoplarse
 *
 * Estos controles son HTML y viven fuera del `<Canvas>`; las capas que
 * encienden son objetos de Three.js que viven dentro. El store de Zustand es
 * lo único que los une.
 *
 * El interruptor **no sabe qué es una traza orbital**: cambia un booleano. Y
 * la traza no sabe que existe un interruptor: lee un booleano. Por eso añadir
 * una capa nueva es trivial — un campo en el store y una línea aquí.
 *
 * ## Menos es más
 *
 * Tres interruptores se entienden de un vistazo; ocho parecen un panel de
 * configuración y nadie los toca. Las referencias geográficas solo aparecen en
 * desarrollo, porque son una herramienta de verificación, no una capa.
 */
export function LayerControls() {
  /**
   * Un selector por campo, no el store entero.
   *
   * Podría hacerse `const { verOrbita, ... } = useUiStore()`, pero eso
   * suscribiría el componente a cualquier cambio del store. Con selectores
   * individuales solo se re-renderiza por lo que realmente usa.
   */
  const verOrbita = useUiStore((s) => s.verOrbita);
  const verLucesNocturnas = useUiStore((s) => s.verLucesNocturnas);
  const rotacionAutomatica = useUiStore((s) => s.rotacionAutomatica);
  const verReferencias = useUiStore((s) => s.verReferencias);

  const alternarOrbita = useUiStore((s) => s.alternarOrbita);
  const alternarLucesNocturnas = useUiStore((s) => s.alternarLucesNocturnas);
  const alternarRotacionAutomatica = useUiStore((s) => s.alternarRotacionAutomatica);
  const alternarReferencias = useUiStore((s) => s.alternarReferencias);

  return (
    <Paper
      component="section"
      aria-label="Capas de la escena"
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1,
        px: 2,
        py: 1.25,
        display: 'flex',
        flexDirection: 'column',
        /**
         * ⚠️ Al contrario que el panel de telemetría, este SÍ recibe el ratón:
         * es interactivo. El panel lleva `pointerEvents: none` porque solo
         * informa y no debe estorbar al girar el globo.
         */
      }}
    >
      <Typography
        component="h2"
        variant="caption"
        color="text.secondary"
        sx={{ letterSpacing: '0.08em', textTransform: 'uppercase', mb: 0.5 }}
      >
        Capas
      </Typography>

      <Interruptor
        icono={Orbit}
        etiqueta="Traza orbital"
        activo={verOrbita}
        onChange={alternarOrbita}
      />
      <Interruptor
        icono={Lightbulb}
        etiqueta="Luces nocturnas"
        activo={verLucesNocturnas}
        onChange={alternarLucesNocturnas}
      />
      <Interruptor
        icono={RefreshCw}
        etiqueta="Rotación automática"
        activo={rotacionAutomatica}
        onChange={alternarRotacionAutomatica}
      />

      {/* Herramienta de verificación de #28, no una capa del producto. */}
      {import.meta.env.DEV && (
        <Interruptor
          icono={MapPin}
          etiqueta="Puntos de referencia"
          activo={verReferencias}
          onChange={alternarReferencias}
        />
      )}
    </Paper>
  );
}

/**
 * Un interruptor con su etiqueta.
 *
 * `FormControlLabel` asocia el texto al control, de modo que pulsar sobre la
 * etiqueta también lo activa y un lector de pantalla lo anuncia junto al
 * estado. El `Switch` de MUI ya responde a tabulador y espacio: no hace falta
 * añadir nada para que funcione con teclado.
 */
function Interruptor({
  icono: Icono,
  etiqueta,
  activo,
  onChange,
}: {
  icono: LucideIcon;
  etiqueta: string;
  activo: boolean;
  onChange: () => void;
}) {
  return (
    <FormControlLabel
      control={<Switch size="small" checked={activo} onChange={onChange} />}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {/*
            ⚠️ El icono ACOMPAÑA al texto, no lo sustituye.

            Un icono de órbita no significa «mostrar la trayectoria» para quien
            lo ve por primera vez: es una adivinanza. Con el texto al lado, el
            icono ayuda a localizar la fila de un vistazo y no tiene que
            cargar con el significado.

            `aria-hidden` porque el texto ya dice lo que hay: sin él, un lector
            de pantalla anunciaría el icono y la etiqueta por separado.
          */}
          <Icono
            size={ICON_SIZE}
            strokeWidth={ICON_STROKE}
            aria-hidden
            style={{ opacity: activo ? 0.9 : 0.4 }}
          />
          {etiqueta}
        </Box>
      }
      slotProps={{ typography: { variant: 'body2' } }}
      sx={{ ml: 0, gap: 1 }}
    />
  );
}
