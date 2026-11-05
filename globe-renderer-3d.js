import * as THREE from './assets/vendor/three/three.module.js';
import { GlobeCharacters, geographicVector } from './globe-characters.js?v=20261105-glb-r1';

const RADIUS = 2;
const DEFAULT_YAW = THREE.MathUtils.degToRad(-20);
const DEFAULT_PITCH = THREE.MathUtils.degToRad(15);
const ease = t => t * t * (3 - 2 * t);
const clamp = value => Math.max(0, Math.min(1, value));
const nearestYaw = (target, current) => current + Math.atan2(Math.sin(target - current), Math.cos(target - current));
const numericKey = value => String(Number(value));
const validCount = value => Number.isInteger(value) && value >= 0;
const groupOf = region => region?.highlightGroup || region?.id;

export function vectorToGeographic(point) {
  const unit = point.clone().normalize();
  return [THREE.MathUtils.radToDeg(Math.atan2(unit.x, unit.z)),
    THREE.MathUtils.radToDeg(Math.asin(clampSigned(unit.y)))];
}
export function centerRotationFor(lon, lat) {
  return {yaw: -THREE.MathUtils.degToRad(lon), pitch: THREE.MathUtils.degToRad(lat)};
}
const clampSigned = value => Math.max(-1, Math.min(1, value));

function makeAtmosphere() {
  return new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 1.055, 48, 32), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {glow: {value: new THREE.Color('#70c8ff')}},
    vertexShader: `varying vec3 vNormal; varying vec3 vView;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0);
      vNormal = normalize(normalMatrix * normal); vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 glow; varying vec3 vNormal; varying vec3 vView;
      void main(){ float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 3.5);
      gl_FragColor = vec4(glow, rim * .24); }`
  }));
}

function makeStars(scene) {
  const positions = [];
  let seed = 87211;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 180; i++) {
    const theta = random() * 2 * Math.PI;
    const radial = 12 + random() * 8;
    positions.push(Math.cos(theta) * radial, (random() - .5) * 13, -12 - random() * 16);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({color: 0x9ec7ed, size: .035, transparent: true, opacity: .62,
    sizeAttenuation: true, depthWrite: false});
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  return points;
}

function buildMapTexture(THREERef, countries, store, selection, regionByNumeric, selectedRegion, quality) {
  const width = quality === 'mobile' ? 1024 : 2048;
  const height = width / 2;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', {alpha: false});
  if (!ctx) throw new Error('Earth texture canvas unavailable');
  const ocean = ctx.createLinearGradient(0, 0, 0, height);
  ocean.addColorStop(0, '#102743');
  ocean.addColorStop(.52, '#0a1a31');
  ocean.addColorStop(1, '#07162a');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);
  const projection = window.d3.geoEquirectangular().translate([width / 2, height / 2])
    .scale(width / (2 * Math.PI)).precision(.45);
  const path = window.d3.geoPath(projection, ctx);
  ctx.strokeStyle = '#92c3ee19';
  ctx.lineWidth = 1;
  ctx.beginPath();
  path(window.d3.geoGraticule10());
  ctx.stroke();
  const maxCount = Math.max(1, ...store.getData().regions.map(r => validCount(r.count) ? r.count : 0));
  for (const country of countries) {
    const region = regionByNumeric.get(numericKey(country.id));
    // The atlas polygon contains Northern Ireland; survey GBR means Great Britain.
    const fillRegion = region?.id === 'GBR' ? null : region;
    const sample = fillRegion ? store.sampleFor(fillRegion, selection.dataset) : {status: 'unmapped', count: null};
    const selected = fillRegion && selectedRegion && groupOf(fillRegion) === groupOf(selectedRegion);
    ctx.beginPath();
    path(country);
    if (selected && sample.status === 'covered') ctx.fillStyle = '#97d9ed';
    else if (sample.status === 'covered') {
      const strength = Math.sqrt(sample.count / maxCount);
      const light = 29 + Math.round(strength * 20);
      ctx.fillStyle = `hsl(204 45% ${light}%)`;
    } else if (sample.status === 'unknown') ctx.fillStyle = '#33475c';
    else if (sample.status === 'none') ctx.fillStyle = '#20354c';
    else ctx.fillStyle = '#182b40';
    ctx.fill();
    ctx.strokeStyle = selected ? '#a9edff' : sample.status === 'unknown' ? '#a7b7c7' : '#6695b980';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.setLineDash(sample.status === 'unknown' ? [3, 4] : []);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const texture = new THREERef.CanvasTexture(canvas);
  texture.colorSpace = THREERef.SRGBColorSpace;
  texture.anisotropy = 2;
  texture.wrapS = THREERef.RepeatWrapping;
  texture.minFilter = THREERef.LinearMipmapLinearFilter;
  return texture;
}

export async function createGlobeRenderer({canvas, host, store, onRegionSelect, onPersonSelect, onSceneChange, onFailure}) {
  if (!canvas || !host || !store) throw new Error('Incomplete globe renderer host');
  if (!window.d3 || !window.topojson) throw new Error('Map geometry libraries unavailable');
  const topology = await store.getWorldPromise();
  if (!topology?.objects?.countries) throw new Error('World geometry unavailable');
  const countries = window.topojson.feature(topology, topology.objects.countries).features;
  const regionByNumeric = new Map(store.getData().regions.filter(r => r.numericId)
    .map(r => [numericKey(r.numericId), r]));
  let webgl;
  try {
    webgl = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true, powerPreference: 'high-performance'});
  } catch (error) {
    throw new Error(`WebGL initialization failed: ${error.message}`);
  }
  webgl.outputColorSpace = THREE.SRGBColorSpace;
  webgl.toneMapping = THREE.ACESFilmicToneMapping;
  webgl.toneMappingExposure = 1.4;
  webgl.setClearColor(0x030712, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 80);
  camera.position.set(0, .2, 8.5);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xc4dfff, 1.25));
  const sunlight = new THREE.DirectionalLight(0xe4f3ff, 2.2);
  sunlight.position.set(-4, 4, 7);
  scene.add(sunlight);
  const softRim = new THREE.DirectionalLight(0x5078d8, .65);
  softRim.position.set(5, -2, -5);
  scene.add(softRim);
  const earthGroup = new THREE.Group();
  earthGroup.rotation.set(DEFAULT_PITCH, DEFAULT_YAW, 0);
  scene.add(earthGroup);
  const sphereGeometry = new THREE.SphereGeometry(RADIUS, 80, 48);
  const sphereMaterial = new THREE.MeshStandardMaterial({color: 0xffffff, metalness: .02, roughness: .93});
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  // The quarter turn aligns the standard east-positive equirectangular map
  // with geographicVector's +Z meridian; east remains screen-right.
  sphere.rotation.y = -Math.PI / 2;
  earthGroup.add(sphere);
  earthGroup.add(makeAtmosphere());
  const stars = makeStars(scene);
  const markerGeometry = new THREE.SphereGeometry(.022, 8, 6);
  const markerMaterial = new THREE.MeshBasicMaterial({color: 0xa5eaff});
  const selectedMarkerMaterial = new THREE.MeshBasicMaterial({color: 0xffdbaf});
  const markers = new Map();
  for (const region of store.getData().regions) {
    if (!Number.isFinite(region.lon) || !Number.isFinite(region.lat)) continue;
    const mesh = new THREE.Mesh(markerGeometry, markerMaterial);
    mesh.position.copy(geographicVector(region.lon, region.lat, RADIUS + .03));
    mesh.userData.regionId = region.id;
    earthGroup.add(mesh);
    markers.set(region.id, mesh);
  }
  const tooltip = document.createElement('div');
  tooltip.className = 'globe-person-tooltip';
  tooltip.hidden = true;
  tooltip.setAttribute('role', 'status');
  host.append(tooltip);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const forceReduced = new URLSearchParams(window.location.search).get('motion') === 'reduce';
  const motionReduced = () => reduceMotion.matches || forceReduced;
  const characters = new GlobeCharacters({scene, earthGroup, camera,
    regionFor: id => store.getRegion(id), onPersonSelect,
    onResourceError: detail => {
      console.warn('Character resource unavailable', detail.type, detail.path, detail.error);
      host.dispatchEvent(new CustomEvent('social:postererror', {detail}));
    },
    onStatusChange: detail => {
      host.dispatchEvent(new CustomEvent('avatar:statuschange', {detail}));
      start();
    }});
  characters.setMotionReduced(motionReduced());
  let selection = store.getSelection();
  let selectedRegion = store.getRegion(selection.selectedRegion);
  let texture = null;
  let quality = 'desktop';
  let mode = 'overview';
  let raf = 0;
  let visible = true;
  let userPaused = false;
  let touchRotate = false;
  let disposed = false;
  let lastTime = 0;
  let frameAverage = 0;
  let frameCount = 0;
  let lastTextureKey = '';
  let earthMotion = null;
  let queuedEarthMotion = null;
  let sceneDeadline = 0;
  let manualDrag = null;
  const aborter = new AbortController();
  const on = (target, event, fn, options = {}) => target.addEventListener(event, fn,
    {...options, signal: aborter.signal});
  const emitMode = next => {
    if (mode === next) return;
    mode = next;
    host.dataset.scene = mode;
    onSceneChange?.(mode);
  };

  function updateTexture() {
    const nextQuality = host.clientWidth < 600 ? 'mobile' : 'desktop';
    const key = `${selection.dataset}|${selection.selectedRegion}|${nextQuality}`;
    if (key === lastTextureKey) return;
    const next = buildMapTexture(THREE, countries, store, selection, regionByNumeric, selectedRegion, nextQuality);
    sphereMaterial.map = next;
    sphereMaterial.needsUpdate = true;
    texture?.dispose();
    texture = next;
    lastTextureKey = key;
    quality = nextQuality;
    updateMarkers();
  }

  function updateMarkers() {
    for (const [id, marker] of markers) {
      const region = store.getRegion(id);
      const sample = store.sampleFor(region, selection.dataset);
      marker.visible = sample.status === 'covered' || id === selection.selectedRegion;
      marker.material = id === selection.selectedRegion ? selectedMarkerMaterial : markerMaterial;
      marker.scale.setScalar(id === selection.selectedRegion ? 1.65 : 1);
    }
  }

  function motionTo({yaw, pitch, scale = 1, position = new THREE.Vector3()}, duration = 900) {
    const now = performance.now();
    earthMotion = {start: now, duration: motionReduced() ? 1 : duration,
      fromYaw: earthGroup.rotation.y, fromPitch: earthGroup.rotation.x,
      fromScale: earthGroup.scale.x, fromPosition: earthGroup.position.clone(),
      toYaw: yaw, toPitch: pitch, toScale: scale, toPosition: position};
    start();
  }

  function focus(region, duration = 800) {
    if (!region) return;
    const yaw = nearestYaw(centerRotationFor(region.lon, region.lat).yaw, earthGroup.rotation.y);
    motionTo({yaw, pitch: centerRotationFor(region.lon, region.lat).pitch,
      scale: mode === 'reading' || mode === 'entering' ? .63 : 1,
      position: mode === 'reading' || mode === 'entering' ? new THREE.Vector3(0, .25, -1.25) : new THREE.Vector3()}, duration);
  }

  function resize() {
    if (disposed) return;
    const width = Math.max(1, Math.round(canvas.clientWidth || host.clientWidth));
    const height = Math.max(1, Math.round(canvas.clientHeight || host.clientHeight));
    const mobile = width < 620;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
    webgl.setPixelRatio(dpr);
    webgl.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = mobile ? 47 : 40;
    camera.position.z = mobile ? 10.2 : 8.5;
    camera.updateProjectionMatrix();
    updateTexture();
    start();
  }

  function finishExpiredScene(now) {
    if (!sceneDeadline || now < sceneDeadline) return;
    const target = queuedEarthMotion?.target || (earthMotion && {
      yaw: earthMotion.toYaw, pitch: earthMotion.toPitch,
      scale: earthMotion.toScale, position: earthMotion.toPosition
    });
    if (target) {
      earthGroup.rotation.y = target.yaw;
      earthGroup.rotation.x = target.pitch;
      earthGroup.scale.setScalar(target.scale);
      earthGroup.position.copy(target.position);
      earthGroup.updateMatrixWorld(true);
    }
    queuedEarthMotion = null;
    earthMotion = null;
    characters.finishTransitions(now);
    sceneDeadline = 0;
    emitMode(mode === 'exiting' ? 'overview' : 'reading');
  }

  function frame(time) {
    raf = 0;
    if (disposed || document.hidden || !visible) {lastTime = 0; return;}
    const dt = lastTime ? Math.min(50, time - lastTime) : 16;
    lastTime = time;
    host.dataset.frameCount = String(++frameCount);
    frameAverage = frameAverage ? frameAverage * .92 + dt * .08 : dt;
    host.dataset.frameMs = frameAverage.toFixed(1);
    finishExpiredScene(time);
    if (earthMotion) {
      const t = clamp((time - earthMotion.start) / earthMotion.duration);
      const e = ease(t);
      earthGroup.rotation.y = THREE.MathUtils.lerp(earthMotion.fromYaw, earthMotion.toYaw, e);
      earthGroup.rotation.x = THREE.MathUtils.lerp(earthMotion.fromPitch, earthMotion.toPitch, e);
      earthGroup.scale.setScalar(THREE.MathUtils.lerp(earthMotion.fromScale, earthMotion.toScale, e));
      earthGroup.position.copy(earthMotion.fromPosition).lerp(earthMotion.toPosition, e);
      if (t >= 1) {
        earthMotion = null;
        if (queuedEarthMotion) {
          const queued = queuedEarthMotion;
          queuedEarthMotion = null;
          motionTo(queued.target, queued.duration);
        }
      }
    } else if (!motionReduced() && !userPaused && !manualDrag && mode === 'overview' && !selection.selectedRegion) {
      earthGroup.rotation.y += dt * .000035;
    }
    earthGroup.updateMatrixWorld(true);
    characters.tick(time);
    const renderStart = performance.now();
    webgl.render(scene, camera);
    host.dataset.renderMs = (performance.now() - renderStart).toFixed(1);
    start();
  }

  function start() {
    if (!raf && !disposed && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function setSelection(next, {intent = 'coverage'} = {}) {
    if (disposed || !next) return;
    selection = {dataset: next.dataset || 'all', selectedRegion: next.selectedRegion || ''};
    selectedRegion = selection.selectedRegion ? store.getRegion(selection.selectedRegion) : null;
    if (intent !== 'showcase') queuedEarthMotion = null;
    if (intent !== 'showcase' && mode !== 'overview' && mode !== 'exiting') closeShowcase();
    characters.setSelection(selection.dataset, selection.selectedRegion);
    updateTexture();
    if (selectedRegion) focus(selectedRegion);
    else if (selection.dataset === 'all' && mode === 'overview') motionTo({yaw: nearestYaw(DEFAULT_YAW, earthGroup.rotation.y), pitch: DEFAULT_PITCH,
      position: new THREE.Vector3()}, 650);
    start();
  }

  function setParticipants(people) {
    characters.setParticipants(people);
    start();
  }

  function setShowcase(dataset, people = []) {
    if (disposed || !dataset || dataset === 'all') return;
    if (mode === 'reading' && characters.showcaseDataset === dataset &&
      (!people.length || people.every(person => {
        const entry = characters.entries.get(`${person.datasetId}:${person.displayId}`);
        return entry?.group.parent === scene;
      }))) return;
    const firstRegion = store.getRegion(people[0]?.regionId);
    emitMode('focusing');
    if (firstRegion) focus(firstRegion, 500);
    characters.setSelection(dataset, '');
    characters.setShowcase(dataset, people, motionReduced());
    emitMode('entering');
    const readingTarget = {yaw: firstRegion ? nearestYaw(centerRotationFor(firstRegion.lon, firstRegion.lat).yaw,
      earthGroup.rotation.y) : earthGroup.rotation.y,
      pitch: firstRegion ? centerRotationFor(firstRegion.lon, firstRegion.lat).pitch : earthGroup.rotation.x,
      scale: .63, position: new THREE.Vector3(0, .25, -1.25)};
    if (firstRegion && !motionReduced()) queuedEarthMotion = {target: readingTarget, duration: 1050};
    else motionTo(readingTarget, 1050);
    sceneDeadline = performance.now() + (motionReduced() ? 1 : 2600);
    start();
  }

  function closeShowcase() {
    if (disposed) return;
    sceneDeadline = 0;
    queuedEarthMotion = null;
    characters.closeShowcase(motionReduced());
    emitMode('exiting');
    motionTo({yaw: earthGroup.rotation.y, pitch: earthGroup.rotation.x,
      scale: 1, position: new THREE.Vector3()}, 650);
    sceneDeadline = performance.now() + (motionReduced() ? 1 : 700);
    start();
  }

  function skip() {
    const now = performance.now();
    if (queuedEarthMotion) {
      const target = queuedEarthMotion.target;
      queuedEarthMotion = null;
      motionTo(target, 1);
    }
    if (earthMotion) earthMotion.start = now - earthMotion.duration;
    characters.skip(now);
    if (sceneDeadline) {sceneDeadline = 0; emitMode(mode === 'exiting' ? 'overview' : 'reading');}
    start();
  }

  function resetView() {
    userPaused = true;
    queuedEarthMotion = null;
    motionTo({yaw: nearestYaw(DEFAULT_YAW, earthGroup.rotation.y), pitch: DEFAULT_PITCH,
      scale: mode === 'reading' ? .63 : 1,
      position: mode === 'reading' ? new THREE.Vector3(0, .25, -1.25) : new THREE.Vector3()}, 550);
  }

  function toggleRotation() {
    if (motionReduced()) return false;
    userPaused = !userPaused;
    if (!userPaused) earthMotion = null;
    start();
    return !userPaused;
  }

  function setTouchRotate(value) {
    touchRotate = Boolean(value);
    canvas.style.touchAction = touchRotate ? 'none' : 'pan-y';
  }

  function setPaused(value) {
    userPaused = Boolean(value);
    start();
  }

  function pointerRay(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  }

  function pick(event) {
    pointerRay(event);
    const earthHit = raycaster.intersectObject(sphere, false)[0];
    const person = characters.pick(raycaster, earthHit?.distance ?? Infinity);
    if (person) return {person};
    if (!earthHit) return null;
    const local = earthGroup.worldToLocal(earthHit.point.clone());
    const lonLat = vectorToGeographic(local);
    const country = countries.find(feature => window.d3.geoContains(feature, lonLat));
    if (!country) return null;
    const region = regionByNumeric.get(numericKey(country.id));
    return region?.id === 'GBR' ? null : region ? {region} : null;
  }

  function showTooltip(event, person) {
    if (!person) {tooltip.hidden = true; return;}
    tooltip.textContent = `${person.datasetId} · ${person.displayId}`;
    const rect = host.getBoundingClientRect();
    tooltip.style.left = `${Math.max(8, Math.min(rect.width - 170, event.clientX - rect.left + 12))}px`;
    tooltip.style.top = `${Math.max(8, event.clientY - rect.top - 30)}px`;
    tooltip.hidden = false;
  }

  on(canvas, 'pointerdown', event => {
    if (event.button != null && event.button !== 0) return;
    if (event.pointerType === 'touch' && !touchRotate) return;
    manualDrag = {id: event.pointerId, x: event.clientX, y: event.clientY, yaw: earthGroup.rotation.y,
      pitch: earthGroup.rotation.x, moved: false};
    earthMotion = null;
    queuedEarthMotion = null;
    canvas.setPointerCapture?.(event.pointerId);
  });
  on(canvas, 'pointermove', event => {
    if (manualDrag?.id === event.pointerId) {
      const dx = event.clientX - manualDrag.x;
      const dy = event.clientY - manualDrag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) manualDrag.moved = true;
      if (manualDrag.moved) {
        userPaused = true;
        earthGroup.rotation.y = manualDrag.yaw + dx * .005;
        earthGroup.rotation.x = Math.max(-1.2, Math.min(1.2, manualDrag.pitch + dy * .005));
        tooltip.hidden = true;
      }
      return;
    }
    if (event.pointerType === 'touch') return;
    const hit = pick(event);
    canvas.style.cursor = hit ? 'pointer' : 'grab';
    showTooltip(event, hit?.person);
  });
  on(canvas, 'pointerup', event => {
    const moved = manualDrag?.id === event.pointerId && manualDrag.moved;
    manualDrag = null;
    if (moved) {
      if (mode === 'entering' || mode === 'reading') motionTo({yaw: earthGroup.rotation.y,
        pitch: earthGroup.rotation.x, scale: .63, position: new THREE.Vector3(0, .25, -1.25)}, 450);
      return;
    }
    const hit = pick(event);
    if (hit?.person) onPersonSelect?.(hit.person.displayId, hit.person);
    else if (hit?.region) onRegionSelect?.(hit.region.id);
  });
  on(canvas, 'pointercancel', () => {manualDrag = null;});
  on(canvas, 'pointerleave', () => {tooltip.hidden = true;});
  on(document, 'visibilitychange', () => {
    lastTime = 0;
    characters.setSuspended(document.hidden || !visible);
    if (!document.hidden) finishExpiredScene(performance.now());
    start();
  });
  on(reduceMotion, 'change', () => {
    characters.setMotionReduced(motionReduced());
    if (motionReduced()) skip();
    start();
  });
  on(canvas, 'webglcontextlost', event => {
    event.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
    onFailure?.(new Error('WebGL context lost'));
  });
  let observer = null;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? true;
      characters.setSuspended(document.hidden || !visible);
      if (!visible) {cancelAnimationFrame(raf); raf = 0; lastTime = 0;}
      else {finishExpiredScene(performance.now()); start();}
    }, {threshold: .01});
    observer.observe(host);
  }
  let sizeObserver = null;
  if ('ResizeObserver' in window) {
    sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(host);
  } else on(window, 'resize', resize);
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.touchAction = 'pan-y';
  canvas.style.display = 'block';
  host.dataset.renderer = '3d';
  host.dataset.scene = mode;
  updateTexture();
  resize();
  start();

  return {
    setSelection, setParticipants, setShowcase, closeShowcase, skip, resetView,
    toggleRotation, setTouchRotate, setPaused, resize,
    setActivePerson: id => characters.setActivePerson(id),
    playAction: (name, displayId) => {
      const played = characters.playAction(name, displayId);
      if (played) start();
      return played;
    },
    getCharacterStatus: displayId => characters.getCharacterStatus(displayId),
    getDebug: () => ({mode, frameAverageMs: frameAverage, quality, selectedDataset: selection.dataset,
      selectedRegion: selection.selectedRegion, people: characters.entries.size,
      readyModels: [...characters.entries.values()].filter(entry => entry.modelStatus === 'ready').length,
      loadingModels: [...characters.entries.values()].filter(entry => entry.modelStatus === 'loading').length,
      activeActions: [...characters.entries.values()].filter(entry => entry.group.visible && entry.model)
        .map(entry => ({displayId: entry.person.displayId, action: entry.currentClip,
          traveling: Boolean(entry.travel), status: entry.modelStatus}))}),
    dispose() {
      if (disposed) return;
      disposed = true;
      aborter.abort();
      observer?.disconnect();
      sizeObserver?.disconnect();
      cancelAnimationFrame(raf);
      characters.dispose();
      texture?.dispose();
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      for (const child of earthGroup.children) if (child !== sphere) {
        child.geometry?.dispose?.();
        child.material?.dispose?.();
      }
      markerGeometry.dispose();
      markerMaterial.dispose();
      selectedMarkerMaterial.dispose();
      stars.geometry.dispose();
      stars.material.dispose();
      tooltip.remove();
      webgl.dispose();
      delete host.dataset.renderer;
      delete host.dataset.frameMs;
      delete host.dataset.renderMs;
      delete host.dataset.frameCount;
    }
  };
}
