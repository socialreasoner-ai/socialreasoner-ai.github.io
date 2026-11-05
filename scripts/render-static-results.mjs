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
if (!research?.models?.qwen3 || !Array.isArray(research.datasets)) {
  throw Error('research-data.js has an unexpected shape');
}

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
const format = (value, digits) => Number(value).toFixed(digits);

function renderSummary() {
  const model = research.models.qwen3;
  return `<div class="benchmark-summary" aria-live="polite">
          <p class="relative-gain-summary"><strong id="relative-gain">+${escapeHtml(model.reportedRelativeGain)}</strong> <span data-i18n="evidence.relativeGainDetail">relative gain in mean accuracy</span></p>
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
    return `<div class="chart-row" data-dataset="${escapeHtml(dataset)}" aria-label="${escapeHtml(dataset)}: base ${format(base, 2)} percent, SocialReasoner ${format(ours, 2)} percent"><span class="chart-label">${escapeHtml(dataset)}</span><div class="chart-bars" aria-hidden="true"><div class="chart-bar base" style="height:${base / 70 * 100}%"><span>${format(base, 2)}</span></div><div class="chart-bar ours" style="height:${ours / 70 * 100}%"><span>${format(ours, 2)}</span></div></div></div>`;
  }).join('\n          ');
}

const blocks = { summary: renderSummary(), benchmark: renderBenchmark() };

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
