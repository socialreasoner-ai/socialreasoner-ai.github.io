import assert from 'node:assert/strict';
import * as THREE from '../assets/vendor/three/three.module.js';
import {geographicVector, GlobeCharacters} from '../globe-characters.js';
import {vectorToGeographic, centerRotationFor} from '../globe-renderer-3d.js';

const closeAngle = (a, b) => Math.abs((((a - b) + 540) % 360) - 180) < 1e-9;
const sphere = new THREE.SphereGeometry(2, 180, 90);
const position = sphere.getAttribute('position');
const uv = sphere.getAttribute('uv');
for (const [id, lon, lat] of [
  ['USA', -103.5725, 44.7557], ['JPN', 136.7132, 36.0082],
  ['DNK', 9.8855, 56.0591], ['NZL', 172.9514, -41.5511],
  ['seam east', 179.999, 10], ['seam west', -179.999, -10]
]) {
  const [lonBack, latBack] = vectorToGeographic(geographicVector(lon, lat, 2));
  assert.ok(closeAngle(lon, lonBack), `${id}: longitude round trip`);
  assert.ok(Math.abs(lat - latBack) < 1e-9, `${id}: latitude round trip`);
  const {yaw, pitch} = centerRotationFor(lon, lat);
  const centered = geographicVector(lon, lat, 2).applyEuler(new THREE.Euler(pitch, yaw, 0));
  assert.ok(Math.abs(centered.x) < 1e-9 && Math.abs(centered.y) < 1e-9 && centered.z > 1.99,
    `${id}: country anchor should face the viewer after focusing`);
  const east = geographicVector(lon + 1, lat, 2).applyEuler(new THREE.Euler(pitch, yaw, 0));
  assert.ok(east.x > 0, `${id}: east should be screen-right after focusing`);
  const anchor = geographicVector(lon, lat, 1);
  let best = -Infinity;
  let bestUV = null;
  for (let i = 0; i < position.count; i++) {
    const vertex = new THREE.Vector3().fromBufferAttribute(position, i).applyAxisAngle(
      new THREE.Vector3(0, 1, 0), -Math.PI / 2).normalize();
    const dot = vertex.dot(anchor);
    if (dot > best) {best = dot; bestUV = [uv.getX(i), uv.getY(i)];}
  }
  const expectedU = (lon + 180) / 360;
  const uError = Math.min(Math.abs(bestUV[0] - expectedU), Math.abs(bestUV[0] - expectedU + 1),
    Math.abs(bestUV[0] - expectedU - 1));
  assert.ok(uError < .008 && Math.abs(bestUV[1] - (lat + 90) / 180) < .008,
    `${id}: mapped texture coordinate must align with the location marker`);
}
sphere.dispose();

const regions = new Map([
  ['USA', {id: 'USA', lon: -103.5725, lat: 44.7557}],
  ['PHL', {id: 'PHL', lon: 121.5505, lat: 15.7417}],
  ['NZL', {id: 'NZL', lon: 172.9514, lat: -41.5511}]
]);
const scene = new THREE.Scene();
const earthGroup = new THREE.Group();
scene.add(earthGroup);
const camera = new THREE.PerspectiveCamera();
camera.position.set(0, .2, 8.5);
const layer = new GlobeCharacters({scene, earthGroup, camera, regionFor: id => regions.get(id)});
const people = [
  {datasetId: 'ATP152', displayId: 'ATP152-A', regionId: 'USA', avatar: {}},
  {datasetId: 'ATP152', displayId: 'ATP152-B', regionId: 'USA', avatar: {}},
  {datasetId: 'ISSP2019', displayId: 'ISSP2019-A', regionId: 'PHL', avatar: {}},
  {datasetId: 'ISSP2019', displayId: 'ISSP2019-B', regionId: 'NZL', avatar: {}}
];
layer.setParticipants(people);
assert.equal(layer.entries.size, 4);
const atpA = layer.entries.get('ATP152:ATP152-A');
const atpB = layer.entries.get('ATP152:ATP152-B');
assert.ok(atpA.source.distanceTo(atpB.source) > 0, 'same-country display offsets overlap');
assert.ok(atpA.source.clone().normalize().distanceTo(geographicVector(-103.5725, 44.7557)) < .001,
  'first US person remains at the audited anchor');
layer.setSelection('ATP152', '');
layer.setShowcase('ATP152', people.slice(0, 2));
layer.tick(performance.now() + 500);
layer.setSelection('ISSP2019', '');
layer.setShowcase('ISSP2019', people.slice(2));
layer.skip(performance.now());
assert.equal(layer.showcaseDataset, 'ISSP2019');
assert.ok(!atpA.group.visible, 'old selection is noninteractive after interruption');
for (const person of people.slice(2)) {
  const entry = layer.entries.get(`${person.datasetId}:${person.displayId}`);
  assert.equal(entry.group.parent, scene, 'latest selection is in the reading scene');
  assert.ok(entry.group.visible);
}
const nz = layer.entries.get('ISSP2019:ISSP2019-B');
layer.closeShowcase(false);
const returnMotion = nz.transition;
for (const fraction of [.1, .25, .5, .75, .9, .98]) {
  layer.tick(returnMotion.start + returnMotion.duration * fraction);
  assert.ok(nz.group.position.length() > 2.015,
    `backside return path enters the Earth at ${(fraction * 100).toFixed(0)}%`);
}
layer.skip(performance.now());
assert.equal(layer.showcaseDataset, '');
for (const entry of layer.entries.values()) assert.equal(entry.group.parent, earthGroup);
layer.setShowcase('ATP152', people.slice(0, 2));
assert.equal(atpA.group.parent, earthGroup, 'person stays on the sphere during focus');
layer.closeShowcase();
layer.tick(performance.now() + 5000);
assert.equal(atpA.group.parent, earthGroup, 'cancel before takeoff cannot resurrect old entry');
assert.equal(atpA.transition, null);
layer.dispose();
assert.equal(layer.entries.size, 0);
console.log('PASS: geographic anchors and texture UVs, date-line round trips, two-person entry, interrupted selection and return');
