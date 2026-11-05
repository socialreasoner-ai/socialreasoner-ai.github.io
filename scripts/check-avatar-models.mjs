#!/usr/bin/env node
// Inspect the shipped binary assets and sample their actual skinned animations.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as THREE from '../assets/vendor/three/three.module.js';
import { GLTFLoader } from '../assets/vendor/three/addons/loaders/GLTFLoader.js';

const site = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(site, 'assets/respondent-showcase.json'), 'utf8'));
const datasetFilter = process.argv.find(arg => arg.startsWith('--dataset='))?.split('=')[1];
const people = manifest.datasets.filter(dataset => !datasetFilter || dataset.datasetId === datasetFilter)
  .flatMap(dataset => dataset.participants).filter(person => person.avatar.assetStatus === 'rigged-glb');
const digests = new Set();
const report = [];
const point = new THREE.Vector3();
for (const person of people) {
  const bytes = readFileSync(resolve(site, person.avatar.modelPath));
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF', person.displayId);
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length, 'GLB length');
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, 'First GLB chunk must be JSON');
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
  assert(json.skins?.length > 0, `${person.displayId}: missing actual skin`);
  assert(json.skins.some(skin => skin.joints.length >= 15), `${person.displayId}: incomplete skeleton`);
  assert(!json.buffers.some(buffer => buffer.uri), 'GLB must be self-contained');
  assert(!(json.images || []).some(image => image.uri), 'No external texture dependency');
  assert.equal(json.animations.length, 4, `${person.displayId}: animation count`);
  assert.deepEqual(new Set(json.animations.map(animation => animation.name)), new Set(['Idle', 'Turn', 'Walk', 'Wave']));
  const digest = createHash('sha256').update(bytes).digest('hex');
  assert(!digests.has(digest), 'Duplicate avatar binary');
  digests.add(digest);

  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const meshes = [];
  gltf.scene.traverse(node => { if (node.isSkinnedMesh) meshes.push(node); });
  assert(meshes.length > 0, 'No loaded skinned mesh');
  gltf.scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(gltf.scene);
  const size = bounds.getSize(new THREE.Vector3());
  assert(size.y > 1.8 && size.y < 2.5, `${person.displayId}: character height ${size.y}`);
  assert(Math.abs(bounds.min.y) < .1, `${person.displayId}: feet not grounded`);
  assert(size.x > .4 && size.z > .25, `${person.displayId}: character has no full 3D volume`);
  let triangles = 0;
  for (const mesh of meshes) {
    const geometry = mesh.geometry;
    assert(geometry.getAttribute('skinIndex') && geometry.getAttribute('skinWeight'));
    triangles += (geometry.index?.count || geometry.getAttribute('position').count) / 3;
    assert.equal(mesh.skeleton.bones.length, mesh.skeleton.boneInverses.length);
  }
  assert(triangles >= 1000 && triangles < 150000, `${person.displayId}: unexpected mesh density ${triangles}`);
  const mixer = new THREE.AnimationMixer(gltf.scene);
  function sampleVertices() {
    gltf.scene.updateMatrixWorld(true);
    const positions = [];
    for (const mesh of meshes) {
      mesh.skeleton.update();
      const position = mesh.geometry.getAttribute('position');
      const stride = Math.max(1, Math.floor(position.count / 180));
      for (let index = 0; index < position.count; index += stride) {
        point.fromBufferAttribute(position, index);
        mesh.applyBoneTransform(index, point).applyMatrix4(mesh.matrixWorld);
        positions.push(point.x, point.y, point.z);
      }
    }
    assert(positions.every(Number.isFinite), 'Nonfinite skinned coordinates');
    return positions;
  }
  for (const name of ['Idle', 'Turn', 'Walk', 'Wave']) {
    const clip = THREE.AnimationClip.findByName(gltf.animations, name);
    assert(clip && clip.duration >= .4 && clip.duration <= 8, `${person.displayId}: ${name} duration`);
    mixer.stopAllAction();
    const action = mixer.clipAction(clip).setLoop(THREE.LoopOnce, 1).play();
    action.clampWhenFinished = true;
    mixer.setTime(0);
    const start = sampleVertices();
    let maxChange = 0;
    for (const progress of [.2, .4, .6, .8]) {
      mixer.setTime(clip.duration * progress);
      const changed = sampleVertices();
      maxChange = Math.max(maxChange, ...changed.map((value, index) => Math.abs(value - start[index])));
    }
    assert(maxChange > (name === 'Idle' ? .0001 : .01), `${person.displayId}: ${name} does not deform actual vertices`);
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(gltf.scene);
  meshes.forEach(mesh => { mesh.geometry.dispose(); mesh.skeleton.dispose(); });
  report.push({ person: person.displayId, bytes: bytes.length, triangles, skins: json.skins.length, bones: Math.max(...json.skins.map(skin => skin.joints.length)) });
}
assert.equal(report.length, datasetFilter ? 2 : 18);
console.log(`GLB assets passed: ${report.length} distinct volumetric skinned characters, ${report.length * 4} animated clips, ${(report.reduce((total, item) => total + item.bytes, 0) / 1048576).toFixed(1)} MiB.`);
if (process.argv.includes('--details')) console.log(JSON.stringify(report, null, 2));
