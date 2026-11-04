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
for (const dataset of data.datasets) {
  assert.equal(sum(data.regions.map(r => r.byDataset[dataset.id] || 0)), dataset.respondents);
}
assert.equal(data.regions.find(r => r.id === 'TWN').label, 'Taiwan, China');
assert.equal(data.regions.find(r => r.id === 'CHN').highlightGroup, 'CHN');
assert.equal(data.regions.find(r => r.id === 'TWN').highlightGroup, 'CHN');

const fills = [];
const context = new Proxy({
  geometry: null,
  beginPath() { this.geometry = null; },
  fill() { fills.push({ id: this.geometry, color: this.fillStyle }); },
  createRadialGradient() { return { addColorStop() {} }; },
  createLinearGradient() { return { addColorStop() {} }; }
}, { get(target, key) { return key in target ? target[key] : () => {}; } });
class Element {
  constructor() { this.value = ''; this.textContent = ''; this.innerHTML = ''; this.hidden = false; this.style = {}; this.children = []; this.events = {}; this.classList = { add() {}, remove() {} }; }
  addEventListener(name, fn) { this.events[name] = fn; }
  setAttribute() {}
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  getBoundingClientRect() { return { width: 640, height: 640, left: 0, top: 0 }; }
  getContext() { return context; }
  setPointerCapture() {}
}
const elements = new Map();
const element = selector => { if (!elements.has(selector)) elements.set(selector, new Element()); return elements.get(selector); };
let language = 'en';
const events = {};
const sandbox = {
  console, Intl, d3, topojson,
  document: { querySelector: element, createElement: () => new Element(), hidden: false },
  requestAnimationFrame() {},
  ResizeObserver: class { observe() {} },
  window: { d3, topojson, devicePixelRatio: 1, matchMedia: () => ({ matches: true }), addEventListener(name, fn) { events[name] = fn; } },
  fetch: async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(root + url.split('?')[0], 'utf8')) })
};
sandbox.window.SiteI18n = {
  get language() { return language; },
  number(value, options) { return new Intl.NumberFormat(language, options).format(value); },
  t(key, params = {}) {
    const value = sandbox.window.SOCIAL_GLOBE_MESSAGES?.[language]?.[key.replace(/^globe\./, '')] || key;
    return value.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match);
  }
};
vm.createContext(sandbox);
if (fs.existsSync(root + 'globe-locales.js')) vm.runInContext(fs.readFileSync(root + 'globe-locales.js', 'utf8'), sandbox);
let source = fs.readFileSync(root + 'globe.js', 'utf8');
source = source.replace(/\}\)\(\);\s*$/, 'window.__globeTest = { state, selectRegion, syncDataset, findRegion, draw, countFor }; })();');
vm.runInContext(source, sandbox);
await new Promise(resolve => setImmediate(resolve));
const api = sandbox.window.__globeTest;
assert.ok(api.state.data, 'Globe data initialized');
api.state.path = feature => { context.geometry = feature.id == null ? null : Number(feature.id); };
const colors = () => Object.fromEntries(fills.filter(f => f.id != null).map(f => [f.id, f.color]));
const draw = () => { fills.length = 0; api.draw(); return colors(); };

for (const id of ['CHN', 'TWN']) {
  api.selectRegion(id);
  const c = draw();
  assert.equal(c[156], '#e3b48f', `${id}: mainland selected`);
  assert.equal(c[158], '#e3b48f', `${id}: Taiwan selected`);
  assert.equal(fills.filter(f => f.color === '#ffd9b8').length, 2, 'Both sampled markers selected');
}
api.selectRegion('');
for (const id of ['CHN', 'TWN']) {
  api.state.hovered = api.state.regionById.get(id);
  const c = draw();
  assert.equal(c[156], '#9bdfff'); assert.equal(c[158], '#9bdfff');
}
api.state.hovered = null;
api.syncDataset('ISSP2016');
api.selectRegion('TWN');
assert.equal(api.countFor(api.state.regionById.get('CHN')), 0);
assert.equal(api.countFor(api.state.regionById.get('TWN')), 1878);
let c = draw();
assert.equal(c[156], '#e3b48f'); assert.equal(c[158], '#e3b48f');
assert.equal(fills.filter(f => f.color === '#ffd9b8').length, 1, 'No invented zero-count marker');
const mainland = api.state.regionById.get('CHN');
const point = api.state.projection([mainland.lon, mainland.lat]);
assert.equal(api.findRegion({ clientX: point[0], clientY: point[1] })?.id, 'CHN', 'Linked mainland remains clickable');
api.selectRegion('CHN');
assert.equal(api.countFor(api.state.selected), 0, 'Map linkage does not copy counts');
api.syncDataset('ISSP2019');
assert.equal(api.state.selected.id, 'CHN', 'Preserve selection when linked samples remain');
api.syncDataset('ATP142');
assert.equal(api.state.selected, null, 'Clear selection when entire group has no samples');
api.selectRegion('');
c = draw();
assert.equal(c[156], c[158], 'Linked base shading matches');
assert.equal(c[156], '#1b3452', 'No samples means no coverage shade');
api.syncDataset('all');
api.selectRegion('TWN');
const translatedNames = { zh: '中国台湾', fr: 'Taïwan, Chine', de: 'Taiwan, China', ko: '중국 대만', en: 'Taiwan, China' };
assert.equal(typeof events['site:languagechange'], 'function', 'Globe listens for language changes');
for (const lang of ['zh', 'fr', 'de', 'ko', 'en']) {
  language = lang;
  events['site:languagechange']({ detail: { language: lang } });
  assert.equal(api.state.dataset, 'all'); assert.equal(api.state.selected.id, 'TWN');
  assert.equal(element('#globe-region-name').textContent, translatedNames[lang], `${lang}: selected region is translated`);
  assert.equal(element('#coverage-region').value, 'TWN', `${lang}: selector retains the selected region`);
  c = draw(); assert.equal(c[156], '#e3b48f'); assert.equal(c[158], '#e3b48f');
}
api.syncDataset('ISSP2016');
api.selectRegion('CHN');
const rotation = [...api.state.rotation];
for (const lang of ['zh', 'fr', 'de', 'ko', 'en']) {
  language = lang;
  events['site:languagechange']({ detail: { language: lang } });
  assert.equal(api.state.dataset, 'ISSP2016');
  assert.equal(api.state.selected.id, 'CHN');
  assert.equal(api.state.spinning, false);
  assert.deepEqual([...api.state.rotation], rotation);
  assert.equal(element('#hero-dataset').value, 'ISSP2016');
  assert.equal(element('#coverage-dataset').value, 'ISSP2016');
  assert.equal(element('#globe-region-name').textContent, sandbox.window.SOCIAL_REGION_NAMES[lang].CHN);
  assert.equal(element('#globe-region-count').textContent, sandbox.window.SiteI18n.t('globe.respondentCount', { count: '0' }));
  assert.ok(!element('#coverage-audit').textContent.includes('{'), 'Audit interpolation is complete');
  c = draw(); assert.equal(c[156], '#e3b48f'); assert.equal(c[158], '#e3b48f');
}
console.log('PASS: aggregate totals; China mainland/Taiwan linked fill, markers, hover, zero-sample hit testing, filters, and language-state preservation.');
