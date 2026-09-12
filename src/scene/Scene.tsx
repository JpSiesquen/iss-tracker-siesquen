import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';

import { initialCameraDistance } from './camera';
import { CAMERA_VERTICAL_FOV, EARTH_TILT, SPACE_COLOR } from './constants';
import { Controls } from './Controls';
import { Earth } from './Earth';
import { EcefFrame } from './EcefFrame';
import { IssMarker } from './IssMarker';
import { Lights } from './Lights';
import { SceneLoadingFallback } from './SceneLoadingFallback';
import { SceneTimeProvider } from './SceneTimeContext';
import { Starfield } from './Starfield';

/**
 * El <Canvas> de React Three Fiber crea por nosotros tres de las cosas que en
 * la Fase 0 se escribieron a mano (ver docs/00-threejs-basico.md):
 *
 *   - la escena          (new THREE.Scene)
 *   - una cámara         (new THREE.PerspectiveCamera, ya posicionada)
 *   - el renderer        (con su <canvas> en el DOM, el listener de resize
 *                         y el bucle de animación con requestAnimationFrame)
 *
 * Por eso el equivalente de toda la Fase 0 son unas pocas líneas. Y por eso se
 * hizo la Fase 0: sin ella, <Canvas> sería una caja negra.
 *
 * ⚠️ Dentro del <Canvas> NO se pueden usar etiquetas HTML: solo objetos de
 * Three.js. Son dos árboles de componentes que conviven —React DOM fuera, R3F
 * dentro—. El panel de telemetría vive fuera, superpuesto con CSS.
 */
export function Scene() {
  return (
    <Canvas
      // La distancia se ajusta al tamaño REAL del canvas al crearlo. Usar un
      // z fijo solo funcionaría para la relación de aspecto donde se tanteó.
      camera={{ fov: CAMERA_VERTICAL_FOV, near: 0.1, far: 1000 }}
      onCreated={({ camera, size }) => {
        camera.position.set(0, 0, initialCameraDistance(size.width / size.height));
        camera.updateProjectionMatrix();
      }}
      // Limita la densidad de píxeles. En pantallas de alta densidad el
      // navegador renderizaría a 3x, que son nueve veces más píxeles para
      // una mejora casi imperceptible. Vuelve en la issue 6-2 (rendimiento).
      dpr={[1, 2]}
      // El espacio no es gris.
      style={{ background: SPACE_COLOR }}
    >
      <Controls />

      {/* Fondo de escena, fuera de ECEF y del tiempo: no gira con el planeta
          ni depende del Sol. Ver Starfield.tsx. */}
      <Starfield />

      {/* El proveedor calcula el instante una vez por fotograma y lo reparte.
          Envuelve a la Tierra y al marcador para que ambos se orienten y se
          propaguen con exactamente el mismo tiempo: usar instantes distintos
          produce un desfase en longitud consistente y difícil de detectar. */}
      <SceneTimeProvider>
        {/* Las luces van DENTRO del proveedor, pero FUERA de EcefFrame: la
            dirección solar ya llega convertida a coordenadas de escena. */}
        <Lights />

        {/* <Earth> se suspende mientras carga sus texturas: necesita Suspense
            por encima. El fallback es una silueta del mismo radio (#134), no
            null: una pantalla negra se lee como fallo, no como espera.

            La inclinación axial envuelve también al fallback para que el
            globo texturizado aparezca en el mismo sitio, sin salto de pose.
            Starfield y paneles quedan fuera: la carga no bloquea la UI.

            ⚠️ El Suspense debe ENVOLVER al componente que carga, no ir
            dentro: un componente no puede ser su propio fallback. */}
        <group rotation={[0, 0, EARTH_TILT]}>
          <Suspense fallback={<SceneLoadingFallback />}>
            <EcefFrame>
              <Earth />
              <IssMarker />
            </EcefFrame>
          </Suspense>
        </group>
      </SceneTimeProvider>
    </Canvas>
  );
}
