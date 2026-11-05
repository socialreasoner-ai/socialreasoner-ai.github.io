import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = name => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'));
const data = read('assets/respondent-cots.json');
const base = read('assets/respondent-showcase.json');
const geography = read('assets/geography.json');
const locales = { window: {} };
vm.runInNewContext(readFileSync(new URL('../respondent-locales.js', import.meta.url), 'utf8'), locales);
for (const language of ['en', 'zh', 'fr', 'de', 'ko']) {
  assert.ok(locales.window.SOCIAL_RESPONDENT_MESSAGES[language].cot, `${language}: CoT heading missing.`);
}
assert.equal(data.schemaVersion, 1);
assert.deepEqual(data.datasets.map(group => group.datasetId).sort(), geography.datasets.map(group => group.id).sort());
const regionIds = new Set(geography.regions.map(region => region.id));
const regions = new Map(geography.regions.map(region => [region.id, region]));
const people = new Set();
let ready = 0;
for (const group of data.datasets) {
  const originalGroup = base.datasets.find(item => item.datasetId === group.datasetId);
  assert.ok(originalGroup, group.datasetId);
  if (group.datasetId === 'GSS2022') {
    assert.equal(group.availability, 'pending');
    assert.deepEqual(group.participants, []);
    continue;
  }
  ready++;
  assert.equal(group.availability, 'ready');
  assert.equal(group.participants.length, 2);
  const [a, b] = group.participants;
  assert.deepEqual(a.target, b.target, `${group.datasetId}: A/B target must match.`);
  for (const [index, person] of group.participants.entries()) {
    assert.equal(person.displayId, `${group.datasetId}-${index === 0 ? 'A' : 'B'}`);
    assert.ok(!people.has(person.displayId));
    people.add(person.displayId);
    assert.ok(originalGroup.participants.some(item => item.displayId === person.displayId));
    assert.equal(person.datasetId, group.datasetId);
    assert.ok(regionIds.has(person.regionId));
    assert.equal(person.mapAnchor.regionId, person.regionId);
    assert.equal(person.sourceRef.source, 'thinking_data_posttrain');
    assert.equal(person.sourceRef.split, 'train');
    assert.ok(person.sourceRef.sourcePersonId);
    assert.equal(person.sourceRef.targetQuestionId, person.target.questionId);
    assert.ok(person.target.question?.trim());
    const answer = person.target.options.find(option => option.id === person.observedOptionId);
    assert.ok(answer?.text, `${person.displayId}: answer absent from options.`);
    assert.ok(typeof person.cot === 'string' && person.cot.trim().length > 60, `${person.displayId}: CoT absent.`);
    assert.ok(person.demographics.length >= 4 && person.perceptions.length > 0);
    assert.ok(person.demographics.every(field => field.key && field.label && field.value !== undefined));
    assert.equal(person.demographics.find(field => field.key === 'country')?.value, regions.get(person.regionId).label,
      `${person.displayId}: profile country must match the map region.`);
    for (const field of person.demographics) {
      for (const language of ['en', 'zh', 'fr', 'de', 'ko']) {
        assert.ok(locales.window.SOCIAL_RESPONDENT_MESSAGES[language][`field_${field.key}`], `${language}: missing ${field.key} label.`);
      }
    }
    for (const perception of person.perceptions) {
      assert.ok(perception.profileKey?.startsWith('perceived_'));
      assert.ok(perception.question?.trim() && perception.value !== undefined);
      assert.notEqual(perception.sourceQuestionId, person.target.questionId, 'Target cannot appear among perception inputs.');
    }
    assert.ok(!JSON.stringify(person).includes('byteOffset'), 'Keep source offsets in the private audit.');
    assert.ok(!/(?:\/Users\/|\/Volumes\/|file:\/\/|\/home\/)/.test(JSON.stringify(person)), 'Public fixture contains a local path.');
  }
}
assert.equal(ready, 8);
assert.equal(people.size, 16);
console.log('Respondent CoTs: 16 complete source-backed cards across eight datasets; shared questions, answers, inputs and five-language headings verified.');
