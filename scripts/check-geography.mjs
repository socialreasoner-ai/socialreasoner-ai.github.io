// Integration checks for the actual globe renderer, using its published aggregate index.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const d3 = require('../assets/vendor/d3.min.js');
const topojson = require('../assets/vendor/topojson-client.min.js');
const data = JSON.parse(fs.readFileSync(root + 'assets/geography.json', 'utf8'));
const sum = values => values.reduce((a, b) => a + b, 0);
assert.equal(sum(data.regions.map(r => r.count)), data.totalRespondents);
assert.equal(sum(data.datasets.map(d => d.respondents)), data.totalRespondents);
assert.equal(sum(data.datasets.map(d => d.responses)), data.totalResponses);
assert.equal(data.totalRespondents, 281995);
assert.equal(data.paperRespondents, 281995);
assert.equal(data.totalResponses, 8725666);
assert.equal(data.paperResponses, 8725666);
assert.equal(data.totalRegions, 56);
assert.equal(data.regions.length, data.totalRegions);
assert.equal(data.versionNoteKey, 'manuscriptVersionNote');
assert.ok(data.versionNote?.trim(), 'Aggregate index retains manuscript provenance');
const manuscriptDatasetTotals = {
  ISSP2015: { respondents: 45096, responses: 682115 },
  ISSP2016: { respondents: 43439, responses: 1501834 },
  ISSP2019: { respondents: 40245, responses: 1044243 },
  ISSP2021: { respondents: 37899, responses: 841611 }
};
for (const [id, expected] of Object.entries(manuscriptDatasetTotals)) {
  const dataset = data.datasets.find(d => d.id === id);
  assert.ok(dataset, `${id}: dataset exists`);
  assert.equal(dataset.respondents, expected.respondents, `${id}: respondent total`);
  assert.equal(dataset.responses, expected.responses, `${id}: response total`);
}
const correctedRegionCounts = {
  ISSP2015: { CHL: 1215, FRA: 1057, SWE: 1098 },
  ISSP2016: { SUR: 794, ZAF: 2693, JPN: 1475 },
  ISSP2019: { CHE: 2866, ITA: 1088, JPN: 1373, AUS: 969, SUR: 772, USA: 1796 },
  ISSP2021: { JPN: 1289, NLD: 1228 }
};
for (const dataset of data.datasets) {
  assert.equal(sum(data.regions.map(r => r.byDataset[dataset.id] || 0)), dataset.respondents);
  assert.equal(sum(dataset.regions.map(r => r.count)), dataset.respondents);
  for (const region of dataset.regions) {
    assert.equal(region.count, data.regions.find(r => r.id === region.id)?.byDataset[dataset.id],
      `${dataset.id}/${region.id}: dataset and geographic counts agree`);
  }
  for (const [id, count] of Object.entries(correctedRegionCounts[dataset.id] || {})) {
    assert.equal(dataset.regions.find(r => r.id === id)?.count, count, `${dataset.id}/${id}: manuscript count`);
    assert.equal(data.regions.find(r => r.id === id)?.byDataset[dataset.id], count,
      `${dataset.id}/${id}: geographic manuscript count`);
  }
}
for (const region of data.regions) {
  assert.equal(sum(Object.values(region.byDataset)), region.count, `${region.id}: cross-dataset total`);
}
assert.equal(data.regions.find(r => r.id === 'TWN').label, 'Taiwan, China');
assert.equal(data.regions.find(r => r.id === 'CHN').highlightGroup, 'CHN');
assert.equal(data.regions.find(r => r.id === 'TWN').highlightGroup, 'CHN');

// Lightweight DOM and Canvas harness for the production globe controller.
const fills = [], strokes = [];
const context = new Proxy({
  geometry: null,
  beginPath() { this.geometry = null; },
  fill() { fills.push({ id: this.geometry, color: this.fillStyle }); },
  stroke() { strokes.push({ id: this.geometry, color: this.strokeStyle }); },
  measureText(text) { return { width: String(text).length * 7 }; },
  createRadialGradient() { return { addColorStop() {} }; },
  createLinearGradient() { return { addColorStop() {} }; }
}, { get(target, key) { return key in target ? target[key] : () => {}; } });
let documentMock;
class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.value = ''; this._text = ''; this.hidden = false;
    this.style = { setProperty(name, value) { this[name] = value; }, removeProperty(name) { delete this[name]; } };
    this.dataset = {}; this.children = []; this.events = {}; this.attributes = {}; this.className = '';
    this.classList = {
      add: (...names) => { this.className = [...new Set([...this.className.split(' ').filter(Boolean), ...names])].join(' '); },
      remove: (...names) => { this.className = this.className.split(' ').filter(n => !names.includes(n)).join(' '); },
      contains: name => this.className.split(' ').includes(name),
      toggle: (name, force) => { const on = force ?? !this.classList.contains(name); this.classList[on ? 'add' : 'remove'](name); return on; }
    };
  }
  get textContent() { return this._text + this.children.map(c => c.textContent || '').join(''); }
  set textContent(value) { this._text = String(value); this.children = []; }
  set innerHTML(value) { this.textContent = value; }
  addEventListener(name, fn) { this.events[name] = fn; }
  removeEventListener(name) { delete this.events[name]; }
  setAttribute(name, value) { this.attributes[name] = String(value); if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, x) => x.toUpperCase())] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }
  append(...items) { for (let item of items) { if (typeof item === 'string') { const text = new Element('span'); text.textContent = item; item = text; } item.parentElement = this; this.children.push(item); } }
  appendChild(item) { this.append(item); return item; }
  replaceChildren(...items) { this._text = ''; this.children = []; this.append(...items); }
  after() {}
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(x => x !== this); }
  focus() { documentMock.activeElement = this; }
  contains(node) { return this === node || this.children.some(c => c.contains?.(node)); }
  querySelectorAll(selector) {
    const found = [];
    const match = node => selector[0] === '.' ? node.classList.contains(selector.slice(1))
      : selector[0] === '[' ? node.getAttribute(selector.slice(1, -1).split('=')[0]) !== null
      : node.tagName.toLowerCase() === selector;
    const visit = node => { for (const child of node.children) { if (match(child)) found.push(child); visit(child); } };
    visit(this); return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  getBoundingClientRect() { return { width: 640, height: 520, left: 0, top: 0, right: 640, bottom: 520 }; }
  getContext() { return context; }
  setPointerCapture() {}
  releasePointerCapture() {}
  scrollIntoView() {}
}
const elements = new Map();
const absent = new Set(['#coverage-method', '#coverage-audit', '#coverage-audit-short', '.coverage-details']);
const element = selector => {
  if (!elements.has(selector)) {
    const n = new Element(selector.includes('select') || ['#hero-dataset','#coverage-dataset','#coverage-region'].includes(selector) ? 'select' : 'div');
    if (selector.startsWith('.')) n.className = selector.slice(1);
    elements.set(selector, n);
  }
  return elements.get(selector);
};
let language = 'en', now = 0, nextFrame = 1;
const events = {}, documentEvents = {}, frames = new Map(), intersections = [];
const publicEvents = [], fetches = [];
const media = { matches: true, addEventListener(name, fn) { this[name] = fn; }, removeEventListener() {} };
documentMock = {
  querySelector: selector => absent.has(selector) ? null : element(selector),
  querySelectorAll: selector => [...elements.values()].filter(n => n.classList.contains(selector.slice(1))),
  createElement: tag => new Element(tag), hidden: false, activeElement: null,
  addEventListener(name, fn) { documentEvents[name] = fn; }, removeEventListener() {}
};
const sandbox = {
  console, Intl, d3, topojson, AbortController, DOMException, URL, URLSearchParams, setTimeout, clearTimeout,
  CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
  performance: { now: () => now }, document: documentMock,
  requestAnimationFrame(fn) { const id = nextFrame++; frames.set(id, fn); return id; },
  cancelAnimationFrame(id) { frames.delete(id); },
  ResizeObserver: class { observe() {} disconnect() {} },
  IntersectionObserver: class { constructor(fn) { intersections.push(fn); } observe() {} disconnect() {} },
  window: { d3, topojson, devicePixelRatio: 1, matchMedia: () => media,
    addEventListener(name, fn) { events[name] = fn; }, removeEventListener() {},
    dispatchEvent(event) { publicEvents.push(event); events[event.type]?.(event); } },
  fetch: async url => { fetches.push(String(url)); return { ok: true, json: async () => JSON.parse(fs.readFileSync(root + String(url).split('?')[0], 'utf8')) }; }
};
sandbox.window.ResizeObserver = sandbox.ResizeObserver;
sandbox.window.IntersectionObserver = sandbox.IntersectionObserver;
sandbox.window.SiteI18n = {
  get language() { return language; },
  number(value, options) { return new Intl.NumberFormat(language, options).format(value); },
  t(key, params = {}) {
    const value = sandbox.window.SOCIAL_GLOBE_MESSAGES?.[language]?.[key.replace(/^globe\./, '')] || key;
    return value.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match);
  }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(root + 'globe-locales.js', 'utf8'), sandbox);
let source = fs.readFileSync(root + 'coverage-state.js', 'utf8').replace(/^export /gm, '');
vm.runInContext(source, sandbox);
source = fs.readFileSync(root + 'globe-renderer-2d.js', 'utf8').replace(/^export /gm, '');
source = source.replace('return { ready, state, setPaused',
  'return { debug: { state, selectRegion, syncDataset, findRegion, findRegions, draw, countFor, sampleFor, markerRadius, resetView, clearSelection, toggleRotation }, ready, state, setPaused');
vm.runInContext(source, sandbox);
vm.runInContext(`window.__coverageStore = createCoverageState();
  window.__globeRenderer = createGlobeRenderer2d({ canvas: document.querySelector('#globe-canvas'),
    host: document.querySelector('.globe-hero'), store: window.__coverageStore,
    onHeroDataset: id => window.__coverageStore.openDatasetShowcase(id) });`, sandbox);
await sandbox.window.__globeRenderer.ready;
const api = sandbox.window.__globeRenderer.debug;
const store = sandbox.window.__coverageStore;
assert.ok(api.state.data, 'Globe data initialized');
assert.notEqual(element('#globe-region-name').textContent, 'Coverage unavailable', 'Complete controller initialization');
api.state.path = feature => { context.geometry = feature.id == null ? null : Number(feature.id); };
const colors = () => Object.fromEntries(fills.filter(f => f.id != null).map(f => [f.id, f.color]));
const draw = () => { fills.length = 0; strokes.length = 0; api.draw(); return colors(); };
const us = api.state.regionById.get('USA'), fr = api.state.regionById.get('FRA'), chn = api.state.regionById.get('CHN'), twn = api.state.regionById.get('TWN');
const optionIds = selector => element(selector).children.map(option => option.value).filter(Boolean).sort();
const assertRegionOptions = datasetId => {
  const regions = datasetId === 'all' ? data.regions : data.datasets.find(item => item.id === datasetId).regions;
  const expected = regions.filter(region => region.count > 0).map(region => region.id).sort();
  for (const selector of ['#coverage-region', '#globe-region-select']) {
    assert.deepEqual(optionIds(selector), expected, `${datasetId}: ${selector} contains exactly surveyed regions`);
  }
};
assertRegionOptions('all');
for (const dataset of data.datasets) {
  api.syncDataset(dataset.id);
  assertRegionOptions(dataset.id);
}
api.syncDataset('all');
assertRegionOptions('all');
api.selectRegion('USA'); api.syncDataset('ATP142');
assert.equal(api.state.selected.id, 'USA');
assert.equal(api.countFor(us), 9851);
assert.equal(element('#hero-dataset').value, 'ATP142');
assert.equal(element('#coverage-dataset').value, 'ATP142');
assert.equal(element('#coverage-region').value, 'USA');
assert.ok(element('#globe-region-count').textContent.includes('9,851'));
const radius = api.markerRadius(9851);
api.syncDataset('all'); assert.equal(api.markerRadius(9851), radius, 'Marker radius is comparable across datasets');
assert.ok(api.markerRadius(20000) > api.markerRadius(2000));
api.selectRegion('FRA');
const beforeUncoveredSwitch = publicEvents.length;
api.syncDataset('ATP142');
assert.equal(publicEvents.length, beforeUncoveredSwitch + 1, 'Changing dataset and clearing its unsupported region emits one event');
assert.equal(publicEvents.at(-1).detail.dataset, 'ATP142');
assert.equal(publicEvents.at(-1).detail.selectedRegion, '');
assert.equal(api.state.selected, null, 'Dataset switch clears a region without respondents');
assert.equal(element('#coverage-region').value, '');
assert.equal(element('#globe-region-select').value, '');
assert.deepEqual(optionIds('#coverage-region'), ['USA'], 'ATP142 offers only the United States');
assert.deepEqual(optionIds('#globe-region-select'), ['USA'], 'ATP142 hero offers only the United States');
const beforeRejectedRegion = publicEvents.length;
assert.equal(store.setRegion('FRA'), false, 'A zero-sample region cannot be selected');
assert.equal(publicEvents.length, beforeRejectedRegion, 'Rejected region selection emits no event');
assert.equal(api.countFor(fr), 0);
assert.equal(api.sampleFor(fr).status, 'none', 'Zero sample remains explicit in the data');
api.selectRegion('USA');
api.syncDataset('ATP152'); assert.equal(api.state.selected.id, 'USA', 'Covered region survives dataset changes');
assert.equal(api.countFor(fr), 0);
api.resetView(); assert.equal(api.state.dataset, 'ATP152', 'Reset view preserves dataset');
api.clearSelection(); assert.equal(api.state.selected, null); assert.equal(api.state.dataset, 'ATP152');
api.syncDataset('ISSP2016'); api.selectRegion('TWN');
assert.equal(api.countFor(chn), 0); assert.equal(api.countFor(twn), 1878);
let c = draw();
assert.notEqual(c[156], c[158], 'Zero mainland sample is not given covered Taiwan fill');
assert.ok(strokes.some(x => x.id === 156) && strokes.some(x => x.id === 158), 'Linked region geometry remains outlined');
assert.equal(store.setRegion('CHN'), false, 'Linked highlighting does not make an uncovered region selectable');
assert.equal(api.state.selected.id, 'TWN');
api.syncDataset('ATP142'); assert.equal(api.state.selected, null);
assert.equal(api.countFor(chn), 0);
const original = us.byDataset.ATP142;
us.byDataset.ATP142 = null;
assert.equal(api.countFor(us), null, 'Explicit unknown is not coerced to zero');
assert.equal(store.setRegion('USA'), false, 'Unknown sample cannot be selected');
us.byDataset.ATP142 = original + 1;
assert.equal(api.countFor(us), null, 'Conflicting indices are not silently normalized');
us.byDataset.ATP142 = original;
api.selectRegion('USA');
for (const lang of ['zh', 'fr', 'de', 'ko', 'en']) {
  language = lang; events['site:languagechange']({ detail: { language: lang } });
  assert.equal(api.state.dataset, 'ATP142'); assert.equal(api.state.selected.id, 'USA');
  assert.equal(element('#hero-dataset').value, 'ATP142');
  assert.equal(element('#globe-region-select').value, 'USA');
  assertRegionOptions('ATP142');
}
// Visibility and the user's pause choice are independent states.
media.matches = false; media.change?.();
api.toggleRotation();
assert.equal(api.state.spinning, true);
documentMock.hidden = true; documentEvents.visibilitychange?.();
assert.equal(frames.size, 0, 'Hidden document cancels animation frames');
assert.equal(api.state.spinning, true, 'Hiding does not override user rotation choice');
documentMock.hidden = false; documentEvents.visibilitychange?.();
assert.ok(frames.size > 0, 'Visible document resumes requested rotation');
api.toggleRotation(); assert.equal(api.state.spinning, false);
documentMock.hidden = true; documentEvents.visibilitychange?.();
documentMock.hidden = false; documentEvents.visibilitychange?.();
assert.equal(api.state.spinning, false, 'User pause survives a visibility round trip');
media.matches = true; media.change?.();
assert.equal(api.state.spinning, false);
api.syncDataset('all');
api.selectRegion('FRA');
assert.deepEqual([...api.state.rotation], [-fr.lon, -fr.lat, 0], 'Reduced motion focuses immediately');
// Dense regions return a stable candidate list rather than a random point.
api.syncDataset('all'); api.selectRegion('BEL'); api.draw();
let center = api.state.projection([api.state.selected.lon, api.state.selected.lat]);
const hitEvent = { clientX: center[0], clientY: center[1], pointerType: 'touch', pointerId: 1, button: 0 };
const candidates = api.findRegions(hitEvent);
assert.ok(candidates.length > 1 && candidates.some(x => x.id === 'BEL'), 'Dense Europe offers disambiguation');
assert.deepEqual(api.findRegions(hitEvent).map(x => x.id), candidates.map(x => x.id));
assert.ok(candidates.every(x => d3.geoDistance([x.lon,x.lat], [-api.state.rotation[0],-api.state.rotation[1]]) < Math.PI/2), 'No back-hemisphere marker hits');
const canvas = element('#globe-canvas');
const beforeTouchScroll = [...api.state.rotation];
canvas.events.pointerdown(hitEvent);
canvas.events.pointermove({ ...hitEvent, clientY: hitEvent.clientY + 80 });
canvas.events.pointercancel(hitEvent);
assert.deepEqual([...api.state.rotation], beforeTouchScroll, 'Default touch scrolling does not rotate');
assert.equal(api.state.down, null, 'Pointer cancellation cannot select a region');
element('#globe-control-interaction').events.click({});
canvas.events.pointerdown(hitEvent);
canvas.events.pointermove({ ...hitEvent, clientX: hitEvent.clientX + 45, clientY: hitEvent.clientY + 25 });
canvas.events.pointerup({ ...hitEvent, clientX: hitEvent.clientX + 45, clientY: hitEvent.clientY + 25 });
assert.notDeepEqual([...api.state.rotation], beforeTouchScroll, 'Explicit touch mode rotates');
assert.equal(api.state.spinning, false);
element('#globe-control-interaction').events.click({});
media.matches = false; media.change?.(); api.selectRegion('USA');
assert.ok(api.state.flight, 'Normal focus creates a finite flight');
canvas.events.pointerdown({ ...hitEvent, pointerType: 'mouse' });
assert.equal(api.state.flight, null, 'Dragging interrupts automatic focus immediately');
canvas.events.pointercancel(hitEvent);
api.selectRegion('FRA'); api.clearSelection();
assert.equal(api.state.flight, null, 'Clear selection also cancels its pending flight');
api.selectRegion('BEL'); media.matches = true; media.change?.(); api.selectRegion('BEL');
center = api.state.projection([api.state.selected.lon,api.state.selected.lat]);
media.matches = false; media.change?.(); api.toggleRotation();
const overlapEvent = { ...hitEvent, clientX:center[0],clientY:center[1] };
canvas.events.pointerdown(overlapEvent); canvas.events.pointerup(overlapEvent);
assert.equal(element('#globe-overlap-picker').hidden, false);
assert.equal(api.state.spinning, false);
assert.equal(element('#globe-control-rotation').getAttribute('aria-pressed'), 'false', 'Touch overlap selection updates rotation control');
const beforeAtomic = publicEvents.length;
assert.equal(store.setSelection({ dataset: 'ATP152', selectedRegion: '' }, 'showcase'), true);
assert.equal(publicEvents.length, beforeAtomic + 1, 'Atomic showcase selection emits one public event');
assert.equal(publicEvents.at(-1).detail.dataset, 'ATP152');
assert.equal(publicEvents.at(-1).detail.selectedRegion, '');
assert.equal(store.setSelection({ dataset: 'ATP152', selectedRegion: '' }, 'showcase'), false);
assert.equal(publicEvents.length, beforeAtomic + 1, 'No-op selection emits nothing');
store.setDataset('all'); store.setRegion('FRA'); store.setDataset('ISSP2019');
assert.equal(store.getSelection().selectedRegion, 'FRA', 'Public dataset setter preserves region');
assert.equal(store.getGeographyPromise(), store.getGeographyPromise(), 'Data shares one geography promise');
assert.equal(fetches.filter(url => url.includes('geography.json')).length, 1, 'Geography fetched once');
const geometryFailureStore = vm.runInContext(`createCoverageState({ fetcher: url =>
  String(url).includes('world-110m') ? Promise.reject(new Error('geometry failed')) : fetch(url) })`, sandbox);
await geometryFailureStore.load();
await assert.rejects(geometryFailureStore.getWorldPromise(), /geometry failed/);
assert.equal(geometryFailureStore.getSelection().ready, true, 'Geography remains ready when world geometry fails');
sandbox.window.__globeRenderer.dispose();
sandbox.window.__nullCanvas = new Element('canvas');
sandbox.window.__nullCanvas.getContext = () => null;
vm.runInContext(`window.__dataOnlyRenderer = createGlobeRenderer2d({
  canvas: window.__nullCanvas, host: document.querySelector('.globe-hero'), store: window.__coverageStore });`, sandbox);
await sandbox.window.__dataOnlyRenderer.ready;
assert.ok(sandbox.window.__dataOnlyRenderer.state.data, 'Coverage UI loads without a 2D canvas');
assert.ok(element('#coverage-total').textContent.includes('40,245'), 'Counts remain readable without a 2D canvas');
sandbox.window.__dataOnlyRenderer.dispose();
const beforeDispose = publicEvents.length;
store.dispose();
assert.equal(store.setSelection({ dataset: 'all', selectedRegion: '' }), false, 'Disposed state rejects updates');
assert.equal(publicEvents.length, beforeDispose, 'Disposed state emits no selection event');
console.log('PASS: picking, touch-mode controller and interruptible focus; preserved aggregates; shared filters; zero/unknown semantics; independent counts with linked outlines; fixed marker scale; language state; rotation lifecycle.');
