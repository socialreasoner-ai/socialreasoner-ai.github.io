import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const rootUrl = new URL('../', import.meta.url);
const source = readFileSync(new URL('method-demo.js', rootUrl), 'utf8');
const html = readFileSync(new URL('index.html', rootUrl), 'utf8');
const data = JSON.parse(readFileSync(new URL('assets/method-demo.json', rootUrl), 'utf8'));
const localeWindow = { location: { search: '' } };
vm.runInNewContext(readFileSync(new URL('i18n.js', rootUrl), 'utf8'),
  { window: localeWindow, URLSearchParams, Intl });
const messages = localeWindow.SOCIAL_I18N_MESSAGES;
const languages = ['en', 'zh', 'fr', 'de', 'ko'];
const displayed = (lang, english, chinese) => lang === 'zh' && chinese ? chinese : english;
const tagsById = new Map([...html.matchAll(/<([a-z][\w-]*)\b[^>]*\bid="([^"]+)"[^>]*>/gi)]
  .map(([, tag, id]) => [id, tag]));
for (const [, id] of source.matchAll(/root\.querySelector\('#([^']+)'\)/g)) {
  assert.ok(tagsById.has(id), `Method script queries missing HTML element #${id}.`);
}
for (const id of ['demo-profile', 'demo-question', 'demo-model-controls', 'demo-filtered-cues',
  'demo-supplemental', 'demo-output-intro']) {
  assert.ok(!tagsById.has(id), `Retired Method control #${id} is still in the page.`);
}
assert.deepEqual([...html.matchAll(/<select\b[^>]*\bid="(demo-[^"]+)"/g)].map(match => match[1]),
  ['demo-dataset'], 'The Method section has one survey selector.');
for (const id of ['demo-question-text', 'demo-options', 'demo-cot', 'demo-answer']) {
  assert.equal([...html.matchAll(new RegExp(`id="${id}"`, 'g'))].length, 1,
    `The Method section renders #${id} once.`);
}

class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = []; this.dataset = {}; this.attributes = {}; this.listeners = {};
    this.hidden = false; this.disabled = false; this.open = false; this.value = '';
    this.className = '';
    this.classList = {
      add: name => { this.className += ` ${name}`; },
      remove: name => { this.className = this.className.split(' ').filter(item => item !== name).join(' '); }
    };
  }
  set textContent(value) { this.children = []; this.text = String(value ?? ''); }
  get textContent() { return (this.text || '') + this.children.map(child => child.textContent).join(''); }
  get childElementCount() { return this.children.filter(child => child.tagName !== '#TEXT').length; }
  append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  replaceChildren(...nodes) { this.children = []; this.text = ''; this.append(...nodes); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  trigger(name) { this.listeners[name]?.({ target: this }); }
  querySelectorAll(selector) {
    const all = this.children.flatMap(child => [child, ...child.querySelectorAll('*')]);
    if (selector === '*') return all;
    if (selector === '.demo-evidence-original[open]') {
      return all.filter(child => child.className.includes('demo-evidence-original') && child.open);
    }
    return [];
  }
}

async function mount(input = data, reduceMotion = false) {
  const ids = new Map();
  const root = new Element();
  for (const id of [...source.matchAll(/root\.querySelector\('#([^']+)'\)/g)].map(match => match[1])) {
    const element = new Element(tagsById.get(id));
    ids.set(id, element);
    root.append(element);
  }
  const timeline = [];
  const stages = [...html.matchAll(/data-demo-stage="[^"]+"/g)].map(() => {
    const stage = new Element();
    stage.animate = (frames, timing) => {
      let reject;
      const animation = { frames, timing, cancelled: false,
        finished: new Promise((_, fail) => { reject = fail; }),
        cancel() { this.cancelled = true; reject(new Error('cancelled')); } };
      timeline.push(animation);
      return animation;
    };
    return stage;
  });
  root.querySelector = selector => ids.get(selector.slice(1));
  const queryAll = root.querySelectorAll.bind(root);
  root.querySelectorAll = selector => selector === '[data-demo-stage]' ? stages : queryAll(selector);
  let language = 'en';
  const events = {};
  const errors = [];
  const media = { matches: reduceMotion, addEventListener: (_, fn) => { media.change = fn; } };
  const context = {
    document: { getElementById: id => id === 'method-demo' ? root : null,
      createElement: tag => new Element(tag),
      createTextNode: text => { const node = new Element('#text'); node.textContent = text; return node; } },
    window: { matchMedia: () => media,
      SiteI18n: { get language() { return language; }, t: (key, params = {}) => {
        let value = messages[language]?.[key] || key;
        for (const [name, replacement] of Object.entries(params)) {
          value = value.replaceAll(`{${name}}`, String(replacement));
        }
        return value;
      } },
      addEventListener: (name, fn) => { events[name] = fn; } },
    fetch: async () => ({ ok: true, json: async () => structuredClone(input) }),
    console: { error: (...args) => errors.push(args) }
  };
  vm.runInNewContext(source, context);
  await new Promise(resolve => setImmediate(resolve));
  return { ids, root, timeline, errors, media, setLanguage(value) {
    language = value;
    events['site:languagechange']();
  } };
}

const ui = await mount();
assert.equal(ui.errors.length, 0, 'Eight complete cases load without errors.');
assert.deepEqual(ui.ids.get('demo-dataset').children.map(option => [option.value, option.textContent]),
  data.datasets.map(dataset => [dataset.id, dataset.label]));
assert.equal(ui.ids.get('demo-dataset').disabled, false);
assert.equal(ui.ids.get('demo-content').hidden, false);
const choose = (view, id) => { view.ids.get('demo-dataset').value = id; view.ids.get('demo-dataset').trigger('change'); };

let views = 0;
for (const dataset of data.datasets) {
  choose(ui, dataset.id);
  const entry = dataset.case;
  assert.equal(ui.ids.get('demo-result').hidden, false);
  assert.equal(ui.ids.get('demo-perceptions').children.length, Math.min(4, entry.perceptions.length));
  assert.equal(ui.ids.get('demo-more-perceptions').children.length, Math.max(0, entry.perceptions.length - 4));
  for (const lang of languages) {
    ui.setLanguage(lang);
    assert.equal(ui.ids.get('demo-dataset').value, dataset.id,
      'Language changes preserve the selected dataset.');
    assert.equal(ui.ids.get('demo-question-text').textContent,
      displayed(lang, entry.question, entry.questionZh));
    assert.equal(ui.ids.get('demo-cot').textContent, displayed(lang, entry.cot, entry.cotZh));
    assert.equal(ui.ids.get('demo-answer').textContent,
      `${entry.answerId} ${displayed(lang, entry.answer, entry.answerZh)}`);
    assert.deepEqual(ui.ids.get('demo-options').children.map(option => option.textContent),
      Object.entries(entry.options).map(([number, label]) =>
        `${number} · ${displayed(lang, label, entry.optionsZh?.[number])}`));
    const rows = ui.ids.get('demo-cues').children;
    assert.equal(rows.length, entry.cues.length);
    rows.forEach((row, index) => {
      const cue = entry.cues[index];
      assert.equal(row.dataset.cueId, `cue-${index + 1}`);
      assert.equal(row.children.find(child => child.className === 'demo-evidence-topic')?.textContent,
        displayed(lang, cue.question, cue.questionZh));
      assert.equal(row.children.find(child => child.className === 'demo-evidence-value')?.textContent,
        displayed(lang, cue.answer, cue.answerZh));
      const meta = row.children.find(child => child.className === 'demo-evidence-meta');
      assert.ok(meta, 'A cue has one shared metadata row.');
      const badge = meta.children.find(child => child.className === 'demo-evidence-source');
      const expertGroup = meta.children.find(child => child.className === 'demo-cue-experts');
      assert.ok(expertGroup, 'A cue displays its example expert pairing.');
      assert.equal(expertGroup.attributes.role, 'group');
      assert.equal(expertGroup.attributes['aria-label'], messages[lang]['demo.exampleExperts'],
        'The expert badges are labeled as an example pairing in every language.');
      assert.deepEqual(expertGroup.children.filter(child => child.className === 'demo-cue-expert')
        .map(child => child.textContent), cue.exampleExperts,
      'Expert badges match this one cue without duplicating its question or answer.');
      const details = row.children.find(child => child.tagName === 'DETAILS');
      if (cue.kind === 'illustrative') {
        assert.equal(badge?.textContent, messages[lang]['demo.illustrativeSource']);
        assert.equal(details, undefined, 'An illustration has no original-answer disclosure.');
      } else {
        if (cue.kind === 'summary') assert.equal(badge?.textContent, messages[lang]['demo.summarySource']);
        else assert.equal(badge, undefined, 'A survey response needs no illustrative badge.');
        assert.ok(details, 'A source-backed cue has its original answer disclosure.');
        for (const field of cue.fields) {
          assert.ok(details.textContent.includes(field.question + ': ' + field.answer));
        }
      }
    });
    assert.ok(!/P\d{7}/.test(ui.root.textContent), 'Do not render original respondent IDs.');
    views++;
  }
}

choose(ui, data.datasets[0].id);
const firstDetails = () => ui.ids.get('demo-cues').children[0].children.find(child => child.tagName === 'DETAILS');
firstDetails().open = true;
ui.setLanguage('zh');
assert.equal(firstDetails().open, true, 'Keep source answers expanded during a language change.');
choose(ui, data.datasets[1].id);
assert.equal(firstDetails().open, false, 'A dataset change resets source-answer disclosures.');
assert.ok(ui.timeline.slice(0, -3).every(animation => animation.cancelled),
  'Rapid dataset switches cancel earlier animations when animations are present.');

const reduced = await mount(data, true);
choose(reduced, data.datasets[1].id);
assert.equal(reduced.timeline.length, 0, 'Reduced motion omits optional transitions.');
assert.equal(reduced.ids.get('demo-content').hidden, false);
const malformed = structuredClone(data);
malformed.datasets[0].case.cues[1].fields.push({ field: 'invented', question: 'Invented', answer: 'Invented' });
const invalid = await mount(malformed);
assert.equal(invalid.ids.get('demo-content').hidden, true);
assert.equal(invalid.errors.length, 1, 'Reject a fake original answer on an illustrative cue.');
console.log(`Method UI passed: ${data.datasets.length} single cases, ${views} localized views, source-backed and illustrative disclosures, selection preservation, reduced motion and invalid-data fallback.`);
