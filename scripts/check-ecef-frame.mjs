import assert from 'node:assert/strict';

import { gstime } from 'satellite.js';
import { Group, Object3D, Vector3 } from 'three';

import { EARTH_RADIUS, EARTH_TILT } from '../src/scene/constants.ts';

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

function unifiedWorldPosition(localPosition) {
  const tiltFrame = new Group();
  tiltFrame.rotation.z = EARTH_TILT;

  const ecefFrame = new Group();
  ecefFrame.rotation.y = gmst;

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

// Lights permanece fuera de EcefFrame: useSceneTime ya entrega este vector en
// coordenadas de escena y el refactor no debe aplicarle otra rotación.
const ecefLight = new Vector3(0.31, 0.52, -0.8).normalize();
const legacyLight = ecefLight.clone().applyAxisAngle(yAxis, gmst);
const unchangedLight = ecefLight.clone().applyAxisAngle(yAxis, gmst);
assert.ok(legacyLight.distanceTo(unchangedLight) <= epsilon, 'Luz solar');

console.log(`${samples.length} capas ECEF y la luz conservaron sus posiciones.`);
