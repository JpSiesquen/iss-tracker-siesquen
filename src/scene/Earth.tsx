import { useTexture } from '@react-three/drei';
import { SRGBColorSpace, type MeshStandardMaterial } from 'three';

import { useUiStore } from '../store/ui';
import { DebugMarkers } from './DebugMarkers';
import { applyEarthNightMask } from './earthNightShader';
import { useSceneTime } from './sceneTime';
import {
  EARTH_NIGHT_INTENSITY,
  EARTH_NORMAL_SCALE,
  EARTH_RADIUS,
  EARTH_SEGMENTS,
} from './constants';

/**
 * La Tierra: geometría, texturas y rotación.
 *
 * Traducción a R3F de lo que en la Fase 0 se escribió a mano
 * (`sandbox/00-threejs/index.html`). La correspondencia es mecánica:
 *
 *   new THREE.Mesh(geo, mat)                  →  <mesh>
 *   new THREE.SphereGeometry(1, 64, 64)       →  <sphereGeometry args={[1, 64, 64]} />
 *   new THREE.MeshStandardMaterial({ ... })   →  <meshStandardMaterial ... />
 *   scene.add(mesh)                           →  anidar el JSX
 *
 * ⚠️ Este componente se SUSPENDE mientras cargan las texturas, así que necesita un
 * <Suspense> por encima (ver Scene.tsx). Sin él, React lanza un error.
 */
export function Earth() {
  const tiempo = useSceneTime();
  const verReferencias = useUiStore((s) => s.verReferencias);
  const verLucesNocturnas = useUiStore((s) => s.verLucesNocturnas);

  const configureNightShader = (
    shader: Parameters<MeshStandardMaterial['onBeforeCompile']>[0],
  ) => applyEarthNightMask(shader, tiempo.current.sunDirection);

  /**
   * Un material PBR combina varias texturas, cada una controlando una propiedad
   * distinta de la superficie:
   *
   *   map          color base
   *   normalMap    relieve simulado: NO deforma la malla, altera la dirección
   *                de la normal en cada píxel, que es lo que decide cómo rebota
   *                la luz. Las montañas proyectan sombra con los mismos
   *                triángulos
   *   roughnessMap dónde brilla y dónde no: el océano pulido, la tierra mate
   *   emissiveMap  zonas que emiten luz propia: las ciudades de noche
   *
   * ⚠️ Solo las texturas de COLOR llevan sRGB. Las de DATOS —normal, specular—
   * son números, no colores, y se quedan en espacio lineal. Marcar un normalMap
   * como sRGB deforma el relieve de forma sutil y difícil de diagnosticar.
   *
   * El segundo argumento de useTexture se ejecuta con las texturas recién
   * cargadas: es el sitio correcto para configurarlas, porque mutar lo que
   * devuelve un hook está mal visto en React y el linter lo detecta
   * (react/immutability).
   */
  const [colorMap, nightMap, normalMap, specularMap] = useTexture(
    [
      '/textures/earth-color.jpg',
      '/textures/earth-night.jpg',
      '/textures/earth-normal.jpg',
      '/textures/earth-specular.jpg',
    ],
    (texturas) => {
      const lista = Array.isArray(texturas) ? texturas : [texturas];
      lista[0].colorSpace = SRGBColorSpace; // color
      lista[1].colorSpace = SRGBColorSpace; // luces nocturnas
      // normal y specular se quedan en lineal: son datos, no colores
    },
  );

  return (
    /* La inclinación axial vive en Scene.tsx y la rotación GMST en
       EcefFrame. Esta malla solo describe la superficie terrestre y hereda
       ambas transformaciones del árbol, igual que las demás capas ECEF. */
    <mesh>
      {/* La geometría y el material van DENTRO del mesh, y no es decoración de
          JSX: R3F usa la posición del hijo para saber a qué propiedad del padre
          asignarlo. Un sphereGeometry dentro de un mesh se asigna a
          mesh.geometry, y el material a mesh.material. Se llama «attach», y R3F
          lo infiere por el tipo del objeto. */}
      <sphereGeometry args={[EARTH_RADIUS, EARTH_SEGMENTS, EARTH_SEGMENTS]} />

      {/* MeshStandardMaterial SÍ obedece a la luz (PBR). Sin luces en la escena
            se vería NEGRO: un objeto que solo se ve por la luz que refleja, sin
            luz, no refleja nada. */}
      <meshStandardMaterial
        map={colorMap}
        normalMap={normalMap}
        normalScale={EARTH_NORMAL_SCALE}
        // El specular map es claro en el agua y oscuro en la tierra. Como
        // roughnessMap eso da un océano pulido que refleja el Sol y unos
        // continentes mate.
        roughnessMap={specularMap}
        roughness={1} // se multiplica por el mapa: el valor real lo pone la textura
        metalness={0} // un planeta no es metálico
        // El shader conserva MeshStandardMaterial completo y solo modula su
        // emisión: normalMap y roughnessMap siguen funcionando sin cambios.
        onBeforeCompile={configureNightShader}
        emissiveMap={verLucesNocturnas ? nightMap : null}
        emissive="#ffffff"
        emissiveIntensity={verLucesNocturnas ? EARTH_NIGHT_INTENSITY : 0}
      />

      {/* Puntos conocidos para comprobar la conversion de coordenadas contra
            la textura. Van DENTRO del mesh que rota, al reves que la ISS: un
            punto fijo de la superficie si debe girar con el planeta.

            import.meta.env.DEV desaparece al compilar para produccion. */}
      {import.meta.env.DEV && verReferencias && <DebugMarkers />}
    </mesh>
  );
}
