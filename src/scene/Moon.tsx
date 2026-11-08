import { Html } from '@react-three/drei';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  type Group,
  Matrix4,
  type MeshBasicMaterial,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector3,
} from 'three';

import { EARTH_TILT } from './constants';
import { MOON_RADIUS } from './lunarView';

const LUNAR_TEXTURE = '/textures/moon-color.jpg';
const MOON_SEGMENTS = 32;
const NORTH = new Vector3(-Math.sin(EARTH_TILT), Math.cos(EARTH_TILT), 0);

export function Moon({
  object,
  light,
  showLabel,
}: {
  object: RefObject<Group | null>;
  light: RefObject<Vector3>;
  showLabel: boolean;
}) {
  const [map, setMap] = useState<Texture | null>(null);
  const basis = useRef({
    x: new Vector3(),
    y: new Vector3(),
    z: new Vector3(),
    matrix: new Matrix4(),
  });

  useEffect(() => {
    let active = true;
    const texture = new TextureLoader().load(LUNAR_TEXTURE, (loaded) => {
      if (!active) return;
      loaded.colorSpace = SRGBColorSpace;
      setMap(loaded);
    });
    return () => {
      active = false;
      texture.dispose();
    };
  }, []);

  useFrame(() => {
    const moon = object.current;
    if (!moon?.visible) return;
    // Orientación síncrona aproximada: el meridiano central mira a la Tierra.
    const { x, y, z, matrix } = basis.current;
    x.copy(moon.position).normalize().negate();
    z.crossVectors(x, NORTH).normalize();
    y.crossVectors(z, x);
    moon.quaternion.setFromRotationMatrix(matrix.makeBasis(x, y, z));
  });

  function configureShader(shader: Parameters<MeshBasicMaterial['onBeforeCompile']>[0]) {
    shader.uniforms.moonSunDirection = { value: light.current };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 moonNormal;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nmoonNormal = normalize(mat3(modelMatrix) * normal);',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 moonSunDirection;\nvarying vec3 moonNormal;',
      )
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\nfloat daylight = max(dot(normalize(moonNormal), moonSunDirection), 0.0);\ndiffuseColor.rgb *= 0.12 + 0.88 * daylight;',
      );
  }

  return (
    <group ref={object} visible={false} name="Luna">
      <mesh>
        <sphereGeometry args={[MOON_RADIUS, MOON_SEGMENTS, MOON_SEGMENTS]} />
        <meshBasicMaterial
          map={map}
          color={map ? '#ffffff' : '#a5a8af'}
          onBeforeCompile={configureShader}
        />
      </mesh>
      {showLabel && (
        <Html center zIndexRange={[0, 0]} style={{ pointerEvents: 'none' }}>
          <span className="lunar-body-label" aria-hidden="true">
            Luna
          </span>
        </Html>
      )}
    </group>
  );
}
