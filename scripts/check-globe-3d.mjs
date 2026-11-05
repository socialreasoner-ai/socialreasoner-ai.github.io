import assert from 'node:assert/strict';
import * as THREE from '../assets/vendor/three/three.module.js';
import {geographicVector, GlobeCharacters, OVERVIEW_CHARACTER_SCALE} from '../globe-characters.js';
import {vectorToGeographic, centerRotationFor, globeViewportFor} from '../globe-renderer-3d.js';

for (const [width,height] of [[306,420],[336,420],[540,446],[705,540],[926,650],[1158,691],[1262,760]]) {
  const layout = globeViewportFor(width,height);
  const fitCamera = new THREE.PerspectiveCamera(layout.fov,layout.aspect,.1,80);
  fitCamera.position.set(0,layout.cameraY,layout.overviewZ);
  fitCamera.lookAt(0,layout.cameraY,0);
  fitCamera.updateMatrixWorld(true);
  for (let lat=-90;lat<=90;lat+=5) for (let lon=-180;lon<=180;lon+=5) {
    const point=geographicVector(lon,lat,2.68).project(fitCamera);
    assert.ok(Math.abs(point.x)<.98 && Math.abs(point.y)<.98,
      `${width}: the globe and standing characters must fit the overview`);
  }
  fitCamera.position.z=layout.readingZ;
  fitCamera.updateMatrixWorld(true);
  for (const x of [-layout.readingSide-.98,layout.readingSide+.98])
    for (const y of [-1.20,1.10]) for (const z of [1.55,3.65]) {
      const point=new THREE.Vector3(x,y,z).project(fitCamera);
      assert.ok(Math.abs(point.x)<=.941 && Math.abs(point.y)<.94,
        `${width}: full bodies, Wave/Turn bounds and forward Walk must fit the reading scene`);
    }
}
const projectedDiameter=(height,distance,fov)=>height*2/(Math.sqrt(distance*distance-4)*Math.tan(THREE.MathUtils.degToRad(fov/2)));
const desktopGlobeGain=projectedDiameter(760,globeViewportFor(1262,760).overviewZ,40)/projectedDiameter(580,8.5,40);
assert.ok(desktopGlobeGain>1.3 && desktopGlobeGain<1.5, 'desktop globe diameter grows visibly by 30–50%');
const desktopPersonGain=desktopGlobeGain*OVERVIEW_CHARACTER_SCALE/.22;
assert.ok(desktopPersonGain>1.5 && desktopPersonGain<2, 'overview people grow by 1.5–2 times');
console.log('PASS: desktop and 360/390px mobile projection fit, complete Wave/Turn/Walk bounds, larger globe and people');

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

// Exercise the same loader, skeleton cloning and animation API used in the browser.
function makeRig() {
  const rigScene = new THREE.Group();
  const bone = new THREE.Bone();
  bone.name = 'Rig';
  rigScene.add(bone);
  const geometry = new THREE.BoxGeometry(.7, 2.1, .35).translate(0, 1.05, 0);
  const count = geometry.attributes.position.count;
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4));
  const weights = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) weights[i * 4] = 1;
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial({color: '#7195b8'}));
  rigScene.add(mesh);
  mesh.bind(new THREE.Skeleton([bone]));
  const animation = (name, duration, angle) => new THREE.AnimationClip(name, duration,
    [new THREE.NumberKeyframeTrack('Rig.rotation[y]', [0, duration / 2, duration], [0, angle, 0])]);
  return {scene: rigScene, animations: [animation('Idle', 2, .025), animation('Turn', 1.5, Math.PI),
    animation('Walk', .9, .16), animation('Wave', 1.2, .3)]};
}
const rigSource = makeRig();
let loads = 0;
const statuses = [];
const rigScene = new THREE.Scene();
const rigEarth = new THREE.Group();
rigScene.add(rigEarth);
const rigCamera = new THREE.PerspectiveCamera(40, 1, .1, 80);
rigCamera.position.set(0, .2, 8.5);
rigCamera.lookAt(0, 0, 0);
rigCamera.updateMatrixWorld(true);
const rigLayer = new GlobeCharacters({scene: rigScene, earthGroup: rigEarth, camera: rigCamera,
  regionFor: id => regions.get(id), onStatusChange: detail => statuses.push(detail),
  modelLoader: {loadAsync: async () => {loads++; return rigSource;}}});
const rigPeople = people.slice(0, 2).map(person => ({...person, avatar: {
  modelPath: 'assets/avatars/models/shared-test.glb', assetStatus: 'rigged-glb',
  animations: {idle: 'Idle', turn: 'Turn', walk: 'Walk', wave: 'Wave'}, groundTravel: .7}}));
rigLayer.setParticipants(rigPeople);
assert.equal(rigLayer.getCharacterStatus(rigPeople[0].displayId), 'loading');
rigLayer.setShowcase('ATP152', rigPeople);
await Promise.all([...rigLayer.entries.values()].map(entry => entry.modelReady));
assert.equal(loads, 1, 'two characters sharing an asset use one cached GLB load');
const [a, b] = [...rigLayer.entries.values()];
const skinOf = entry => {
  let skin;
  entry.model.traverse(child => {if (child.isSkinnedMesh) skin = child;});
  return skin;
};
assert.notEqual(a.mixer, b.mixer, 'each person owns an independent mixer');
assert.notEqual(skinOf(a).skeleton, skinOf(b).skeleton, 'each person owns an independent skin');
assert.notEqual(skinOf(a).skeleton.bones[0], skinOf(b).skeleton.bones[0], 'clones never share animated bones');
assert.notEqual(skinOf(a).material, skinOf(b).material, 'per-person materials can be disposed independently');
assert.ok(!a.poster.visible && !b.poster.visible, 'ready GLB atomically replaces the fallback poster');
assert.equal(rigLayer.getCharacterStatus(a.person.displayId), 'ready');
assert.ok(statuses.some(event => event.displayId === a.person.displayId && event.status === 'ready'));
rigLayer.skip();
let clock = performance.now();
const advance = milliseconds => {
  for (let elapsed = 0; elapsed < milliseconds; elapsed += 25) {
    clock += 25;
    rigScene.updateMatrixWorld(true);
    rigLayer.tick(clock);
  }
};
rigLayer.tick(clock);
assert.equal(rigLayer.playAction('turn', a.person.displayId), true);
advance(400);
assert.equal(a.currentClip, 'turn');
assert.equal(b.currentClip, 'idle', "one person's action leaves the other person idle");
assert.ok(Math.abs(skinOf(a).skeleton.bones[0].rotation.y - skinOf(b).skeleton.bones[0].rotation.y) > .1,
  'independent animation changes the selected skin');
const pausedTime = a.action.time;
rigLayer.setSuspended(true);
rigLayer.tick(clock + 60000);
assert.equal(a.action.time, pausedTime, 'hidden or offscreen scenes pause mixers');
rigLayer.setSuspended(false);
clock += 60000;
rigLayer.tick(clock);
assert.equal(a.action.time, pausedTime, 'resuming cannot advance a mixer by the hidden interval');
advance(1500);
assert.equal(a.currentClip, 'idle', 'one-shot Turn returns to Idle');
const walkStart = a.group.position.clone();
assert.equal(rigLayer.playAction('walk', a.person.displayId), true);
assert.ok(Math.abs(a.travel.target.distanceTo(a.travel.from) - .7) < 1e-9,
  'in-place Walk receives exactly one .7 unit outer translation');
advance(250);
assert.ok(a.group.position.z > walkStart.z && a.group.position.z < walkStart.z + .7);
advance(1000);
assert.equal(a.travel, null);
assert.ok(Math.abs(a.group.position.z - walkStart.z - .7) < 1e-9);
assert.equal(a.currentClip, 'idle');
assert.equal(rigLayer.playAction('walk', a.person.displayId), true);
advance(1600);
assert.ok(a.group.position.distanceTo(walkStart) < 1e-9, 'repeated short walks stay within the stage');
assert.equal(a.actor.rotation.y, 0, 'a return walk finishes facing the reader');
assert.equal(rigLayer.playAction('wave', a.person.displayId), true);
advance(1500);
assert.equal(a.currentClip, 'idle', 'Wave returns to Idle');
assert.equal(rigLayer.playAction('unknown', a.person.displayId), false);
rigLayer.setMotionReduced(true);
const reducedTime = a.action.time;
advance(500);
assert.equal(a.action.time, reducedTime, 'reduced motion keeps automatic idle still');
assert.equal(rigLayer.playAction('wave', a.person.displayId), true,
  'reduced motion still permits an explicit user action');
advance(1500);
assert.equal(a.currentClip, 'idle');
const completedTime = a.action.time;
advance(500);
assert.equal(a.action.time, completedTime, 'an explicit reduced-motion action finishes at a static idle');
rigLayer.setMotionReduced(false);
rigLayer.playAction('walk', a.person.displayId);
advance(250);
rigLayer.skip();
assert.equal(a.travel, null, 'Skip settles pending ground travel');
assert.equal(a.currentClip, 'idle');
const cloneMaterial = skinOf(a).material;
let cloneDisposals = 0;
let sourceDisposals = 0;
cloneMaterial.addEventListener('dispose', () => cloneDisposals++);
rigSource.scene.children.find(child => child.isSkinnedMesh).geometry.addEventListener('dispose', () => sourceDisposals++);
rigLayer.dispose();
await Promise.resolve();
assert.equal(cloneDisposals, 1);
assert.equal(sourceDisposals, 1, 'shared GLB resources are disposed once');
assert.equal(rigLayer.hitMeshes.length, 0);

const queueScene = new THREE.Scene();
const queueEarth = new THREE.Group();
queueScene.add(queueEarth);
const requests = [];
const errors = [];
const deferred = new Map();
const queueLayer = new GlobeCharacters({scene: queueScene, earthGroup: queueEarth, camera: rigCamera,
  regionFor: id => regions.get(id), onResourceError: detail => errors.push(detail),
  modelLoader: {loadAsync: path => {requests.push(path); return new Promise((resolve, reject) => {
    deferred.set(path, {resolve, reject});
  });}}});
const queuePeople = Array.from({length: 5}, (_, i) => ({datasetId: 'ATP152', displayId: `queue-${i}`,
  regionId: 'USA', avatar: {...rigPeople[0].avatar, modelPath: `assets/avatars/models/queue-${i}.glb`}}));
queueLayer.setParticipants(queuePeople);
const queued = [...queueLayer.entries.values()];
for (const entry of queued.slice(0, 4)) void queueLayer.loadModel(entry);
void queueLayer.loadModel(queued[4], true);
assert.equal(requests.length, 2, 'GLB loading is bounded to two concurrent requests');
deferred.get(queuePeople[0].avatar.modelPath).resolve(makeRig());
await queued[0].modelReady;
await new Promise(resolve => setImmediate(resolve));
assert.equal(requests[2], queuePeople[4].avatar.modelPath, 'the selected person jumps ahead of overview models');
deferred.get(queuePeople[1].avatar.modelPath).reject(new Error('simulated model failure'));
await queued[1].modelReady;
await new Promise(resolve => setImmediate(resolve));
assert.equal(queueLayer.getCharacterStatus(queuePeople[1].displayId), 'fallback');
assert.equal(queued[1].poster.visible, true, 'failed GLB retains the PNG fallback');
assert.equal(errors.length, 1);
const pendingPerson = queued[4];
queueLayer.setParticipants(queuePeople.slice(0, 4));
deferred.get(queuePeople[4].avatar.modelPath).resolve(makeRig());
await pendingPerson.modelReady;
assert.equal(pendingPerson.model, null, 'an obsolete load cannot resurrect a removed person');
queueLayer.dispose();
for (const [path, request] of deferred) if (path !== queuePeople[1].avatar.modelPath) request.resolve(makeRig());
await new Promise(resolve => setImmediate(resolve));
assert.equal(queueLayer.entries.size, 0, 'dispose remains final after outstanding loads finish');
console.log('PASS: GLB cache, independent skins/mixers, one-shot actions, ground travel, reduced motion, pause/resume, priority queue, fallback and disposal races');
