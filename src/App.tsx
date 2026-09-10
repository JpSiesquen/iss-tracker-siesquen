import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import './App.css';
import { queryClient } from './api/queryClient';
import { Scene } from './scene/Scene';
import { theme } from './theme';
import { LayerControls } from './ui/LayerControls';
import { StatusPanel } from './ui/StatusPanel';

/**
 * El QueryClientProvider va aqui, en la raiz y FUERA del <Canvas>.
 *
 * El <Canvas> de R3F abre un arbol de objetos de Three.js donde no valen
 * etiquetas HTML, pero sigue siendo React: el contexto lo atraviesa sin
 * problema. Por eso un componente 3D puede usar los hooks de datos aunque el
 * proveedor este fuera del lienzo.
 */
function App() {
  return (
    /* El ThemeProvider envuelve todo, incluido el <Canvas>: los componentes de
       MUI que van superpuestos necesitan el tema, y el fondo de CssBaseline
       usa el mismo color del espacio de la escena para que no se vea costura. */
    <ThemeProvider theme={theme}>
      {/* Normaliza los estilos del navegador y aplica el fondo del tema. Sin
          el, el body seguiria siendo blanco. */}
      <CssBaseline />

      <QueryClientProvider client={queryClient}>
        <div className="app">
          <Scene />

          {/* Fuera del <Canvas>: es HTML normal, superpuesto con CSS. Dentro
              del Canvas solo viven objetos de Three.js. */}
          <StatusPanel />
          <LayerControls />
        </div>

        {/* Panel para inspeccionar la cache: que consultas hay, en que estado,
          cuando se refrescaron y con que datos.

          import.meta.env.DEV es una constante que Vite SUSTITUYE por true o
          false al compilar. En produccion el bloque queda como
          `false && <ReactQueryDevtools />`, el minificador lo borra entero y
          el paquete no entra en el bundle: por eso esta en devDependencies y
          no en dependencies. */}
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
