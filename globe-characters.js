import * as THREE from './assets/vendor/three/three.module.js';
import { GLTFLoader } from './assets/vendor/three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from './assets/vendor/three/addons/utils/SkeletonUtils.js';

const UP = new THREE.Vector3(0, 1, 0);
const IDENTITY = new THREE.Quaternion();
const ease = t => t * t * (3 - 2 * t);
const clamp = value => Math.max(0, Math.min(1, value));
const keyFor = person => `${person.datasetId}:${person.displayId}`;
const semantics = ['idle', 'turn', 'walk', 'wave'];
const validModelPath = path => typeof path === 'string' &&
  /^assets\/avatars\/models\/[A-Za-z0-9_-]+\.glb$/.test(path);
const hasModel = person => validModelPath(person.avatar?.modelPath) && person.avatar?.assetStatus === 'rigged-glb';
export const OVERVIEW_CHARACTER_SCALE = .30;

// East-positive longitude follows the representative points and the map's -PI/2 rotation.
export function geographicVector(lon, lat, radius = 1) {
  const lambda = THREE.MathUtils.degToRad(lon);
  const phi = THREE.MathUtils.degToRad(lat);
  return new THREE.Vector3(Math.sin(lambda) * Math.cos(phi), Math.sin(phi),
    Math.cos(lambda) * Math.cos(phi)).multiplyScalar(radius);
}

function surfaceQuaternion(normal, cameraInEarth, position) {
  const face = cameraInEarth.clone().sub(position);
  face.addScaledVector(normal, -face.dot(normal));
  if (face.lengthSq() < .001) face.set(0, 0, 1).addScaledVector(normal, -normal.z);
  face.normalize();
  const x = new THREE.Vector3().crossVectors(normal, face).normalize();
  const z = new THREE.Vector3().crossVectors(x, normal).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, normal, z));
}

function arcDirection(from, to, t) {
  const a = from.clone().normalize();
  const b = to.clone().normalize();
  return a.applyQuaternion(new THREE.Quaternion().identity().slerp(
    new THREE.Quaternion().setFromUnitVectors(a, b), t));
}

export class GlobeCharacters {
  constructor({scene, earthGroup, camera, regionFor, onPersonSelect, onResourceError,
    onStatusChange, modelLoader}) {
    Object.assign(this, {scene, earthGroup, camera, regionFor, onPersonSelect, onResourceError, onStatusChange});
    this.entries = new Map();
    this.textureCache = new Map();
    this.modelCache = new Map();
    this.disposedSources = new WeakSet();
    this.modelLoader = modelLoader || new GLTFLoader();
    this.loadQueue = [];
    this.activeLoads = 0;
    this.overviewTimer = 0;
    this.lastTick = 0;
    this.selectedDataset = 'all';
    this.showcaseDataset = '';
    this.activePersonId = '';
    this.stageSide = 1.24;
    this.motionReduced = false;
    this.suspended = false;
    this.disposed = false;
    this.requestId = 0;
    this.hitMeshes = [];
    this.platformGeometry = new THREE.CylinderGeometry(.46, .52, .075, 24);
    this.platformMaterial = new THREE.MeshStandardMaterial({color: 0x275472, metalness: .12, roughness: .76});
    this.platformTopGeometry = new THREE.CircleGeometry(.445, 24);
    this.platformTopMaterial = new THREE.MeshStandardMaterial({color: 0x4d9db6, emissive: 0x164457,
      emissiveIntensity: .35, roughness: .72});
    this.avatarGeometry = new THREE.PlaneGeometry(1.38, 2.16);
    this.placeholderMaterial = new THREE.MeshBasicMaterial({color: 0xa2c8dc, transparent: true,
      opacity: .22, side: THREE.DoubleSide, depthWrite: false});
  }

  setStatus(entry, status) {
    if (entry.modelStatus === status) return;
    entry.modelStatus = status;
    this.onStatusChange?.({displayId: entry.person.displayId, datasetId: entry.person.datasetId, status});
  }

  getCharacterStatus(displayId = this.activePersonId) {
    return [...this.entries.values()].find(entry => entry.person.displayId === displayId)?.modelStatus || 'fallback';
  }

  setParticipants(people) {
    if (this.disposed) return;
    const wanted = new Set();
    for (const person of people || []) {
      const region = this.regionFor(person.regionId);
      if (!region || !Number.isFinite(region.lon) || !Number.isFinite(region.lat)) continue;
      const key = keyFor(person);
      wanted.add(key);
      const existing = this.entries.get(key);
      if (existing) {
        const changed = existing.person.avatar?.modelPath !== person.avatar?.modelPath ||
          hasModel(existing.person) !== hasModel(person);
        existing.person = person;
        if (changed) {
          existing.version++;
          this.releaseModel(existing);
          existing.modelReady = null;
          this.setStatus(existing, hasModel(person) ? 'loading' : 'fallback');
        }
        continue;
      }
      const group = new THREE.Group();
      group.name = key;
      const platform = new THREE.Mesh(this.platformGeometry, this.platformMaterial.clone());
      platform.position.y = -.045;
      group.add(platform);
      const top = new THREE.Mesh(this.platformTopGeometry, this.platformTopMaterial.clone());
      top.rotation.x = -Math.PI / 2;
      top.position.y = .003;
      group.add(top);
      const actor = new THREE.Group();
      group.add(actor);
      const poster = new THREE.Mesh(this.avatarGeometry, this.placeholderMaterial.clone());
      poster.position.y = 1.1;
      poster.material.alphaTest = .08;
      poster.userData.personKey = key;
      actor.add(poster);
      const index = [...this.entries.values()].filter(entry => entry.person.regionId === person.regionId).length;
      const offsetAngle = index * 2.399963;
      const offsetRadius = Math.min(.18, .06 * Math.sqrt(index));
      const center = geographicVector(region.lon, region.lat, 1);
      const tangent = new THREE.Vector3().crossVectors(UP, center).normalize();
      if (tangent.lengthSq() < .001) tangent.set(1, 0, 0);
      const bitangent = new THREE.Vector3().crossVectors(center, tangent).normalize();
      const displaced = center.clone().addScaledVector(tangent, Math.cos(offsetAngle) * offsetRadius)
        .addScaledVector(bitangent, Math.sin(offsetAngle) * offsetRadius).normalize().multiplyScalar(2.025);
      const entry = {key, person, group, actor, poster, top, platform, source: displaced,
        transition: null, travel: null, model: null, mixer: null, modelStatus: '', version: 0,
        currentClip: '', desiredClip: 'idle', heading: 0, greeting: false, explicitMotion: false,
        materials: new Set()};
      this.entries.set(key, entry);
      this.earthGroup.add(group);
      group.position.copy(displaced);
      group.scale.setScalar(OVERVIEW_CHARACTER_SCALE);
      this.hitMeshes.push(poster);
      this.setStatus(entry, hasModel(person) ? 'loading' : 'fallback');
      this.loadPoster(entry);
    }
    for (const [key, entry] of this.entries) if (!wanted.has(key)) this.removeEntry(entry);
    this.applyVisibility();
    this.scheduleOverviewModels();
  }

  loadPoster(entry) {
    const path = entry.person.avatar?.posterPath;
    if (!path) return;
    let promise = this.textureCache.get(path);
    if (!promise) {
      promise = new THREE.TextureLoader().loadAsync(path).then(texture => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.anisotropy = 2;
        return texture;
      });
      this.textureCache.set(path, promise);
    }
    promise.then(texture => {
      if (this.disposed || this.entries.get(entry.key) !== entry) return;
      const previous = entry.poster.material;
      entry.poster.material = new THREE.MeshBasicMaterial({map: texture, transparent: true, alphaTest: .08,
        side: THREE.DoubleSide, depthWrite: false, toneMapped: false});
      previous.dispose();
    }).catch(error => {
      if (!this.disposed) this.onResourceError?.({type: 'poster', path, error});
    });
  }

  scheduleOverviewModels() {
    clearTimeout(this.overviewTimer);
    this.overviewTimer = setTimeout(() => {
      if (this.disposed) return;
      for (const entry of this.entries.values()) if (hasModel(entry.person)) void this.loadModel(entry);
    }, 650);
  }

  loadModel(entry, priority = false) {
    if (!hasModel(entry.person) || this.disposed) return Promise.resolve(null);
    const path = entry.person.avatar.modelPath;
    if (entry.model && entry.modelPath === path) return Promise.resolve(entry.model);
    if (entry.modelReady && entry.modelPath === path) {
      if (priority) {
        const index = this.loadQueue.findIndex(job => job.entry === entry && job.version === entry.version);
        if (index >= 0) this.loadQueue.unshift(this.loadQueue.splice(index, 1)[0]);
      }
      return entry.modelReady;
    }
    entry.modelPath = path;
    this.setStatus(entry, 'loading');
    entry.modelReady = new Promise(resolve => {
      const job = {entry, path, version: entry.version, resolve};
      if (priority) this.loadQueue.unshift(job);
      else this.loadQueue.push(job);
    });
    this.drainModelQueue();
    return entry.modelReady;
  }

  drainModelQueue() {
    while (!this.disposed && this.activeLoads < 2 && this.loadQueue.length) {
      const job = this.loadQueue.shift();
      if (this.entries.get(job.entry.key) !== job.entry || job.version !== job.entry.version) {
        job.resolve(null);
        continue;
      }
      this.activeLoads++;
      this.loadModelNow(job).then(job.resolve).finally(() => {
        this.activeLoads--;
        this.drainModelQueue();
      });
    }
  }

  async loadModelNow({entry, path, version}) {
    try {
      let source = this.modelCache.get(path);
      if (!source) {
        source = this.modelLoader.loadAsync(path);
        this.modelCache.set(path, source);
      }
      const gltf = await source;
      if (this.disposed || this.entries.get(entry.key) !== entry || entry.version !== version) return null;
      const names = entry.person.avatar?.animations || {};
      const clips = {};
      for (const semantic of semantics) {
        clips[semantic] = gltf.animations?.find(clip => clip.name === (names[semantic] || semantic[0].toUpperCase() + semantic.slice(1)));
        if (!clips[semantic]) throw new Error(`GLB missing ${semantic} animation`);
      }
      let rigged = false;
      gltf.scene.traverse(child => { if (child.isSkinnedMesh) rigged = true; });
      if (!rigged) throw new Error('GLB has no skinned mesh');
      const model = cloneSkeleton(gltf.scene);
      model.name = `model:${entry.key}`;
      const materials = new Map();
      model.traverse(child => {
        if (!child.isMesh) return;
        child.userData.personKey = entry.key;
        if (child.isSkinnedMesh) child.frustumCulled = false;
        const cloneMaterial = material => {
          if (!materials.has(material)) materials.set(material, material.clone());
          return materials.get(material);
        };
        child.material = Array.isArray(child.material) ? child.material.map(cloneMaterial) : cloneMaterial(child.material);
      });
      // All authored rigs share feet=0 and height=2.1. Normalize a differing export once, outside the animated rig.
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const height = box.max.y - box.min.y;
      const mount = new THREE.Group();
      if (Number.isFinite(height) && height > .01) {
        const scale = 2.1 / height;
        mount.scale.setScalar(scale);
        mount.position.y = -box.min.y * scale;
      }
      mount.add(model);
      entry.actor.add(mount);
      entry.mount = mount;
      entry.model = model;
      entry.materials = new Set(materials.values());
      entry.clips = clips;
      entry.mixer = new THREE.AnimationMixer(model);
      model.traverse(child => { if (child.isMesh) this.hitMeshes.push(child); });
      entry.poster.visible = false;
      this.setAnimation(entry, 'idle', 0, true);
      this.setStatus(entry, 'ready');
      if (entry.greeting && entry.group.parent === this.scene && !entry.transition && !this.motionReduced) {
        entry.greeting = false;
        this.setAnimation(entry, 'wave');
      }
      return model;
    } catch (error) {
      if (!this.disposed && this.entries.get(entry.key) === entry && entry.version === version) {
        entry.poster.visible = true;
        this.setStatus(entry, 'fallback');
        this.onResourceError?.({type: 'model', path, error});
      }
      return null;
    }
  }

  setAnimation(entry, semantic, fade = .16, restart = false) {
    entry.desiredClip = semantic;
    if (!entry.mixer || !entry.clips?.[semantic] || (!restart && entry.currentClip === semantic)) return false;
    const previous = entry.action;
    const action = entry.mixer.clipAction(entry.clips[semantic]);
    action.reset();
    action.enabled = true;
    action.paused = false;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(1);
    const once = semantic !== 'idle';
    action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    action.clampWhenFinished = once;
    if (previous && previous !== action && fade > 0) action.crossFadeFrom(previous, fade, false);
    else if (previous && previous !== action) previous.stop();
    action.play();
    entry.action = action;
    entry.currentClip = semantic;
    entry.mixer.update(0);
    return true;
  }

  beginWalk(entry, target, greeting = false) {
    const travel = Number(entry.person.avatar?.groundTravel) || .7;
    const from = entry.group.position.clone();
    if (!target) {
      target = from.clone();
      const anchor = entry.stageAnchor?.z ?? from.z;
      target.z = from.z > anchor + travel * .5 ? anchor : anchor + travel;
    }
    const heading = target.z < from.z ? Math.PI : 0;
    entry.travel = {from, target, elapsed: 0, duration: entry.clips.walk.duration,
      phase: Math.abs(entry.heading - heading) > .1 ? 'face' : 'stride',
      fromHeading: entry.heading, heading, greeting};
    if (entry.travel.phase === 'stride') this.setAnimation(entry, 'walk', .12, true);
    else this.setAnimation(entry, 'idle');
  }

  playAction(name, displayId = this.activePersonId) {
    const semantic = String(name || '').toLowerCase();
    if (!semantics.includes(semantic)) return false;
    const entry = [...this.entries.values()].find(item => item.person.displayId === displayId);
    if (!entry?.model || !entry.group.visible || entry.group.parent !== this.scene || entry.transition) return false;
    entry.greeting = false;
    entry.explicitMotion = semantic !== 'idle';
    entry.travel = null;
    if (semantic === 'walk') this.beginWalk(entry);
    else {
      entry.heading = 0;
      entry.actor.rotation.y = 0;
      this.setAnimation(entry, semantic, .16, true);
    }
    return true;
  }

  releaseModel(entry) {
    entry.travel = null;
    entry.mixer?.stopAllAction();
    if (entry.model) entry.mixer?.uncacheRoot(entry.model);
    entry.model?.traverse(child => { if (child.isSkinnedMesh) child.skeleton.dispose(); });
    for (const material of entry.materials) material.dispose();
    entry.materials.clear();
    entry.mount?.removeFromParent();
    this.hitMeshes = this.hitMeshes.filter(mesh => mesh === entry.poster || mesh.userData.personKey !== entry.key);
    entry.model = entry.mount = entry.mixer = entry.action = null;
    entry.currentClip = '';
    entry.poster.visible = true;
  }

  removeEntry(entry) {
    entry.version++;
    this.releaseModel(entry);
    entry.group.removeFromParent();
    entry.poster.material.dispose();
    entry.platform.material.dispose();
    entry.top.material.dispose();
    this.entries.delete(entry.key);
    this.hitMeshes = this.hitMeshes.filter(mesh => mesh.userData.personKey !== entry.key);
  }

  setSelection(dataset, selectedRegion = '') {
    this.selectedDataset = dataset || 'all';
    this.selectedRegion = selectedRegion || '';
    if (selectedRegion && this.showcaseDataset) this.closeShowcase(true);
    this.applyVisibility();
  }

  setActivePerson(id) {
    this.activePersonId = id || '';
    this.applyVisibility();
  }

  setStageSide(side) {
    this.stageSide = side;
    for (const entry of this.entries.values()) {
      if (!entry.stageAnchor || !entry.side) continue;
      const x = entry.side * side;
      const delta = x - entry.stageAnchor.x;
      entry.stageAnchor.x = x;
      if (entry.transition?.kind === 'enter') {
        entry.transition.target.x = x;
        if (entry.transition.flightTarget) entry.transition.flightTarget.x = x;
      } else if (entry.group.parent === this.scene && !entry.transition) {
        entry.group.position.x += delta;
        if (entry.travel) {entry.travel.from.x += delta; entry.travel.target.x += delta;}
      }
    }
  }

  setMotionReduced(value) {
    this.motionReduced = Boolean(value);
    if (this.motionReduced) for (const entry of this.entries.values()) {
      if (entry.travel) entry.group.position.copy(entry.travel.target);
      entry.travel = null;
      entry.heading = 0;
      entry.actor.rotation.y = 0;
      entry.greeting = false;
      entry.explicitMotion = false;
      entry.mixer?.stopAllAction();
      entry.currentClip = '';
      this.setAnimation(entry, 'idle', 0, true);
    }
    this.lastTick = 0;
  }

  setSuspended(value) {
    this.suspended = Boolean(value);
    this.lastTick = 0;
  }

  applyVisibility() {
    for (const entry of this.entries.values()) {
      const inDataset = this.selectedDataset === 'all' || entry.person.datasetId === this.selectedDataset;
      const inShowcase = this.showcaseDataset && entry.person.datasetId === this.showcaseDataset;
      entry.group.visible = !this.selectedRegion && (this.showcaseDataset ? Boolean(inShowcase) : inDataset);
      const active = entry.person.displayId === this.activePersonId;
      entry.top.material.emissiveIntensity = inShowcase ? (active ? 1.6 : 1.05) : .35;
      entry.platform.material.color.setHex(inShowcase ? 0x39778e : 0x275472);
    }
  }

  setShowcase(dataset, people = [], reduced = false) {
    if (this.disposed) return;
    if (people.length) this.setParticipants([...this.entries.values()].map(entry => entry.person).concat(people));
    this.requestId++;
    this.setMotionReduced(reduced);
    const now = performance.now();
    for (const entry of this.entries.values()) {
      entry.travel = null;
      entry.greeting = false;
      entry.explicitMotion = false;
      entry.heading = 0;
      entry.actor.rotation.y = 0;
      this.setAnimation(entry, 'idle');
      if (entry.person.datasetId !== dataset) {
        if (entry.group.parent === this.scene) this.beginReturn(entry, now, reduced);
        else entry.transition = null;
      }
    }
    this.showcaseDataset = dataset;
    this.activePersonId = people[0]?.displayId || '';
    const selected = people.map(person => this.entries.get(keyFor(person))).filter(Boolean);
    this.earthGroup.updateMatrixWorld(true);
    selected.forEach((entry, i) => {
      void this.loadModel(entry, true);
      const side = i === 0 ? -1 : 1;
      entry.side = side;
      const target = new THREE.Vector3(side * this.stageSide, -1.08, 2.25);
      entry.stageAnchor = target.clone();
      entry.transition = {kind: 'enter', target, side, initialized: false,
        start: now + (reduced || entry.group.parent === this.scene ? 0 : 420 + i * 110),
        duration: reduced ? 1 : 1050};
    });
    this.applyVisibility();
  }

  beginReturn(entry, now = performance.now(), reduced = this.motionReduced) {
    entry.travel = null;
    entry.greeting = false;
    entry.heading = 0;
    entry.actor.rotation.y = 0;
    this.setAnimation(entry, 'idle');
    if (entry.group.parent === this.earthGroup && !entry.transition) return;
    if (entry.group.parent !== this.scene) this.scene.attach(entry.group);
    const center = this.earthGroup.getWorldPosition(new THREE.Vector3());
    entry.transition = {kind: 'return', from: entry.group.position.clone(), fromQ: entry.group.quaternion.clone(),
      fromScale: entry.group.scale.x, startDirection: entry.group.position.clone().sub(center).normalize(),
      start: now, duration: reduced ? 1 : 650};
  }

  closeShowcase(reduced = this.motionReduced) {
    this.requestId++;
    this.showcaseDataset = '';
    const now = performance.now();
    for (const entry of this.entries.values()) {
      if (entry.group.parent === this.scene) this.beginReturn(entry, now, reduced);
      else {entry.transition = null; entry.greeting = false; entry.travel = null;}
    }
    this.applyVisibility();
  }

  finishTransitions(now = performance.now()) {
    for (const entry of this.entries.values()) if (entry.transition) {
      entry.transition.start = now - entry.transition.duration;
      entry.transition.skipGreeting = true;
    }
    this.tick(now);
  }

  skip(now = performance.now()) {
    this.finishTransitions(now);
    for (const entry of this.entries.values()) {
      if (entry.travel) entry.group.position.copy(entry.travel.target);
      entry.travel = null;
      entry.greeting = false;
      entry.explicitMotion = false;
      entry.heading = 0;
      entry.actor.rotation.y = 0;
      entry.mixer?.stopAllAction();
      entry.currentClip = '';
      this.setAnimation(entry, 'idle', 0, true);
    }
  }

  sourceTransform(entry) {
    this.earthGroup.updateMatrixWorld(true);
    const position = this.earthGroup.localToWorld(entry.source.clone());
    const localCamera = this.earthGroup.worldToLocal(this.camera.position.clone());
    const localQ = surfaceQuaternion(entry.source.clone().normalize(), localCamera, entry.source);
    const earthQ = this.earthGroup.getWorldQuaternion(new THREE.Quaternion());
    return {position, quaternion: earthQ.multiply(localQ)};
  }

  canAnimate(entry) {
    if (!entry.group.visible || !entry.mixer || (this.motionReduced && !entry.explicitMotion) || this.suspended) return false;
    const point = entry.group.getWorldPosition(new THREE.Vector3());
    if (entry.group.parent === this.earthGroup) {
      const center = this.earthGroup.getWorldPosition(new THREE.Vector3());
      if (point.clone().sub(center).dot(this.camera.position.clone().sub(center)) < 0) return false;
    }
    point.y += entry.group.getWorldScale(new THREE.Vector3()).y;
    point.project(this.camera);
    return point.z >= -1 && point.z <= 1 && Math.abs(point.x) < 1.3 && Math.abs(point.y) < 1.4;
  }

  tickAnimation(entry, dt) {
    if (!this.canAnimate(entry)) return;
    const travel = entry.travel;
    if (travel) {
      travel.elapsed += dt;
      if (travel.phase === 'face' || travel.phase === 'settle') {
        const t = clamp(travel.elapsed / .22);
        const targetHeading = travel.phase === 'face' ? travel.heading : 0;
        entry.heading = THREE.MathUtils.lerp(travel.fromHeading, targetHeading, ease(t));
        entry.actor.rotation.y = entry.heading;
        if (t >= 1) {
          travel.elapsed = 0;
          if (travel.phase === 'face') {
            travel.phase = 'stride';
            this.setAnimation(entry, 'walk', .1, true);
          } else {
            entry.travel = null;
            if (travel.greeting) this.setAnimation(entry, 'wave', .12, true);
          }
        }
      } else {
        const t = clamp(travel.elapsed / travel.duration);
        // Walk is authored in place; only this outer transform supplies ground travel.
        entry.group.position.copy(travel.from).lerp(travel.target, t);
        if (t >= 1) {
          this.setAnimation(entry, 'idle', .12, true);
          if (Math.abs(entry.heading) > .1) {
            travel.phase = 'settle';
            travel.elapsed = 0;
            travel.fromHeading = entry.heading;
          } else {
            entry.travel = null;
            if (travel.greeting) this.setAnimation(entry, 'wave', .12, true);
          }
        }
      }
    }
    entry.mixer.update(dt);
    if (!entry.travel && entry.currentClip !== 'idle' && entry.action.time >= entry.action.getClip().duration) {
      this.setAnimation(entry, 'idle', .16, true);
    }
    if (!entry.travel && entry.currentClip === 'idle') {
      if (this.motionReduced && entry.explicitMotion) {
        entry.mixer.stopAllAction();
        entry.currentClip = '';
        this.setAnimation(entry, 'idle', 0, true);
      }
      entry.explicitMotion = false;
    }
  }

  tick(now) {
    if (this.disposed || this.suspended) return;
    const dt = this.lastTick ? Math.max(0, Math.min(.05, (now - this.lastTick) / 1000)) : 0;
    this.lastTick = now;
    for (const entry of this.entries.values()) {
      const motion = entry.transition;
      if (!motion) {
        if (entry.group.parent === this.earthGroup && entry.group.visible) {
          const cameraLocal = this.earthGroup.worldToLocal(this.camera.position.clone());
          entry.group.quaternion.copy(surfaceQuaternion(entry.source.clone().normalize(), cameraLocal, entry.source));
        }
        this.tickAnimation(entry, dt);
        continue;
      }
      if (motion.kind === 'enter' && !motion.initialized) {
        if (now < motion.start) {
          const cameraLocal = this.earthGroup.worldToLocal(this.camera.position.clone());
          entry.group.quaternion.copy(surfaceQuaternion(entry.source.clone().normalize(), cameraLocal, entry.source));
          this.tickAnimation(entry, dt);
          continue;
        }
        this.earthGroup.updateMatrixWorld(true);
        this.scene.attach(entry.group);
        motion.from = entry.group.position.clone();
        motion.fromQ = entry.group.quaternion.clone();
        motion.fromScale = entry.group.scale.x;
        motion.center = this.earthGroup.getWorldPosition(new THREE.Vector3());
        motion.sourceDirection = motion.from.clone().sub(motion.center).normalize();
        motion.walkOnArrival = Boolean(entry.model) && !this.motionReduced && !motion.skipGreeting;
        motion.flightTarget = motion.target.clone();
        if (motion.walkOnArrival) motion.flightTarget.z -= Number(entry.person.avatar?.groundTravel) || .7;
        motion.initialized = true;
      }
      const t = clamp((now - motion.start) / motion.duration);
      const e = ease(t);
      if (motion.kind === 'enter') {
        const radial = motion.center.clone().addScaledVector(motion.sourceDirection, 3.25);
        const frontDirection = new THREE.Vector3(motion.side * .82, .15, .54).normalize();
        const frontSide = motion.center.clone().addScaledVector(frontDirection, 3.25);
        if (e < .22) entry.group.position.copy(motion.from).lerp(radial, ease(e / .22));
        else if (e < .68) entry.group.position.copy(motion.center.clone().add(arcDirection(motion.sourceDirection,
          frontDirection, ease((e - .22) / .46)).multiplyScalar(3.25)));
        else entry.group.position.copy(frontSide).lerp(motion.flightTarget, ease((e - .68) / .32));
        entry.group.quaternion.copy(motion.fromQ).slerp(IDENTITY, e);
        entry.group.scale.setScalar(THREE.MathUtils.lerp(motion.fromScale, 1, e));
      } else {
        const source = this.sourceTransform(entry);
        const center = this.earthGroup.getWorldPosition(new THREE.Vector3());
        const sourceDirection = source.position.clone().sub(center).normalize();
        const startOuter = center.clone().addScaledVector(motion.startDirection, 3.25);
        const sourceOuter = center.clone().addScaledVector(sourceDirection, 3.25);
        if (e < .2) entry.group.position.copy(motion.from).lerp(startOuter, ease(e / .2));
        else if (e < .78) entry.group.position.copy(center).add(arcDirection(motion.startDirection,
          sourceDirection, ease((e - .2) / .58)).multiplyScalar(3.25));
        else entry.group.position.copy(sourceOuter).lerp(source.position, ease((e - .78) / .22));
        entry.group.quaternion.copy(motion.fromQ).slerp(source.quaternion, e);
        entry.group.scale.setScalar(THREE.MathUtils.lerp(motion.fromScale, OVERVIEW_CHARACTER_SCALE * this.earthGroup.scale.x, e));
      }
      if (t >= 1) {
        if (motion.kind === 'return') {
          this.earthGroup.attach(entry.group);
          entry.group.position.copy(entry.source);
          entry.group.scale.setScalar(OVERVIEW_CHARACTER_SCALE);
        } else if (motion.walkOnArrival && !motion.skipGreeting) this.beginWalk(entry, motion.target.clone(), true);
        else {
          entry.group.position.copy(motion.target);
          if (!this.motionReduced && !motion.skipGreeting) {
            if (entry.model) this.setAnimation(entry, 'wave', .12, true);
            else entry.greeting = true;
          }
        }
        entry.transition = null;
      }
      this.tickAnimation(entry, dt);
    }
  }

  pick(raycaster, earthHitDistance = Infinity) {
    const hits = raycaster.intersectObjects(this.hitMeshes.filter(mesh => {
      const entry = this.entries.get(mesh.userData.personKey);
      if (!entry?.group.visible) return false;
      for (let object = mesh; object; object = object.parent) if (!object.visible) return false;
      return true;
    }), false);
    const hit = hits.find(item => item.distance < earthHitDistance - .02);
    return hit ? this.entries.get(hit.object.userData.personKey)?.person || null : null;
  }

  disposeSource(gltf) {
    if (this.disposedSources.has(gltf)) return;
    this.disposedSources.add(gltf);
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    gltf.scene.traverse(child => {
      if (child.geometry) geometries.add(child.geometry);
      if (child.isSkinnedMesh) child.skeleton.dispose();
      for (const material of (Array.isArray(child.material) ? child.material : [child.material])) if (material) {
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.requestId++;
    clearTimeout(this.overviewTimer);
    for (const job of this.loadQueue.splice(0)) job.resolve(null);
    for (const entry of [...this.entries.values()]) this.removeEntry(entry);
    for (const promise of this.textureCache.values()) promise.then(texture => texture.dispose()).catch(() => {});
    for (const promise of this.modelCache.values()) promise.then(gltf => this.disposeSource(gltf)).catch(() => {});
    this.textureCache.clear();
    this.modelCache.clear();
    this.platformGeometry.dispose();
    this.platformMaterial.dispose();
    this.platformTopGeometry.dispose();
    this.platformTopMaterial.dispose();
    this.avatarGeometry.dispose();
    this.placeholderMaterial.dispose();
  }
}
