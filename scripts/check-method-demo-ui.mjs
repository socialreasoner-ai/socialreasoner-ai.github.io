import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const rootUrl = new URL('../', import.meta.url);
const source = readFileSync(new URL('method-demo.js', rootUrl), 'utf8');
const data = JSON.parse(readFileSync(new URL('assets/method-demo.json', rootUrl), 'utf8'));
const display = JSON.parse(readFileSync(new URL('assets/method-evidence-display.json', rootUrl), 'utf8'));
const localeWindow = { location: { search: '' } };
vm.runInNewContext(readFileSync(new URL('i18n.js', rootUrl), 'utf8'), { window: localeWindow, URLSearchParams, Intl });

class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.attributes = {};
    this.listeners = {}; this.hidden = false; this.disabled = false; this.open = false; this.value = '';
    this.className = '';
    this.classList = {
      add: name => { this.className += ` ${name}`; },
      remove: name => { this.className = this.className.split(' ').filter(item => item !== name).join(' '); }
    };
  }
  set textContent(value) { this.children = []; this.text = String(value ?? ''); }
  get textContent() { return (this.text || '') + this.children.map(child => child.textContent).join(''); }
  append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  replaceChildren(...nodes) { this.children = []; this.text = ''; this.append(...nodes); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  trigger(name) { this.listeners[name]?.({ target: this }); }
  querySelectorAll(selector) {
    const all = this.children.flatMap(child => [child, ...child.querySelectorAll('*')]);
    if (selector === '*') return all;
    if (selector === '.demo-evidence-original[open]') return all.filter(child => child.className.includes('demo-evidence-original') && child.open);
    return [];
  }
}

async function mount(input = data, motion = false, displayAvailable = true) {
  const ids = new Map();
  const root = new Element();
  for (const id of [...source.matchAll(/root\.querySelector\('#([^']+)'\)/g)].map(match => match[1])) {
    ids.set(id, new Element()); root.append(ids.get(id));
  }
  const models = ['ebm', 'lgbm', 'mlp'].map(id => {
    const node = new Element('button'); node.dataset.demoModel = id; node.textContent = id; return node;
  });
  const timeline = [];
  const stages = Array.from({ length: 4 }, () => {
    const node = new Element();
    node.animate = (frames, timing) => {
      let reject;
      const animation = { frames, timing, cancelled: false, finished: new Promise((_, fail) => { reject = fail; }),
        cancel() { this.cancelled = true; reject(new Error('cancelled')); } };
      timeline.push(animation); return animation;
    };
    return node;
  });
  root.querySelector = selector => selector === '.demo-flow-pulse' ? stages[3] : ids.get(selector.slice(1));
  const queryAll = root.querySelectorAll.bind(root);
  root.querySelectorAll = selector => selector === '[data-demo-model]' ? models : selector === '[data-demo-stage]' ? stages.slice(0, 3) : queryAll(selector);
  let lang = 'en';
  const events = {};
  const media = { matches: motion, addEventListener: (_, fn) => { media.change = fn; } };
  const errors = [];
  vm.runInNewContext(source, {
    document: { getElementById: () => root, createElement: tag => new Element(tag), createTextNode: text => { const node = new Element('#text'); node.textContent = text; return node; } },
    window: { matchMedia: () => media, SiteI18n: { t: (key, params = {}) => {
      let value = localeWindow.SOCIAL_I18N_MESSAGES[lang][key] || key;
      for (const [name, replacement] of Object.entries(params)) value = value.replaceAll(`{${name}}`, String(replacement));
      return value;
    } }, addEventListener: (name, fn) => { events[name] = fn; } },
    fetch: async url => ({ ok: !url.includes('evidence-display') || displayAvailable, status: 404,
      json: async () => structuredClone(url.includes('evidence-display') ? display : input) }),
    console: { error: (...args) => errors.push(args) }
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(errors.length, 0, 'Valid or missing-expert records load without errors.');
  return { ids, root, models, timeline, media, setLanguage(value) { lang = value; events['site:languagechange'](); } };
}

const ui = await mount();
const choose = (id, value) => { ui.ids.get(id).value = value; ui.ids.get(id).trigger('change'); };
assert.equal(ui.root.dataset.expert, 'ebm', 'Initially show the available EBM sample.');
assert.equal(ui.ids.get('demo-result').hidden, false);
let verified = 0;
let structuredCards = 0;
for (const dataset of data.datasets) {
  choose('demo-dataset', dataset.id);
  for (const profile of dataset.profiles) {
    choose('demo-profile', profile.id);
    for (const record of profile.records) {
      choose('demo-question', record.id);
      for (const button of ui.models) {
        button.trigger('click');
        const expert = record.experts[button.dataset.demoModel];
        assert.equal(ui.ids.get('demo-cot').textContent, expert.cot);
        assert.equal(ui.ids.get('demo-answer').textContent, `${expert.answerId} ${expert.answerLabel}`);
        for (const [id, retained] of [['demo-cues', true], ['demo-filtered-cue-list', false]]) {
          const expected = expert.cues.filter(cue => cue.retained === retained);
          const rows = ui.ids.get(id).children.filter(child => child.dataset.cueId);
          assert.deepEqual(rows.map(row => row.dataset.cueId), expected.map(cue => cue.id));
          rows.forEach((row, index) => {
            assert.equal(row.children.find(child => child.tagName === 'DETAILS').children.at(-1).textContent, expected[index].fact);
            const topic = row.children.find(child => child.className === 'demo-evidence-topic');
            if (topic) {
              const value = row.children.find(child => child.className === 'demo-evidence-value').textContent;
              assert.equal(record.perceptions.filter(item => item.question === topic.textContent && item.response === value).length, 1);
              assert.ok(display.entries.some(item => item.fact === expected[index].fact && item.question === topic.textContent && item.response === value));
              structuredCards++;
            }
          });
        }
        assert.deepEqual(ui.ids.get('demo-supplemental-evidence').children.map(row => row.textContent), expert.supplementalEvidence.map(item => item.fact));
        verified++;
      }
    }
  }
}
assert.equal(verified, 384);
assert.equal(structuredCards, 1406, 'Only exact source-backed structure appears in evidence cards.');
assert.ok(ui.timeline.slice(0, -4).every(animation => animation.cancelled), 'Rapid switches cancel every old animation.');
const chosen = ['demo-dataset', 'demo-profile', 'demo-question'].map(id => ui.ids.get(id).value).concat(ui.root.dataset.expert);
for (const language of ['zh', 'fr', 'de', 'ko', 'en']) {
  ui.setLanguage(language);
  assert.deepEqual(['demo-dataset', 'demo-profile', 'demo-question'].map(id => ui.ids.get(id).value).concat(ui.root.dataset.expert), chosen);
}
const sparse = structuredClone(data);
delete sparse.datasets[0].profiles[0].records[0].experts.ebm;
const fallback = await mount(sparse);
assert.equal(fallback.root.dataset.expert, 'lgbm');
assert.equal(fallback.models[0].disabled, true);
sparse.datasets[0].profiles[0].records[0].experts = {};
const empty = await mount(sparse);
assert.equal(empty.ids.get('demo-result').hidden, true);
assert.equal(empty.ids.get('demo-output-intro').hidden, false);
assert.ok(empty.models.every(button => button.disabled));
const reduced = await mount(data, true);
reduced.models[1].trigger('click');
assert.equal(reduced.timeline.length, 0);
assert.equal(reduced.root.dataset.expert, 'lgbm');
const unmapped = await mount(data, false, false);
assert.equal(unmapped.root.dataset.expert, 'ebm', 'Missing presentation lookup still displays the original sample.');
assert.ok(unmapped.ids.get('demo-cues').children.every(row => row.className.includes('demo-evidence-fallback')), JSON.stringify(unmapped.ids.get('demo-cues').children.map(row => ({className:row.className,text:row.textContent}))));
console.log(`Method UI passed: ${verified} exact reasoning/answer/evidence views, five-language selection preservation, available-expert fallback, empty state, rapid-switch cancellation, reduced motion and missing-display-data fallback.`);
