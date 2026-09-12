import { createTheme } from '@mui/material/styles';

import { SPACE_COLOR } from './scene/constants';

/**
 * El tema de la interfaz.
 *
 * ## El problema que resuelve
 *
 * Material UI implementa Material Design, el lenguaje visual de Google:
 * superficies claras, elevaciones marcadas, sombras. Está pensado para
 * aplicaciones de formularios y listas.
 *
 * Un globo 3D a pantalla completa pide lo contrario: fondo oscuro, paneles
 * translúcidos flotando encima, y nada que compita con la imagen. Con el tema
 * por defecto esto parecería «una plantilla de administración con un globo
 * incrustado».
 *
 * Esta issue no añade ninguna función visible y aun así es la que decide si el
 * proyecto parece propio o parece una plantilla.
 *
 * ## La regla: personalizar el tema, no cada componente
 *
 * Si tres componentes necesitan el mismo ajuste, va aquí en
 * `components.MuiPaper.styleOverrides`, no en tres `sx` repetidos. El `sx` es
 * para lo puntual; el tema, para las decisiones del sistema.
 */

/** Color de acento: el mismo amarillo del marcador de la ISS. */
const ISS_ACCENT = '#ffcc00';

/** Azul frío de la traza pasada, reutilizado como color secundario. */
const TRACK_ACCENT = '#5eb0ff';

/**
 * Fondo de los paneles.
 *
 * ⚠️ Translúcido a propósito, y es la decisión visual central del proyecto. Un
 * panel opaco taparía el globo; este lo deja ver por detrás, y con
 * `backdropFilter` el texto sigue siendo legible sobre cualquier parte de la
 * imagen — océano oscuro o continente iluminado.
 *
 * Es lo que hace que la interfaz se sienta parte de la escena en vez de una
 * capa pegada encima.
 */
const PANEL_BACKGROUND = 'rgba(18, 22, 33, 0.72)';

/** Borde apenas visible: separa el panel del fondo sin dibujar una caja. */
const PANEL_BORDER = 'rgba(255, 255, 255, 0.09)';

export const theme = createTheme({
  palette: {
    mode: 'dark',

    /**
     * El fondo por defecto es el MISMO color del espacio de la escena 3D.
     *
     * Si no coincidieran, se vería una costura entre el canvas y la página
     * durante la carga o si el canvas no ocupara toda la ventana. Compartir la
     * constante hace imposible que se desincronicen.
     */
    background: {
      default: SPACE_COLOR,
      paper: PANEL_BACKGROUND,
    },

    /**
     * El acento es el amarillo del marcador, no el azul por defecto de MUI.
     *
     * No es capricho: que el color de la interfaz sea el del objeto que se está
     * siguiendo ata visualmente el panel con lo que describe.
     */
    primary: { main: ISS_ACCENT },
    secondary: { main: TRACK_ACCENT },

    text: {
      primary: '#e8eaed',
      /** Para datos de apoyo: presente sin robar atención al valor principal. */
      secondary: 'rgba(232, 234, 237, 0.62)',
    },

    divider: PANEL_BORDER,
  },

  shape: {
    /** Más redondeado que el defecto de MUI (4): suaviza sin llegar a píldora. */
    borderRadius: 12,
  },

  typography: {
    /**
     * Geist Variable (Vercel), self-hosted vía `@fontsource-variable/geist`.
     *
     * Sustituye el stack `system-ui`: comunica identidad de producto sin
     * depender de la fuente del sistema del reclutador. Una sola familia para
     * toda la UI; la jerarquía sale del peso y del tamaño, no de mezclar
     * tipografías.
     *
     * Pesos de trabajo: 400 (cuerpo), 500 (etiquetas), 600 (valores
     * protagonistas). El eje variable cubre 100–900 sin cargar archivos extra.
     */
    fontFamily: '"Geist Variable", "Geist", system-ui, sans-serif',
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    /** Escala densa de producto (~1.15), no display de marketing. */
    h6: {
      fontSize: '1.05rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    subtitle1: { fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.35 },
    subtitle2: { fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.4 },
    body1: { fontSize: '0.9rem', fontWeight: 400, lineHeight: 1.45 },
    body2: { fontSize: '0.8rem', fontWeight: 400, lineHeight: 1.45 },
    caption: {
      fontSize: '0.7rem',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '0.04em',
    },
    button: { fontWeight: 500, textTransform: 'none' },
  },

  components: {
    MuiPaper: {
      /**
       * Sin sombras.
       *
       * Material Design usa la elevación para sugerir jerarquía sobre un fondo
       * claro. Sobre un fondo casi negro una sombra no se ve, y con un globo
       * detrás solo ensucia. El borde tenue cumple la misma función mejor.
       */
      defaultProps: { elevation: 0 },

      styleOverrides: {
        root: {
          backgroundColor: PANEL_BACKGROUND,
          border: `1px solid ${PANEL_BORDER}`,

          /**
           * Desenfoca lo que hay detrás del panel. Es lo que permite bajar la
           * opacidad sin perder legibilidad.
           *
           * ⚠️ Tiene coste de GPU, y con una escena 3D detrás no es gratis. La
           * issue #45 lo mide en móvil; si molesta, la salida es subir la
           * opacidad y quitar el blur, no al revés.
           */
          backdropFilter: 'blur(12px)',
          backgroundImage: 'none',
        },
      },
    },

    MuiCssBaseline: {
      styleOverrides: {
        /**
         * El globo ocupa la ventana entera: no hay nada que desplazar, y una
         * barra de scroll aparecería y desaparecería al cambiar el contenido
         * del panel.
         */
        body: {
          overflow: 'hidden',

          /**
           * ⚠️ Cifras de ancho fijo en toda la interfaz.
           *
           * Sin esto, un contador que pasa de «7.66» a «7.67» hace bailar el
           * resto de la línea, porque el 6 y el 7 no miden lo mismo en una
           * fuente proporcional. En un panel donde casi todo son números que
           * cambian cada segundo, el efecto es constante y muy molesto.
           *
           * Va aquí y no en `typography` porque MUI no acepta esa propiedad en
           * su tipo de tipografía: es CSS puro aplicado a la raíz, y se hereda.
           */
          fontVariantNumeric: 'tabular-nums',
        },

        /** La cadena de altura que necesita el <Canvas>: sin esto mide cero. */
        'html, body, #root': { height: '100%' },

        /**
         * Quien haya pedido menos movimiento en su sistema, lo obtiene.
         *
         * ⚠️ No es un detalle estético. Hay personas para quienes el
         * movimiento en pantalla provoca mareo o migraña, y lo indican en los
         * ajustes de accesibilidad de su sistema operativo. Ignorar esa
         * preferencia les hace la página inutilizable.
         *
         * Cuesta tres líneas y casi nadie las escribe.
         *
         * Nótese que NO se pone a 0: un valor mínimo mantiene los eventos de
         * fin de animación, de los que depende `AnimatePresence` para retirar
         * un elemento que sale.
         */
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },
  },
});
