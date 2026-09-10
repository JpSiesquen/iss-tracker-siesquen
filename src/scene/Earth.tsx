import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { gstime } from 'satellite.js';
import { SRGBColorSpace, type Mesh } from 'three';

import { EARTH_RADIUS, EARTH_SEGMENTS, EARTH_TILT } from './constants';

/**
 * La Tierra: geometría, textura y rotación.
 *
 * Traducción a R3F de lo que en la Fase 0 se escribió a mano
 * (`sandbox/00-threejs/index.html`). La correspondencia es mecánica:
 *
 *   new THREE.Mesh(geo, mat)                  →  <mesh>
 *   new THREE.SphereGeometry(1, 64, 64)       →  <sphereGeometry args={[1, 64, 64]} />
 *   new THREE.MeshStandardMaterial({ ... })   →  <meshStandardMaterial ... />
 *   scene.add(mesh)                           →  anidar el JSX
 *
 * ⚠️ Este componente se SUSPENDE mientras carga la textura, así que necesita un
 * <Suspense> por encima (ver Scene.tsx). Sin él, React lanza un error.
 */
export function Earth() {
  const meshRef = useRef<Mesh>(null);

  /**
   * El segundo argumento de useTexture se ejecuta con la textura recién
   * cargada, antes de devolverla. Es el sitio correcto para configurarla:
   * mutar lo que devuelve un hook está mal visto en React y el linter lo
   * detecta (react/immutability).
   *
   * Lo que se configura aquí es el detalle que hace que un globo se vea
   * «lavado» sin motivo aparente: las texturas de color están guardadas en
   * sRGB, pero los cálculos de iluminación de Three.js trabajan en espacio
   * LINEAL. Hay que declararlo o el resultado sale mal.
   *
   * La regla: texturas de COLOR → sRGB; texturas de DATOS → lineal. Un mapa de
   * relieve o una máscara de agua no son colores, son números; esos se quedan
   * en lineal. Vuelve en la issue 2-8.
   */
  const colorMap = useTexture('/textures/earth-color.jpg', (texture) => {
    const mapa = Array.isArray(texture) ? texture[0] : texture;
    mapa.colorSpace = SRGBColorSpace;
  });

  /**
   * La orientación de la Tierra NO se elige: se deriva del tiempo real.
   *
   * gstime() devuelve el GMST (Greenwich Mean Sidereal Time): el ángulo que ha
   * girado la Tierra respecto a las estrellas en ese instante. Aplicarlo como
   * rotación en Y deja el globo orientado según la hora que es de verdad.
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
      meshRef.current.rotation.y = gstime(new Date());
    }
  });

  return (
    /* El <group> separa dos rotaciones que no tienen nada que ver:
       la inclinación es fija y del sistema completo; la rotación diaria es solo
       de la Tierra. Mezclarlas en el mismo objeto haría que rotar sobre Y
       desviara también el eje de inclinación, y el planeta se tambalearía.

       ⚠️ Clave para la Fase 3: la ISS irá DENTRO de este grupo (para heredar la
       inclinación) pero FUERA del mesh que rota. Su lat/lon ya expresa dónde
       está respecto a la superficie; heredar además la rotación la aplicaría
       dos veces. */
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
          roughness={0.8} // alto: la tierra es mate. El océano se tratará aparte en la 2-8
          metalness={0} // un planeta no es metálico
        />
      </mesh>
    </group>
  );
}
