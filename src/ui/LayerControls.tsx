import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Switch from '@mui/material/Switch';

import { Lightbulb, MapPin, Orbit, RefreshCw, SlidersHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';

import { useUiStore } from '../store/ui';
import { ICON_SIZE, ICON_STROKE } from './constants';

import './LayerControls.css';

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
 * ## Instrumento, no settings
 *
 * Misma tipografía y ritmo que el panel de telemetría: eyebrow, filas densas,
 * acento amarillo ISS. Sigue siendo un `Switch` accesible con etiqueta de
 * texto; solo cambia el chrome.
 *
 * ## Menos es más
 *
 * Tres interruptores se entienden de un vistazo; ocho parecen un panel de
 * configuración y nadie los toca. Las referencias geográficas solo aparecen en
 * desarrollo, porque son una herramienta de verificación, no una capa.
 */
export function LayerControls() {
  const [abierto, setAbierto] = useState(false);
  const activador = useRef<HTMLButtonElement>(null);

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
    <div
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !abierto) return;
        event.stopPropagation();
        setAbierto(false);
        activador.current?.focus();
      }}
    >
      <Button
        ref={activador}
        className="capas__activador"
        aria-controls="controles-capas"
        aria-expanded={abierto}
        onClick={() => setAbierto((valor) => !valor)}
        startIcon={<SlidersHorizontal size={16} strokeWidth={ICON_STROKE} aria-hidden />}
        color="inherit"
      >
        Capas
      </Button>

      <Paper
        id="controles-capas"
        component="section"
        className="capas"
        aria-label="Capas de la escena"
        hidden={!abierto}
      >
        <h2 className="capas__titulo">Capas</h2>

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
    </div>
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
      className="capas__fila"
      control={
        <Switch
          size="small"
          checked={activo}
          onChange={onChange}
          sx={{
            /** Compacta el control para que no domine la fila. */
            width: 36,
            height: 22,
            padding: 0,
            '& .MuiSwitch-switchBase': { padding: '3px' },
            '& .MuiSwitch-thumb': { width: 16, height: 16 },
            '& .MuiSwitch-track': { borderRadius: 11, opacity: 0.35 },
            '& .Mui-checked + .MuiSwitch-track': { opacity: 0.55 },
            '& .MuiSwitch-switchBase.Mui-focusVisible': {
              outline: '3px solid #e8eaed',
              outlineOffset: '2px',
              borderRadius: '999px',
            },
          }}
        />
      }
      label={
        <span className="capas__etiqueta">
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
            className={`capas__icono ${activo ? 'capas__icono--activo' : 'capas__icono--inactivo'}`}
            size={ICON_SIZE}
            strokeWidth={ICON_STROKE}
            aria-hidden
          />
          {etiqueta}
        </span>
      }
      labelPlacement="start"
      sx={{
        width: '100%',
        justifyContent: 'space-between',
        '& .MuiFormControlLabel-label': { flex: 1 },
      }}
    />
  );
}
