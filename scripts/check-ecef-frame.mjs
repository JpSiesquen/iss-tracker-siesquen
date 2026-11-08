import assert from 'node:assert/strict';

import { gstime } from 'satellite.js';
import { Group, Object3D, Vector3 } from 'three';

import { latLonToVector3 } from '../src/lib/coordinates.ts';
import { subsolarPoint } from '../src/lib/sun.ts';
import { EARTH_RADIUS, EARTH_TILT } from '../src/scene/constants.ts';
import { sunDirectionInScene } from '../src/scene/sunDirection.ts';

const date = new Date('2026-09-11T12:00:00.000Z');
const gmst = gstime(date);
const yAxis = new Vector3(0, 1, 0);
const zAxis = new Vector3(0, 0, 1);
const epsilon = 1e-12;

const samples = [
  ['Tierra', new Vector3(EARTH_RADIUS, 0, 0)],
  ['ISS', new Vector3(-1.18, 0.42, 0.91)],
  ['Traza', new Vector3(0.03, 1.2, -0.97)],
];

function legacyWorldPosition(localPosition) {
  return localPosition
    .clone()
    .applyAxisAngle(yAxis, gmst)
    .applyAxisAngle(zAxis, EARTH_TILT);
}

function unifiedWorldPosition(localPosition, siderealAngle = gmst) {
  const tiltFrame = new Group();
  tiltFrame.rotation.z = EARTH_TILT;

  const ecefFrame = new Group();
  ecefFrame.rotation.y = siderealAngle;

  const object = new Object3D();
  object.position.copy(localPosition);
  tiltFrame.add(ecefFrame);
  ecefFrame.add(object);
  tiltFrame.updateMatrixWorld(true);

  return object.getWorldPosition(new Vector3());
}

for (const [description, localPosition] of samples) {
  const distance = legacyWorldPosition(localPosition).distanceTo(
    unifiedWorldPosition(localPosition),
  );
  assert.ok(distance <= epsilon, `${description}: diferencia ${distance}`);
}

const sunSamples = [
  ['Equinoccio de marzo', new Date('2024-03-20T12:00:00.000Z')],
  ['Solsticio de junio', new Date('2024-06-20T20:51:00.000Z')],
];

for (const [description, instant] of sunSamples) {
  const siderealAngle = gstime(instant);
  const { latitude, longitude } = subsolarPoint(instant);
  const subsolarNormal = unifiedWorldPosition(
    latLonToVector3(latitude, longitude, 1),
    siderealAngle,
  );
  const sceneSun = sunDirectionInScene(instant, siderealAngle);
  const distance = sceneSun.distanceTo(subsolarNormal);
  const degrees = (sceneSun.angleTo(subsolarNormal) * 180) / Math.PI;
  assert.ok(
    distance <= epsilon,
    `${description}: desvío solar de ${degrees.toFixed(4)}°`,
  );
}

console.log(
  `${samples.length} capas ECEF y ${sunSamples.length} casos solares verificados.`,
);
