#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const [i18nSource, globeSource, html, appSource] = await Promise.all([
  readFile(new URL('i18n.js', root), 'utf8'),
  readFile(new URL('globe-locales.js', root), 'utf8'),
  readFile(new URL('index.html', root), 'utf8'),
  readFile(new URL('app.js', root), 'utf8')
]);
const languages = ['en', 'zh', 'fr', 'de', 'ko'];
const issues = [];
const windowStub = { location: { search: '' } };
const context = vm.createContext({ window: windowStub, URLSearchParams, Intl });
try {
  vm.runInContext(globeSource, context, { filename: 'globe-locales.js' });
  vm.runInContext(i18nSource, context, { filename: 'i18n.js' });
} catch (error) {
  console.error(`Locale source could not be loaded: ${error.message}`);
  process.exit(1);
}

function placeholders(value) {
  return [...new Set([...value.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(match => match[1]))].sort().join(',');
}
function checkDictionary(name, dictionary) {
  if (!dictionary || typeof dictionary !== 'object') { issues.push(`${name}: missing dictionary`); return; }
  const actualLanguages = Object.keys(dictionary).sort();
  if (actualLanguages.join(',') !== [...languages].sort().join(',')) issues.push(`${name}: language set ${actualLanguages.join(', ')}`);
  const english = dictionary.en || {};
  const expectedKeys = Object.keys(english).sort();
  if (!expectedKeys.length) issues.push(`${name}: English dictionary is empty`);
  for (const language of languages) {
    const entries = dictionary[language] || {};
    const keys = Object.keys(entries).sort();
    const missing = expectedKeys.filter(key => !Object.hasOwn(entries, key));
    const extra = keys.filter(key => !Object.hasOwn(english, key));
    if (missing.length) issues.push(`${name}/${language}: missing ${missing.join(', ')}`);
    if (extra.length) issues.push(`${name}/${language}: extra ${extra.join(', ')}`);
    for (const key of expectedKeys) {
      const value = entries[key];
      if (typeof value !== 'string' || !value.trim()) {
        issues.push(`${name}/${language}/${key}: empty or non-string translation`);
      } else if (typeof english[key] === 'string' && placeholders(value) !== placeholders(english[key])) {
        issues.push(`${name}/${language}/${key}: placeholder mismatch (${placeholders(value)} vs ${placeholders(english[key])})`);
      }
    }
  }
}

const rows = windowStub.SOCIAL_I18N_ROWS || [];
if (!Array.isArray(rows) || !rows.length) issues.push('i18n.js: no translation rows');
const rowKeys = new Set();
for (const row of rows) {
  if (!Array.isArray(row) || row.length !== 6) {
    issues.push(`i18n.js: row must have a key and five translations: ${JSON.stringify(row)}`);
    continue;
  }
  if (rowKeys.has(row[0])) issues.push(`i18n.js: duplicate key ${row[0]}`);
  rowKeys.add(row[0]);
}
checkDictionary('site', windowStub.SOCIAL_I18N_MESSAGES);
checkDictionary('globe', windowStub.SOCIAL_GLOBE_MESSAGES);
checkDictionary('region names', windowStub.SOCIAL_REGION_NAMES);

const siteKeys = windowStub.SOCIAL_I18N_MESSAGES?.en || {};
for (const match of html.matchAll(/\bdata-i18n(?:-aria-label|-alt|-content|-title)?="([^"]+)"/g)) {
  if (!Object.hasOwn(siteKeys, match[1])) issues.push(`index.html: unknown DOM key ${match[1]}`);
}
for (const match of html.matchAll(/\bdata-i18n="([^"]+)"[^>]*>([^<]*)/g)) {
  const key = match[1];
  const initial = match[2].replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
  if (Object.hasOwn(siteKeys, key) && initial !== siteKeys[key]) issues.push(`index.html: initial English text differs for ${key}`);
}
for (const match of appSource.matchAll(/\bsiteText\(['"]([^'"`]+)['"]/g)) {
  if (!Object.hasOwn(siteKeys, match[1])) issues.push(`app.js: unknown dynamic key ${match[1]}`);
}
for (let index = 0; index < 4; index++) {
  for (const part of ['label', 'heading', 'body']) {
    if (!Object.hasOwn(siteKeys, `stage.${index}.${part}`)) issues.push(`app.js: missing stage.${index}.${part}`);
  }
}
const select = html.match(/<select\b[^>]*id="site-language"[^>]*>([\s\S]*?)<\/select>/);
if (!select) issues.push('index.html: language selector missing');
else {
  const options = [...select[1].matchAll(/<option\b[^>]*value="([^"]+)"/g)].map(match => match[1]);
  if (options.join(',') !== languages.join(',')) issues.push(`index.html: language options ${options.join(', ')}`);
}
const scriptOrder = ['globe-locales.js', 'i18n.js', 'app.js', 'globe.js'].map(file => html.indexOf(`src="${file}`));
if (scriptOrder.some(position => position < 0) || scriptOrder.some((position, index) => index && position <= scriptOrder[index - 1])) {
  issues.push('index.html: expected globe-locales.js → i18n.js → app.js → globe.js load order');
}

if (issues.length) {
  console.error(`Locale check failed (${issues.length}):\n${issues.map(issue => `- ${issue}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Locale check passed: ${languages.length} languages, ${rowKeys.size} site keys, ${Object.keys(windowStub.SOCIAL_GLOBE_MESSAGES.en).length} globe keys, ${Object.keys(windowStub.SOCIAL_REGION_NAMES.en).length} region names, DOM and placeholders in sync.`);
}
