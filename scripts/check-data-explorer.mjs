// Validate the public portrait aggregates against the published geographic cohort.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = async path => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
const [geo, ages, economy] = await Promise.all(['assets/geography.json', 'assets/demographics.json', 'assets/economy-groups.json'].map(read));
const sum = values => values.reduce((a, b) => a + b, 0);
const regions = new Map(geo.regions.map(region => [region.id, region]));
const classifications = new Map();
for (const item of economy.regions) {
  assert(regions.has(item.regionId), `Unknown economic region ${item.regionId}`);
  assert(!classifications.has(item.regionId), `Repeated economic region ${item.regionId}`);
  assert(['advanced', 'emerging_developing', 'unknown'].includes(item.group));
  classifications.set(item.regionId, item.group);
}
assert.equal(classifications.size, regions.size);
assert.equal(classifications.get('CHN'), 'emerging_developing');
assert.equal(classifications.get('TWN'), 'advanced');
assert.equal(classifications.get('BGR'), 'advanced');
assert.equal(classifications.get('UK'), 'advanced');
assert.equal(classifications.get('XKX'), 'emerging_developing');
assert.deepEqual([...classifications].filter(([, group]) => group === 'unknown').map(([id]) => id), ['VGB']);
assert.equal(regions.get('VGB').count, 1);
assert.equal(ages.schemaVersion, 1);
assert.deepEqual([...ages.datasets.map(d => d.id)].sort(), [...geo.datasets.map(d => d.id)].sort());
let known = 0, unknown = 0, source = 0;
for (const dataset of ages.datasets) {
  const bins = new Set(dataset.bins.map(bin => bin.id));
  assert.equal(bins.size, dataset.bins.length, `Repeated bins in ${dataset.id}`);
  const seenRegions = new Set();
  for (const region of dataset.regions) {
    assert(regions.has(region.regionId), `Unknown age region ${region.regionId}`);
    assert(!seenRegions.has(region.regionId)); seenRegions.add(region.regionId);
    const expected = regions.get(region.regionId).byDataset[dataset.id] || 0;
    assert.equal(region.counts.length, dataset.bins.length);
    region.counts.forEach(n => assert(Number.isInteger(n) && n >= 0));
    assert.equal(sum(region.counts), region.known);
    assert.equal(region.known + region.unknown, expected, `${dataset.id}/${region.regionId} cohort mismatch`);
    assert(region.known <= region.sourceRespondents && region.sourceRespondents <= expected);
    assert(!['person_id', 'profile', 'response', 'groundtruth'].some(key => Object.hasOwn(region, key)), 'Public aggregates contain no respondent records');
    known += region.known; unknown += region.unknown; source += region.sourceRespondents;
  }
  assert.equal(sum(dataset.regions.map(r => r.known + r.unknown)), geo.datasets.find(d => d.id === dataset.id).respondents);
  const schemeRegions = new Set();
  for (const scheme of dataset.nativeSchemes) {
    assert(scheme.binIds.length > 0);
    scheme.binIds.forEach(id => assert(bins.has(id)));
    for (const regionId of scheme.regionIds) {
      assert(seenRegions.has(regionId) && !schemeRegions.has(regionId), `Invalid scheme membership ${dataset.id}/${regionId}`);
      schemeRegions.add(regionId);
      const row = dataset.regions.find(r => r.regionId === regionId);
      dataset.bins.forEach((bin, i) => { if (!scheme.binIds.includes(bin.id)) assert.equal(row.counts[i], 0); });
    }
  }
  assert.equal(schemeRegions.size, seenRegions.size);
}
assert.equal(known + unknown, geo.totalRespondents);
assert.equal(ages.audit.sourceRespondents, source);
assert.equal(ages.audit.coverageRespondents, known + unknown);
assert.equal(ages.audit.manuscriptRespondents, 281995);
assert.equal(ages.audit.releaseRespondents, 67430);
assert.equal(ages.audit.known, known);
assert.equal(ages.audit.unknown, unknown);
for (const [id, count, usable, rows] of [
  ['CPS', 39931, 39931, 359379],
  ['VAPP', 23084, 23084, 135841],
  ['SDI', 4415, 4388, 17660]
]) {
  const d = ages.datasets.find(dataset => dataset.id === id);
  assert.equal(d.sourceRows, rows);
  assert.equal(d.totals.releaseRespondents, count);
  assert.equal(d.totals.known, usable);
  assert.equal(d.totals.sourceAgeOutsideStudyRange, count - usable);
  assert.deepEqual(d.bins.map(b => b.label), ['18-29', '30-39', '40-49', '50-59', '60-69', '70+']);
}
assert.equal(geo.totalRespondents - source, 18);
const issp = ages.datasets.find(d => d.id === 'ISSP2015');
assert.deepEqual(issp.nativeSchemes.find(s => s.id === 'denmark').regionIds, ['DNK']);
console.log(`PASS: portrait aggregates reconcile ${known.toLocaleString('en')} reported ages + ${unknown.toLocaleString('en')} unavailable with ${geo.totalRespondents.toLocaleString('en')} survey respondents; native age schemes and IMF region groups remain separate.`);
