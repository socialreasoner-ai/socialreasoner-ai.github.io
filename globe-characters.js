import * as THREE from './assets/vendor/three/three.module.js';

const UP = new THREE.Vector3(0, 1, 0);
const IDENTITY = new THREE.Quaternion();
const ease = t => t * t * (3 - 2 * t);
const clamp = value => Math.max(0, Math.min(1, value));
const keyFor = person => `${person.datasetId}:${person.displayId}`;

// East-positive longitude follows the audited representative points. The
// sphere texture is rotated by -PI/2 to use this same convention.
export function geographicVector(lon, lat, radius = 1) {
  const lambda = THREE.MathUtils.degToRad(lon);
  const phi = THREE.MathUtils.degToRad(lat);
  return new THREE.Vector3(
    Math.sin(lambda) * Math.cos(phi),
    Math.sin(phi),
    Math.cos(lambda) * Math.cos(phi)
  ).multiplyScalar(radius);
}

function surfaceQuaternion(normal, cameraInEarth, position) {
  const face = cameraInEarth.clone().sub(position).addScaledVector(normal, -cameraInEarth.clone().sub(position).dot(normal));
  if (face.lengthSq() < 0.001) face.set(0, 0, 1).addScaledVector(normal, -normal.z);
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
  constructor({scene, earthGroup, camera, regionFor, onPersonSelect, onResourceError}) {
    this.scene = scene;
    this.earthGroup = earthGroup;
    this.camera = camera;
    this.regionFor = regionFor;
    this.onPersonSelect = onPersonSelect;
    this.onResourceError = onResourceError;
    this.entries = new Map();
    this.textureCache = new Map();
    this.selectedDataset = 'all';
    this.showcaseDataset = '';
    this.activePersonId = '';
    this.motionReduced = false;
    this.disposed = false;
    this.requestId = 0;
    this.hitMeshes = [];
    this.platformGeometry = new THREE.CylinderGeometry(.46, .52, .075, 24);
    this.platformMaterial = new THREE.MeshStandardMaterial({color: 0x275472, metalness: .12, roughness: .76});
    this.platformTopGeometry = new THREE.CircleGeometry(.445, 24);
    this.platformTopMaterial = new THREE.MeshStandardMaterial({color: 0x4d9db6, emissive: 0x164457, emissiveIntensity: .35, roughness: .72});
    this.avatarGeometry = new THREE.PlaneGeometry(1.38, 2.16);
    this.placeholderMaterial = new THREE.MeshBasicMaterial({color: 0xa2c8dc, transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false});
  }

  setParticipants(people) {
    if (this.disposed) return;
    const wanted = new Set();
    for (const person of people || []) {
      const region = this.regionFor(person.regionId);
      if (!region || !Number.isFinite(region.lon) || !Number.isFinite(region.lat)) continue;
      const key = keyFor(person);
      wanted.add(key);
      if (this.entries.has(key)) continue;
      const group = new THREE.Group();
      group.name = key;
      const platform = new THREE.Mesh(this.platformGeometry, this.platformMaterial.clone());
      platform.position.y = -.045;
      group.add(platform);
      const top = new THREE.Mesh(this.platformTopGeometry, this.platformTopMaterial.clone());
      top.rotation.x = -Math.PI / 2;
      top.position.y = .003;
      group.add(top);
      const poster = new THREE.Mesh(this.avatarGeometry, this.placeholderMaterial.clone());
      poster.position.y = 1.1;
      poster.material.alphaTest = .08;
      poster.userData.personKey = key;
      group.add(poster);
      const index = [...this.entries.values()].filter(entry => entry.person.regionId === person.regionId).length;
      const offsetAngle = index * 2.399963;
      const offsetRadius = Math.min(.18, .06 * Math.sqrt(index));
      const center = geographicVector(region.lon, region.lat, 1);
      const tangent = new THREE.Vector3().crossVectors(UP, center).normalize();
      if (tangent.lengthSq() < .001) tangent.set(1, 0, 0);
      const bitangent = new THREE.Vector3().crossVectors(center, tangent).normalize();
      const displaced = center.clone().addScaledVector(tangent, Math.cos(offsetAngle) * offsetRadius)
        .addScaledVector(bitangent, Math.sin(offsetAngle) * offsetRadius).normalize().multiplyScalar(2.025);
      const entry = {key, person, group, poster, top, platform, source: displaced, transition: null, targetScale: .22};
      this.entries.set(key, entry);
      this.earthGroup.add(group);
      group.position.copy(displaced);
      group.scale.setScalar(.22);
      this.hitMeshes.push(poster);
      this.loadPoster(entry);
    }
    for (const [key, entry] of this.entries) if (!wanted.has(key)) this.removeEntry(entry);
    this.applyVisibility();
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

  removeEntry(entry) {
    entry.group.removeFromParent();
    entry.poster.material.dispose();
    entry.platform.material.dispose();
    entry.top.material.dispose();
    this.entries.delete(entry.key);
    this.hitMeshes = this.hitMeshes.filter(mesh => mesh !== entry.poster);
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
    if (people.length) this.setParticipants([...this.entries.values().map(entry => entry.person), ...people]);
    if (this.showcaseDataset === dataset && !this.entries.size) return;
    this.requestId++;
    this.motionReduced = reduced;
    const now = performance.now();
    for (const entry of this.entries.values()) {
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
      const side = i === 0 ? -1 : 1;
      const target = new THREE.Vector3(side * 1.43, -1.55, 2.35);
      entry.transition = {kind: 'enter', target, side, initialized: false,
        start: now + (reduced || entry.group.parent === this.scene ? 0 : 420 + i * 110),
        duration: reduced ? 1 : 1050};
    });
    this.applyVisibility();
  }

  beginReturn(entry, now = performance.now(), reduced = this.motionReduced) {
    if (entry.group.parent === this.earthGroup && !entry.transition) return;
    if (entry.group.parent !== this.scene) this.scene.attach(entry.group);
    const center = this.earthGroup.getWorldPosition(new THREE.Vector3());
    entry.transition = {kind: 'return', from: entry.group.position.clone(), fromQ: entry.group.quaternion.clone(),
      fromScale: entry.group.scale.x,
      startDirection: entry.group.position.clone().sub(center).normalize(),
      start: now, duration: reduced ? 1 : 650};
  }

  closeShowcase(reduced = this.motionReduced) {
    this.requestId++;
    this.showcaseDataset = '';
    const now = performance.now();
    for (const entry of this.entries.values()) {
      if (entry.group.parent === this.scene) this.beginReturn(entry, now, reduced);
      else entry.transition = null;
    }
    this.applyVisibility();
  }

  skip(now = performance.now()) {
    for (const entry of this.entries.values()) if (entry.transition) {
      entry.transition.start = now - entry.transition.duration;
    }
    this.tick(now);
  }

  sourceTransform(entry) {
    this.earthGroup.updateMatrixWorld(true);
    const position = this.earthGroup.localToWorld(entry.source.clone());
    const localCamera = this.earthGroup.worldToLocal(this.camera.position.clone());
    const localQ = surfaceQuaternion(entry.source.clone().normalize(), localCamera, entry.source);
    const earthQ = this.earthGroup.getWorldQuaternion(new THREE.Quaternion());
    return {position, quaternion: earthQ.multiply(localQ)};
  }

  tick(now) {
    if (this.disposed) return;
    for (const entry of this.entries.values()) {
      const motion = entry.transition;
      if (!motion) {
        if (entry.group.parent === this.earthGroup && entry.group.visible) {
          const cameraLocal = this.earthGroup.worldToLocal(this.camera.position.clone());
          entry.group.quaternion.copy(surfaceQuaternion(entry.source.clone().normalize(), cameraLocal, entry.source));
        }
        continue;
      }
      if (motion.kind === 'enter' && !motion.initialized) {
        if (now < motion.start) {
          const cameraLocal = this.earthGroup.worldToLocal(this.camera.position.clone());
          entry.group.quaternion.copy(surfaceQuaternion(entry.source.clone().normalize(), cameraLocal, entry.source));
          continue;
        }
        this.earthGroup.updateMatrixWorld(true);
        this.scene.attach(entry.group);
        motion.from = entry.group.position.clone();
        motion.fromQ = entry.group.quaternion.clone();
        motion.fromScale = entry.group.scale.x;
        motion.center = this.earthGroup.getWorldPosition(new THREE.Vector3());
        motion.sourceDirection = motion.from.clone().sub(motion.center).normalize();
        motion.initialized = true;
      }
      const t = clamp((now - motion.start) / motion.duration);
      const e = ease(t);
      if (motion.kind === 'enter') {
        // Escape radially, travel outside the planet, then arrive on the near stage.
        const radial = motion.center.clone().addScaledVector(motion.sourceDirection, 3.25);
        const frontDirection = new THREE.Vector3(motion.side * .82, .15, .54).normalize();
        const frontSide = motion.center.clone().addScaledVector(frontDirection, 3.25);
        if (e < .22) entry.group.position.copy(motion.from).lerp(radial, ease(e / .22));
        else if (e < .68) entry.group.position.copy(
          motion.center.clone().add(arcDirection(motion.sourceDirection, frontDirection,
            ease((e - .22) / .46)).multiplyScalar(3.25)));
        else entry.group.position.copy(frontSide).lerp(motion.target, ease((e - .68) / .32));
        entry.group.quaternion.copy(motion.fromQ).slerp(IDENTITY, e);
        entry.group.scale.setScalar(THREE.MathUtils.lerp(motion.fromScale, 1, e));
      } else {
        const source = this.sourceTransform(entry);
        const center = this.earthGroup.getWorldPosition(new THREE.Vector3());
        const sourceDirection = source.position.clone().sub(center).normalize();
        const startOuter = center.clone().addScaledVector(motion.startDirection, 3.25);
        const sourceOuter = center.clone().addScaledVector(sourceDirection, 3.25);
        if (e < .2) entry.group.position.copy(motion.from).lerp(startOuter, ease(e / .2));
        else if (e < .78) entry.group.position.copy(center).add(
          arcDirection(motion.startDirection, sourceDirection, ease((e - .2) / .58)).multiplyScalar(3.25));
        else entry.group.position.copy(sourceOuter).lerp(source.position, ease((e - .78) / .22));
        entry.group.quaternion.copy(motion.fromQ).slerp(source.quaternion, e);
        entry.group.scale.setScalar(THREE.MathUtils.lerp(motion.fromScale, .22 * this.earthGroup.scale.x, e));
      }
      if (t >= 1) {
        if (motion.kind === 'return') {
          this.earthGroup.attach(entry.group);
          entry.group.position.copy(entry.source);
          entry.group.scale.setScalar(.22);
        }
        entry.transition = null;
      }
    }
  }

  pick(raycaster, earthHitDistance = Infinity) {
    const hits = raycaster.intersectObjects(this.hitMeshes.filter(mesh => mesh.parent?.visible), false);
    const hit = hits.find(item => item.distance < earthHitDistance - .02);
    if (!hit) return null;
    const entry = this.entries.get(hit.object.userData.personKey);
    return entry?.group.visible ? entry.person : null;
  }

  dispose() {
    this.disposed = true;
    this.requestId++;
    for (const entry of [...this.entries.values()]) this.removeEntry(entry);
    for (const promise of this.textureCache.values()) promise.then(texture => texture.dispose()).catch(() => {});
    this.textureCache.clear();
    this.platformGeometry.dispose();
    this.platformMaterial.dispose();
    this.platformTopGeometry.dispose();
    this.platformTopMaterial.dispose();
    this.avatarGeometry.dispose();
    this.placeholderMaterial.dispose();
  }
}
