#!/usr/bin/env node
// Source-checked static charts remain readable before browser scripts initialize.
import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const context = vm.createContext({ window: { location: { search: '' } }, URLSearchParams, Intl });
for (const file of ['globe-locales.js', 'i18n.js', 'population-data.js', 'population-results.js']) {
  vm.runInContext(await readFile(new URL(file, root), 'utf8'), context, { filename: file });
}
const data = context.window.SOCIAL_POPULATION_RESULTS;
const assert = (condition, message) => { if (!condition) throw Error(message); };
assert(data?.cases?.length === 3, 'Figure 7 must contain three cases.');
for (const record of [data.aggregate, ...data.cases]) {
  assert(record.options.length >= 4 && record.options.length <= 6, `${record.id}: option count`);
  for (const model of ['human', 'base', 'ours']) {
    const values = record.shares[model];
    assert(values.length === record.options.length, `${record.id}/${model}: option order mismatch`);
    assert(values.every(value => Number.isFinite(value) && value >= 0 && value <= 100), `${record.id}/${model}: invalid share`);
    const total = values.reduce((sum, value) => sum + value, 0);
    // The publication displays one decimal; retain its 99.9–100.1 totals.
    assert(Math.abs(total - 100) < .2, `${record.id}/${model}: rounded total ${total}`);
  }
  for (const distance of Object.values(record.tvd || {})) assert(distance >= 0 && distance <= 1, `${record.id}: invalid TVD`);
}
assert(data.comparison.metrics.length === 4, 'Figure 4(b) must contain four metrics.');
for (const metric of data.comparison.metrics) {
  for (const model of ['base', 'subpop', 'ours']) {
    const value = metric.values[model];
    assert(Number.isFinite(value) && value >= 0 && value <= metric.axisMax, `${metric.id}/${model}: invalid distance`);
  }
}
const messages = context.window.SOCIAL_I18N_MESSAGES.en;
const t = key => {
  assert(Object.hasOwn(messages, key), `Missing population translation: ${key}`);
  return messages[key];
};
const number = (value, digits = 1) => new Intl.NumberFormat('en-US', {
  minimumFractionDigits: digits, maximumFractionDigits: digits
}).format(value);
const fragment = context.window.SocialPopulation.renderMarkup(data, t, number);
const indexUrl = new URL('index.html', root);
const html = await readFile(indexUrl, 'utf8');
const start = '<!-- population-results:start -->';
const end = '<!-- population-results:end -->';
const begin = html.indexOf(start);
const finish = html.indexOf(end);
assert(begin >= 0 && finish > begin, 'Missing population result markers.');
const current = html.slice(begin + start.length, finish).trim();
if (process.argv[2] === '--write') {
  await writeFile(indexUrl, html.slice(0, begin + start.length) + '\n' + fragment + '\n' + html.slice(finish));
  console.log('Updated population charts from Figures 4 and 7.');
} else if (current !== fragment) {
  console.error('Population charts are stale. Run node scripts/render-population-results.mjs --write.');
  process.exitCode = 1;
} else {
  console.log('Population charts match the published shares and distances; four comparisons and three cases verified.');
}
