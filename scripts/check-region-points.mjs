// Verify representative markers against the exact geometry used by both maps.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const d3 = require('../assets/vendor/d3.min.js');
const topojson = require('../assets/vendor/topojson-client.min.js');
const root = fileURLToPath(new URL('../', import.meta.url));
const data = JSON.parse(readFileSync(root + 'assets/geography.json', 'utf8'));
const atlas = JSON.parse(readFileSync(root + 'assets/world-110m.json', 'utf8'));
const countries = topojson.feature(atlas, atlas.objects.countries).features;
const byNumeric = new Map(countries.map(country => [String(Number(country.id)), country]));
const point = region => [region.lon, region.lat];

function largestPart(country) {
  const parts = country.geometry.type === 'MultiPolygon'
    ? country.geometry.coordinates.map(coordinates => ({ type: 'Polygon', coordinates }))
    : [country.geometry];
  return parts.sort((a, b) => d3.geoArea(b) - d3.geoArea(a))[0];
}

assert.equal(data.regions.length, data.totalRegions);
for (const region of data.regions) {
  assert.ok(Number.isFinite(region.lon) && region.lon >= -180 && region.lon <= 180);
  assert.ok(Number.isFinite(region.lat) && region.lat >= -90 && region.lat <= 90);
  const country = byNumeric.get(String(Number(region.numericId)));
  assert.ok(country, `${region.id}: atlas country missing`);
  assert.ok(d3.geoContains(country, point(region)), `${region.id}: point is outside its atlas outline`);
}

// For these survey labels, the main land component is the defensible location.
// This also prevents a whole-country centroid drifting toward overseas parts.
for (const id of ['FRA', 'PHL', 'NOR', 'JPN', 'GBR', 'USA']) {
  const region = data.regions.find(item => item.id === id);
  const country = byNumeric.get(String(Number(region.numericId)));
  assert.ok(d3.geoContains(largestPart(country), point(region)), `${id}: not on the main land component`);
}

// These two narrow outlines need breathing room from the simplified boundary.
for (const id of ['HRV', 'ISR']) {
  const region = data.regions.find(item => item.id === id);
  const country = byNumeric.get(String(Number(region.numericId)));
  for (const [dx, dy] of [[.08, 0], [-.08, 0], [0, .08], [0, -.08]]) {
    assert.ok(d3.geoContains(country, [region.lon + dx, region.lat + dy]), `${id}: point is too close to an atlas edge`);
  }
}

console.log(`PASS: ${data.regions.length} representative points are in their atlas country; selected main land components and narrow-boundary buffers verified.`);
