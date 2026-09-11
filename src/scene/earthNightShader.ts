import type { Vector3 } from 'three';

interface EarthShader {
  uniforms: Record<string, { value: unknown }>;
  vertexShader: string;
  fragmentShader: string;
}

const SUN_DIRECTION_UNIFORM = 'sunDirection';

/**
 * Limita el mapa emisivo de la Tierra al hemisferio que no recibe luz solar.
 *
 * La normal usada es la de la esfera antes del normal map: las montañas no
 * deben convertir pequeños píxeles diurnos en noche. Se transforma al espacio
 * global para compararla con la misma dirección que alimenta la luz real.
 */
export function applyEarthNightMask(shader: EarthShader, sunDirection: Vector3) {
  shader.uniforms[SUN_DIRECTION_UNIFORM] = { value: sunDirection };

  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
varying vec3 worldSurfaceNormal;`,
    )
    .replace(
      '#include <beginnormal_vertex>',
      `#include <beginnormal_vertex>
worldSurfaceNormal = normalize(mat3(modelMatrix) * objectNormal);`,
    );

  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
uniform vec3 ${SUN_DIRECTION_UNIFORM};
varying vec3 worldSurfaceNormal;`,
    )
    .replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
float sunFacing = dot(normalize(worldSurfaceNormal), normalize(${SUN_DIRECTION_UNIFORM}));
float nightMask = 1.0 - smoothstep(-0.1, 0.1, sunFacing);
totalEmissiveRadiance *= nightMask;`,
    );
}
