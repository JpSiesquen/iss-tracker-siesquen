import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { SRGBColorSpace, type Mesh } from 'three';

import { useUiStore } from '../store/ui';
import { DebugMarkers } from './DebugMarkers';
import { useSceneTime } from './sceneTime';
import { IssMarker } from './IssMarker';
import {
  EARTH_NIGHT_INTENSITY,
  EARTH_NORMAL_SCALE,
  EARTH_RADIUS,
  EARTH_SEGMENTS,
  EARTH_TILT,
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
  const meshRef = useRef<Mesh>(null);
  const tiempo = useSceneTime();
  const verReferencias = useUiStore((s) => s.verReferencias);

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

  /**
   * La orientación de la Tierra NO se elige: se deriva del tiempo real.
   *
   * El GMST (Greenwich Mean Sidereal Time) es el ángulo que ha girado la Tierra
   * respecto a las estrellas en ese instante. Aplicarlo como rotación en Y deja
   * el globo orientado según la hora que es de verdad.
   *
   * Desde la issue #37 lo calcula `useSceneTime` una sola vez por fotograma, y
   * la propagación orbital de la ISS usa exactamente ese mismo instante.
   *
   * Tres problemas que esto elimina:
   *   1. No hay velocidad que ajustar: la orientación es consecuencia de la hora.
   *   2. No puede desincronizarse de la ISS, porque ambas salen del mismo Date.
   *   3. Al recargar la página la Tierra está donde debe, no reiniciada en cero.
   *
   * ⚠️ Acelerar la rotación por estética rompería el proyecto: en la Fase 3 la
   * ISS se coloca por su longitud real, medida desde Greenwich. Si la Tierra
   * girase más rápido de lo que debe, el marcador quedaría sobre el país
   * equivocado.
   */
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y = tiempo.current.gmst;
    }
  });

  return (
    /* El <group> separa dos rotaciones que no tienen nada que ver:
       la inclinación es fija y del sistema completo; la rotación diaria es solo
       de la Tierra. Mezclarlas en el mismo objeto haría que rotar sobre Y
       desviara también el eje de inclinación, y el planeta se tambalearía.

       La ISS va DENTRO de este grupo, para heredar la inclinación, pero FUERA
       del mesh que rota: no está pegada a la superficie, orbita por su cuenta.

       ⚠️ Eso NO significa que ignore la rotación terrestre. Su lat/lon está en
       ECEF, un sistema que gira CON la Tierra, así que el marcador aplica
       gstime() a su propio vector (ver IssMarker.tsx). Sin esa rotación
       aparece a 89.5° del punto correcto — casi 10 000 km. */
    <group rotation={[0, 0, EARTH_TILT]}>
      <mesh ref={meshRef}>
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
          // Las luces de las ciudades. emissiveMap hace que el material emita
          // luz propia, independiente de las lámparas de la escena.
          //
          // ⚠️ Con esto las luces se ven TAMBIÉN de día, lo cual es incorrecto.
          // Una intensidad moderada deja que el lado iluminado las apague por
          // contraste. Que solo emitan donde no llega el Sol exige un shader
          // propio: es un tema en sí mismo y queda fuera de esta issue.
          emissiveMap={nightMap}
          emissive="#ffffff"
          emissiveIntensity={EARTH_NIGHT_INTENSITY}
        />

        {/* Puntos conocidos para comprobar la conversion de coordenadas contra
            la textura. Van DENTRO del mesh que rota, al reves que la ISS: un
            punto fijo de la superficie si debe girar con el planeta.

            import.meta.env.DEV desaparece al compilar para produccion. */}
        {import.meta.env.DEV && verReferencias && <DebugMarkers />}
      </mesh>

      {/* La ISS: hermana del mesh, no hija. Hereda la inclinación del grupo
          pero no la rotación diaria de la Tierra. */}
      <IssMarker />
    </group>
  );
}
