// Validate the public portrait aggregates against the unchanged geographic cohort.
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
assert.equal(sum(geo.regions.filter(r => classifications.get(r.id) === 'advanced').map(r => r.count)), 186722);
assert.equal(sum(geo.regions.filter(r => classifications.get(r.id) === 'emerging_developing').map(r => r.count)), 95273);
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
assert.equal(source, 281977);
assert.equal(geo.totalRespondents - source, 18);
const issp = ages.datasets.find(d => d.id === 'ISSP2015');
assert.deepEqual(issp.nativeSchemes.find(s => s.id === 'denmark').regionIds, ['DNK']);
console.log(`PASS: portrait aggregates reconcile ${known.toLocaleString('en')} reported ages + ${unknown.toLocaleString('en')} unavailable with ${geo.totalRespondents.toLocaleString('en')} survey respondents; native age schemes and IMF region groups remain separate.`);
