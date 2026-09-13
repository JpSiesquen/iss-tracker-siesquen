import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import './App.css';
import { queryClient } from './api/queryClient';
import { Scene } from './scene/Scene';
import { theme } from './theme';
import { AuthorCredit } from './ui/AuthorCredit';
import { LayerControls } from './ui/LayerControls';
import { StatusPanel } from './ui/StatusPanel';

/**
 * Raíz de la aplicación: tema → datos → escena e interfaz.
 *
 * El orden importa. `ThemeProvider` envuelve todo —incluido el `<Canvas>`—
 * porque los paneles de MUI necesitan el tema y `CssBaseline` pinta el mismo
 * fondo que el espacio de la escena. Dentro, `QueryClientProvider` queda
 * fuera del lienzo: el `<Canvas>` de R3F abre un árbol de objetos de Three.js
 * donde no valen etiquetas HTML, pero el contexto de React lo atraviesa, así
 * que un componente 3D puede usar los hooks de datos igual.
 */
function App() {
  const mostrarDevtools = useMediaQuery('(min-width: 600px)');

  return (
    <ThemeProvider theme={theme}>
      {/* Normaliza los estilos del navegador y aplica el fondo del tema. Sin
          él, el body seguiría siendo blanco. */}
      <CssBaseline />

      <QueryClientProvider client={queryClient}>
        <main className="app">
          <h1 className="sr-only">Seguimiento en tiempo real de la ISS</h1>
          <p className="sr-only">
            Visualización tridimensional de la Estación Espacial Internacional sobre la
            Tierra. Su posición actual también se ofrece como texto en el panel de
            telemetría.
          </p>
          <Scene />

          {/* Fuera del <Canvas>: es HTML normal, superpuesto con CSS. Dentro
              del Canvas solo viven objetos de Three.js. */}
          <StatusPanel />
          <LayerControls />
          <AuthorCredit />
        </main>

        {/* Panel para inspeccionar la caché: qué consultas hay, en qué estado,
          cuándo se refrescaron y con qué datos.

          import.meta.env.DEV es una constante que Vite SUSTITUYE por true o
          false al compilar. En producción el bloque queda como
          `false && <ReactQueryDevtools />`, el minificador lo borra entero y
          el paquete no entra en el bundle: por eso está en devDependencies y
          no en dependencies. */}
        {import.meta.env.DEV && mostrarDevtools && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
