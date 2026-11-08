import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  CanvasTexture,
  type Group,
  MathUtils,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';

import type { CatalogEphemeris } from '../lib/catalogEphemeris';

import { CAMERA_VERTICAL_FOV } from './constants';
import { type LunarEphemeris, utcToJdTdb } from './lunarView';
import { useSceneTime } from './sceneTime';
import {
  catalogPositionAt,
  EARTH_RADII_PER_AU,
  ECLIPTIC_NORTH,
  SOLAR_BODIES,
  type SolarBodyId,
  type SolarDistances,
  solarPositionsAt,
} from './solarView';

const GUIDES_AU = [1, 5, 10, 20, 30];
const GUIDE_SEGMENTS = 128;
const GUIDE_ORIENTATION = new Quaternion().setFromUnitVectors(
  new Vector3(0, 0, 1),
  ECLIPTIC_NORTH,
);
const MARKER_TEXTURE_SIZE = 64;
const REPORT_INTERVAL_MS = 1000;
const JUPITER_LABEL_GAP_PX = 23;
const CATALOG_MARKER_DIAMETER = 12;
const CATALOG_MARKER_COLOR = '#b7d4ff';

export function SolarSystem({
  ephemeris,
  detailedEarth,
  selected,
  catalogEphemeris,
  onDistances,
}: {
  ephemeris: LunarEphemeris;
  detailedEarth: boolean;
  selected: SolarBodyId | null;
  catalogEphemeris: CatalogEphemeris | undefined;
  onDistances: (distances: SolarDistances) => void;
}) {
  const time = useSceneTime();
  const markers = useRef<Group>(null);
  const catalogMarker = useRef<Group>(null);
  const catalogTexture = useMemo(
    () =>
      catalogEphemeris &&
      markerTexture({ id: catalogEphemeris.body.id, color: CATALOG_MARKER_COLOR }),
    [catalogEphemeris],
  );
  useEffect(() => () => catalogTexture?.dispose(), [catalogTexture]);
  const guides = useRef<Group>(null);
  const jupiterLabel = useRef<HTMLSpanElement>(null);
  const projected = useRef({ sun: new Vector3(), jupiter: new Vector3() });
  const report = useRef({ time: 0, signature: '' });
  const height = useThree(({ size }) => size.height);
  const pixelScale =
    (2 * Math.tan(MathUtils.degToRad(CAMERA_VERTICAL_FOV / 2))) / Math.max(1, height);

  // Estos recursos solo existen al entrar en la vista solar.
  const graphics = useMemo(() => {
    const textures = SOLAR_BODIES.map((body) => markerTexture(body));
    const points = Array.from({ length: GUIDE_SEGMENTS }, (_, index) => {
      const angle = (index * Math.PI * 2) / GUIDE_SEGMENTS;
      return new Vector3(Math.cos(angle), Math.sin(angle), 0);
    });
    return { textures, circle: new BufferGeometry().setFromPoints(points) };
  }, []);
  useEffect(
    () => () => {
      graphics.circle.dispose();
      graphics.textures.forEach((texture) => texture.dispose());
    },
    [graphics],
  );

  useFrame(({ camera, size }) => {
    const date = time.current.date;
    const jd = utcToJdTdb(date);
    const positions = solarPositionsAt(ephemeris, jd);
    if (!positions || !markers.current) return;

    for (const [index, body] of positions.entries()) {
      markers.current.children[index].position.copy(body.position);
    }
    const sun = positions[0].position;
    guides.current?.position.copy(sun);

    const label = jupiterLabel.current;
    const jupiter = positions.find(({ id }) => id === 'jupiter');
    if (label && jupiter) {
      // En móvil, la etiqueta de Júpiter se aparta del grupo interior.
      const point = projected.current;
      point.sun.copy(sun).project(camera);
      point.jupiter.copy(jupiter.position).project(camera);
      const x = (point.jupiter.x - point.sun.x) * size.width;
      const y = (point.sun.y - point.jupiter.y) * size.height;
      const separation = Math.hypot(x, y);
      if (separation > 0) {
        const dx = Math.round((x / separation) * JUPITER_LABEL_GAP_PX);
        const dy = Math.round((y / separation) * JUPITER_LABEL_GAP_PX);
        const transform = 'translate(' + dx + 'px, ' + dy + 'px)';
        if (label.style.transform !== transform) label.style.transform = transform;
      }
    }

    const extra = catalogEphemeris && catalogPositionAt(catalogEphemeris, ephemeris, jd);
    if (catalogMarker.current) {
      catalogMarker.current.visible = !!extra;
      if (extra) catalogMarker.current.position.copy(extra.position);
    }

    const now = date.getTime();
    if (now - report.current.time < REPORT_INTERVAL_MS) return;
    report.current.time = now;
    const entries = extra ? [...positions, extra] : positions;
    const signature = entries
      .map(({ id, distanceAu }) => id + ':' + distanceAu.toFixed(3))
      .join(',');
    if (signature !== report.current.signature) {
      report.current.signature = signature;
      onDistances(new Map(entries.map(({ id, distanceAu }) => [id, distanceAu])));
    }
  });

  return (
    <>
      <group ref={guides} quaternion={GUIDE_ORIENTATION}>
        {GUIDES_AU.map((au) => (
          <lineLoop key={au} geometry={graphics.circle} scale={au * EARTH_RADII_PER_AU}>
            <lineBasicMaterial
              color="#657e9e"
              transparent
              opacity={0.27}
              depthWrite={false}
            />
          </lineLoop>
        ))}
      </group>
      <group ref={markers}>
        {SOLAR_BODIES.map((body, index) => {
          const isSelected = selected === body.id;
          const visible = body.id !== 'earth' || !detailedEarth;
          const size = pixelScale * body.diameter * (isSelected ? 1.55 : 1);
          const showLabel =
            visible && (isSelected || index >= 5 || (body.id === 'sun' && !selected));
          return (
            <group key={body.id} name={body.label} visible={visible}>
              <sprite scale={[size, size, 1]} renderOrder={isSelected ? 2 : 1}>
                <spriteMaterial
                  map={graphics.textures[index]}
                  transparent
                  depthWrite={false}
                  sizeAttenuation={false}
                  toneMapped={false}
                />
              </sprite>
              {showLabel && (
                <Html center zIndexRange={[0, 0]} style={{ pointerEvents: 'none' }}>
                  <span
                    ref={body.id === 'jupiter' ? jupiterLabel : undefined}
                    className={
                      isSelected
                        ? 'solar-body-label solar-body-label--selected'
                        : 'solar-body-label'
                    }
                    aria-hidden="true"
                  >
                    {body.label}
                  </span>
                </Html>
              )}
            </group>
          );
        })}
      </group>
      {catalogEphemeris && catalogTexture && (
        <group
          key={catalogEphemeris.body.id}
          ref={catalogMarker}
          name={catalogEphemeris.body.label}
          visible={false}
        >
          <sprite
            scale={[
              pixelScale * CATALOG_MARKER_DIAMETER,
              pixelScale * CATALOG_MARKER_DIAMETER,
              1,
            ]}
            renderOrder={2}
          >
            <spriteMaterial
              map={catalogTexture}
              transparent
              depthWrite={false}
              sizeAttenuation={false}
              toneMapped={false}
            />
          </sprite>
          <Html center zIndexRange={[0, 0]} style={{ pointerEvents: 'none' }}>
            <span
              className="solar-body-label solar-body-label--selected"
              aria-hidden="true"
            >
              {catalogEphemeris.body.family === 'comet'
                ? catalogEphemeris.body.designation
                : catalogEphemeris.body.label}
            </span>
          </Html>
        </group>
      )}
    </>
  );
}

function markerTexture(body: { id: string; color: string }): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = MARKER_TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear el marcador solar.');

  const center = MARKER_TEXTURE_SIZE / 2;
  const isSun = body.id === 'sun';
  const isSaturn = body.id === 'saturn';
  const radius = isSun ? 15 : isSaturn ? 17 : 26;

  if (isSun) {
    const glow = context.createRadialGradient(center, center, 5, center, center, center);
    glow.addColorStop(0, '#ffd189');
    glow.addColorStop(0.43, '#ff9c49a6');
    glow.addColorStop(1, '#ff7a2200');
    context.fillStyle = glow;
    context.fillRect(0, 0, MARKER_TEXTURE_SIZE, MARKER_TEXTURE_SIZE);
  }

  if (isSaturn) {
    context.beginPath();
    context.ellipse(center, center, 29, 9, -0.35, 0, Math.PI * 2);
    context.strokeStyle = '#d9bb85d4';
    context.lineWidth = 4;
    context.stroke();
  }

  const disk = context.createRadialGradient(
    center - radius * 0.31,
    center - radius * 0.34,
    1,
    center,
    center,
    radius,
  );
  disk.addColorStop(0, isSun ? '#fff6c5' : '#f1f5fc');
  disk.addColorStop(0.56, body.color);
  disk.addColorStop(1, isSun ? '#ff8d30' : '#56627a');
  context.fillStyle = disk;
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.fill();

  if (isSaturn) {
    context.beginPath();
    context.ellipse(center, center, 29, 9, -0.35, 0, Math.PI);
    context.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
