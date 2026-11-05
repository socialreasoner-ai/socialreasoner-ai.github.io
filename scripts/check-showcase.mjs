#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(site, 'assets/respondent-showcase.json'), 'utf8'));
const geography = JSON.parse(readFileSync(resolve(site, 'assets/geography.json'), 'utf8'));
const source = process.argv[2] ? resolve(process.argv[2])
  : resolve(site, '../../output/socialreasoner_18_person_complete_20261105');
const sourcePresent = existsSync(resolve(source, 'manifest.json'));
const datasetIds = geography.datasets.map(dataset => dataset.id);
const localeWindow = {};
vm.runInNewContext(readFileSync(resolve(site, 'respondent-locales.js'), 'utf8'), { window: localeWindow });
const respondentMessages = localeWindow.SOCIAL_RESPONDENT_MESSAGES;
const demographicKeys = new Set(manifest.datasets.flatMap(group => group.participants
  .flatMap(person => person.demographics.map(field => field.key))));
for (const lang of ['en', 'zh', 'fr', 'de', 'ko']) {
  assert(respondentMessages[lang], `Missing respondent locale ${lang}`);
  for (const key of demographicKeys) {
    assert(respondentMessages[lang][`field_${key}`], `Missing ${lang} field label: ${key}`);
  }
}
assert(!/(?:\/Users\/|\/Volumes\/|file:\/\/|\/home\/)/.test(JSON.stringify(manifest)),
  'Public showcase includes a local filesystem path');
assert.equal(manifest.schemaVersion, 1);
assert.deepEqual(manifest.datasets.map(dataset => dataset.datasetId), datasetIds);
const regions = new Map(geography.regions.map(region => [region.id, region]));
const personKeys = new Set();
let people = 0;
for (const group of manifest.datasets) {
  assert(['pending', 'partial', 'ready'].includes(group.availability));
  assert(Array.isArray(group.participants));
  if (group.availability === 'ready') assert.equal(group.participants.length, 2, group.datasetId);
  if (group.availability === 'pending') assert.equal(group.participants.length, 0, group.datasetId);
  if (group.availability === 'partial') assert.equal(group.participants.length, 1, group.datasetId);
  const targets = [];
  for (const [index, person] of group.participants.entries()) {
    people += 1;
    assert.equal(person.datasetId, group.datasetId);
    assert.equal(person.displayId, `${group.datasetId}-${index === 0 ? 'A' : 'B'}`);
    assert(regions.has(person.regionId), person.displayId);
    assert.equal(person.mapAnchor.regionId, person.regionId);
    assert.equal(person.avatarIllustrative, true);
    assert.equal(person.avatar.modelPath, null);
    assert.equal(person.avatar.assetStatus, 'poster-only');
    assert(Array.isArray(person.demographics) && person.demographics.length > 0);
    assert(Array.isArray(person.perceptions));
    assert(person.target.questionId && person.target.question);
    assert(person.target.options.length >= 2);
    const options = new Map(person.target.options.map(option => [option.id, option.text]));
    assert.equal(options.size, person.target.options.length);
    assert(options.has(person.observedOptionId));
    assert.equal(person.sourceRef.targetQuestionId, person.target.questionId);
    assert.equal(person.sourceRef.package, manifest.sourceVersion);
    assert(!personKeys.has(person.sourceRef.recordKey));
    personKeys.add(person.sourceRef.recordKey);
    for (const path of [person.avatar.posterPath, person.avatar.fullPath]) {
      assert(/^assets\/avatars\/[A-Za-z0-9_-]+(?:-preview)?\.png$/.test(path), path);
      assert(existsSync(resolve(site, path)), path);
    }
    const preview = readFileSync(resolve(site, person.avatar.posterPath));
    assert.equal(preview.subarray(1, 4).toString(), 'PNG', person.displayId);
    assert(preview.readUInt32BE(16) <= 320 && preview.readUInt32BE(20) <= 320,
      `Oversized preview: ${person.displayId}`);
    assert([4, 6].includes(preview[25]), `Preview lacks alpha channel: ${person.displayId}`);
    for (const path of [person.sourceRef.profilePath, person.sourceRef.answersPath,
      person.sourceRef.avatarPath, person.sourceRef.perceivedRecordPath, person.sourceRef.perceivedMapPath]) {
      assert(typeof path === 'string' && !path.startsWith('/') && !path.includes('..'), path);
    }
    assert(person.perceptions.every(item => item.sourceQuestionId !== person.target.questionId));
    assert(person.demographics.every(field => field.key && field.label && field.value !== undefined));
    targets.push(JSON.stringify(person.target));
    if (!sourcePresent) continue;
    const readSource = path => JSON.parse(readFileSync(resolve(source, path), 'utf8'));
    const profile = readSource(person.sourceRef.profilePath);
    const answers = readSource(person.sourceRef.answersPath);
    const answer = answers.find(item => item.question_id === person.target.questionId);
    assert(answer, person.displayId);
    assert.equal(answer.person_id, person.sourceRef.sourcePersonId);
    assert.equal(answer.dataset, person.datasetId);
    assert.deepEqual(answer.profile_as_used, profile);
    assert.equal(answer.question, person.target.question);
    assert.deepEqual(person.target.options, Object.entries(answer.options).map(([id, text]) => ({ id, text })));
    assert.equal(answer.answer_id, person.observedOptionId);
    assert.equal(answer.answer, options.get(person.observedOptionId));
    assert.equal(answer.source_line, person.sourceRef.targetSourceLine);
    assert.equal(answer.split, person.sourceRef.split);
    assert.deepEqual(person.demographics, Object.entries(profile)
      .filter(([, value]) => value !== null)
      .map(([key, value]) => ({ key, label: key.replaceAll('_', ' ').replace(/\b\w/g, ch => ch.toUpperCase()), value })));
    assert.equal(regions.get(person.regionId).label, profile.country);
    const perceivedRows = readFileSync(resolve(source, person.sourceRef.perceivedRecordPath), 'utf8')
      .trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    const perceivedTarget = perceivedRows.find(item => item.question_id === person.target.questionId);
    assert(perceivedTarget, person.displayId);
    assert.equal(perceivedTarget.dataset, person.sourceRef.perceivedDatasetVersion);
    assert.equal(perceivedTarget.person_id, person.sourceRef.sourcePersonId);
    const map = readSource(person.sourceRef.perceivedMapPath);
    const expectedViews = Object.entries(perceivedTarget.profile)
      .filter(([key, value]) => key.startsWith('perceived_') && value != null && String(value).trim())
      .filter(([key]) => map[key]?.source_question_id !== person.target.questionId)
      .map(([key, value]) => ({
        profileKey: key, sourceQuestionId: map[key].source_question_id,
        label: map[key].display_name,
        question: answers.find(item => item.question_id === map[key].source_question_id)?.question || map[key].display_name,
        value
      }));
    assert.deepEqual(person.perceptions, expectedViews);
    const sourceAvatar = readFileSync(resolve(source, person.sourceRef.avatarPath));
    const publicAvatar = readFileSync(resolve(site, person.avatar.fullPath));
    const digest = bytes => createHash('sha256').update(bytes).digest('hex');
    assert.equal(digest(publicAvatar), digest(sourceAvatar));
  }
  if (group.availability === 'ready') assert.equal(targets[0], targets[1], group.datasetId);
}
assert.equal(manifest.datasets.length, 9);
assert.equal(people, 18);
console.log(`Showcase passed: 9 datasets, 18 participants, sources ${sourcePresent ? 'verified' : 'unavailable locally'}.`);
