#!/usr/bin/env node
// Keep the no-JavaScript figures in index.html in sync with research-data.js.
// Place the named marker pairs around the corresponding HTML, then run --write.
import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const indexUrl = new URL('index.html', root);
const source = await readFile(new URL('research-data.js', root), 'utf8');
const context = vm.createContext({ window: {} });
vm.runInContext(source, context, { filename: 'research-data.js' });
const research = context.window.SOCIAL_RESEARCH_RESULTS;
if (!research?.models?.qwen3 || !Array.isArray(research.datasets) || !research.expertExpansion?.records) {
  throw Error('research-data.js has an unexpected shape');
}

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
const format = (value, digits) => Number(value).toFixed(digits);
const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const mean = values => Math.round(average(values) * 100 + 1e-8) / 100;

function renderSummary() {
  const model = research.models.qwen3;
  const points = Number((average(model.ours) - average(model.base)).toFixed(1));
  return `<div class="benchmark-summary" aria-live="polite">
          <div class="mean-trajectory"><span id="mean-base">${format(mean(model.base), 2)}%</span><span class="mean-arrow" aria-hidden="true">→</span><strong id="mean-ours">${format(mean(model.ours), 2)}%</strong></div>
          <p id="mean-model-label">Mean accuracy across eight datasets · ${escapeHtml(model.shortLabel)}</p>
          <div class="mean-deltas"><p><strong id="point-gain">+${format(points, 1)}</strong> <span><span data-i18n="evidence.points">percentage points</span></span></p><p><strong id="relative-gain">+${escapeHtml(model.reportedRelativeGain)}</strong> <span><span data-i18n="evidence.relativeGainDetail">relative gain in mean accuracy</span></span></p></div>
        </div>`;
}

function renderBenchmark() {
  const model = research.models.qwen3;
  if (research.datasets.length !== model.base.length || model.base.length !== model.ours.length) {
    throw Error('dataset and default-model arrays differ in length');
  }
  return research.datasets.map((dataset, index) => {
    const base = model.base[index];
    const ours = model.ours[index];
    return `<div class="chart-row" data-dataset="${escapeHtml(dataset)}" aria-label="${escapeHtml(dataset)}: base ${format(base, 2)} percent, SocialReasoner ${format(ours, 2)} percent"><span class="chart-label">${escapeHtml(dataset)}</span><div class="chart-bars" aria-hidden="true"><div class="chart-bar base" style="width:${base / 70 * 100}%"><span>${format(base, 2)}</span></div><div class="chart-bar ours" style="width:${ours / 70 * 100}%"><span>${format(ours, 2)}</span></div></div></div>`;
  }).join('\n          ');
}

function renderExpertChart() {
  const values = research.expertExpansion.records;
  const x = index => 75 + index * 150;
  const y = accuracy => 220 - (accuracy - 62) * 82;
  const axis = [62, 63, 64].map(tick => `<line x1="65" x2="690" y1="${y(tick)}" y2="${y(tick)}"></line><text x="55" y="${y(tick) + 4}" text-anchor="end">${tick}</text>`).join('');
  const points = values.map((item, index) => `${x(index)},${y(item.accuracy)}`).join(' ');
  const circles = values.map((item, index) => {
    const current = index === 2;
    const className = `expert-point${item.defaultConfiguration ? ' is-default' : ''}${current ? ' is-current' : ''}`;
    const reference = item.defaultConfiguration ? `<circle class="expert-reference-ring" cx="${x(index)}" cy="${y(item.accuracy)}" r="11"></circle>` : '';
    return `<g class="${className}" aria-current="${current}">${reference}<circle class="expert-dot" cx="${x(index)}" cy="${y(item.accuracy)}" r="5.5"></circle><text x="${x(index)}" y="247" text-anchor="middle">${index + 1}</text></g>`;
  }).join('');
  return `<g class="expert-axis">${axis}</g><polyline class="expert-line" fill="none" points="${points}"></polyline>${circles}<text class="expert-x-title" x="380" y="277" text-anchor="middle" data-i18n="evidence.expertXAxis">Number of experts</text>`;
}

function renderExpertList() {
  return research.expertExpansion.records.map((item, index) => {
    const current = index === 2;
    const className = `${item.defaultConfiguration ? 'is-default ' : ''}${current ? 'is-current' : ''}`.trim();
    const marker = item.defaultConfiguration ? `<span class="expert-main-configuration" data-i18n="evidence.mainConfiguration">Main configuration</span>` : '';
    return `<li${className ? ` class="${className}"` : ''}><button type="button" data-expert-index="${index}" aria-pressed="${current}"><span class="expert-index">${String(index + 1).padStart(2, '0')}</span><div><strong>${escapeHtml(item.experts)}</strong><span>${escapeHtml(item.trainingRecords)} reasoning records</span>${marker}</div><b>${format(item.accuracy, 2)}%</b></button></li>`;
  }).join('\n            ');
}

function renderExpertCurrent() {
  const item = research.expertExpansion.records.find(record => record.defaultConfiguration);
  return `<div class="expert-current" aria-live="polite"><strong>${escapeHtml(item.experts)}</strong><span>${escapeHtml(item.trainingRecords)} reasoning records · ${format(item.accuracy, 2)}%</span></div>`;
}

const blocks = {
  summary: renderSummary(),
  benchmark: renderBenchmark(),
  'expert-chart': renderExpertChart(),
  'expert-list': renderExpertList(),
  'expert-current': renderExpertCurrent()
};

const mode = process.argv[2] || '--check';
if (mode === '--fragments') {
  process.stdout.write(JSON.stringify(blocks, null, 2) + '\n');
} else if (mode === '--write' || mode === '--check') {
  let html = await readFile(indexUrl, 'utf8');
  let stale = 0;
  for (const [name, fragment] of Object.entries(blocks)) {
    const start = `<!-- static-results:${name}:start -->`;
    const end = `<!-- static-results:${name}:end -->`;
    const begin = html.indexOf(start);
    const finish = html.indexOf(end);
    if (begin < 0 || finish < begin) throw Error(`Missing or unordered markers for ${name}`);
    const current = html.slice(begin + start.length, finish).trim();
    if (current !== fragment) stale++;
    if (mode === '--write') html = html.slice(0, begin + start.length) + '\n' + fragment + '\n' + html.slice(finish);
  }
  if (mode === '--write') {
    await writeFile(indexUrl, html);
    console.log(`Updated ${Object.keys(blocks).length} static results blocks from research-data.js.`);
  } else if (stale) {
    console.error(`${stale} static results blocks are stale. Run node scripts/render-static-results.mjs --write.`);
    process.exitCode = 1;
  } else {
    console.log('Static results match research-data.js.');
  }
} else {
  throw Error(`Unknown option ${mode}`);
}
