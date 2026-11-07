import { AdditiveBlending, BackSide, Color } from 'three';

import { EARTH_RADIUS, EARTH_SEGMENTS } from './constants';
import { useSceneTime } from './sceneTime';

const ATMOSPHERE_RADIUS = EARTH_RADIUS * 1.038;
const ATMOSPHERE_COLOR = new Color('#72b8ff');

const vertexShader = /* glsl */ `
  varying vec3 worldPosition;

  void main() {
    worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(worldPosition, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 glowColor;
  uniform vec3 sunDirection;
  uniform float earthRadius;
  uniform float atmosphereRadius;
  varying vec3 worldPosition;

  void main() {
    vec3 ray = normalize(worldPosition - cameraPosition);
    // La Tierra está en el origen. El punto del rayo más cercano al centro
    // determina el grosor visible del halo, incluso al cambiar el zoom.
    vec3 limbOffset = worldPosition - ray * dot(worldPosition, ray);
    float rim = 1.0 - smoothstep(earthRadius, atmosphereRadius, length(limbOffset));
    float sunlight = dot(normalize(limbOffset), normalize(sunDirection));
    float brightness = mix(0.16, 0.8, smoothstep(-0.2, 0.7, sunlight));
    gl_FragColor = vec4(glowColor, rim * brightness);
    #include <colorspace_fragment>
  }
`;

export function EarthAtmosphere() {
  const time = useSceneTime();

  return (
    <mesh name="Earth atmosphere">
      <sphereGeometry args={[ATMOSPHERE_RADIUS, EARTH_SEGMENTS, EARTH_SEGMENTS]} />
      {/* El globo oculta la cara interior y deja visible solo el contorno. */}
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          glowColor: { value: ATMOSPHERE_COLOR },
          sunDirection: { value: time.current.sunDirection },
          earthRadius: { value: EARTH_RADIUS },
          atmosphereRadius: { value: ATMOSPHERE_RADIUS },
        }}
        side={BackSide}
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
