import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const raw = readFileSync(new URL('../assets/method-demo.json', import.meta.url), 'utf8');
const data = JSON.parse(raw);
const models = ['ebm', 'lgbm', 'mlp'];
const localeWindow = { location: { search: '' } };
vm.runInNewContext(readFileSync(new URL('../i18n.js', import.meta.url), 'utf8'), { window: localeWindow, URLSearchParams, Intl });
assert.equal(data.datasets.length, 8, 'Cover the eight post-training surveys.');
assert.ok(data.datasets.every(dataset => !dataset.id.startsWith('GSS')), 'GSS is excluded from the Method demo.');
const confirmed = {
  ATP152: [3, '1248b77e4dce8a05626fab76277623e710898b61b608b4a24d2b9f5d223b850c'],
  EVS2017: [3, '40a9d53db374e5ac04199800daa2f417a49bb3ed77f1a800febbde6e3a868c3a'],
  ISSP2009: [3, '2937e218a531d9d9ef7c5a3f15eb945b67c6c8c589ab3b96b8f94daf0b93b898'],
  ISSP2015: [4, '8d5e3f25b4c8077ec27d4b08ca1ccbf1a6730d9224f0f38129e1eb86687868b7'],
  ISSP2016: [3, '44ff3902fedcc3e08dc1563ccd8ac005c17d57eeec95b370c81f8e671b3a2208'],
  ISSP2019: [4, '84d4b5615d3e87cd15ea54e5aff4736820d9f06fb66cf8fd1a722a7d33335fe2'],
  ISSP2021: [4, '5361fa8f6cdf2e60d8bbd4b0f07be7a25b3e8d806b8d26c96b4358d18a6ea8bd']
};
assert.deepEqual(data.datasets.map(d => d.label), ['ATP142', ...Object.keys(confirmed)]);
function checkReviewed(dataset) {
  const entry = dataset.case;
  const [count, originalCot] = confirmed[dataset.label];
  assert.equal(dataset.mode, 'single');
  assert.equal(dataset.id, dataset.label + '-perceived');
  assert.ok(!dataset.profiles && !entry.experts);
  assert.equal(entry.options[entry.answerId], entry.answer);
  assert.equal(entry.optionsZh[entry.answerId], entry.answerZh);
  assert.deepEqual(Object.keys(entry.options), Object.keys(entry.optionsZh));
  assert.equal(createHash('sha256').update(entry.cot).digest('hex'), originalCot);
  assert.ok(entry.cotZh.trim() && entry.question.trim() && entry.questionZh.trim());
  assert.ok(entry.perceptions.length && Object.values(entry.demographics).some(Boolean));
  assert.equal(entry.cues.length, count);
  for (const [index, cue] of entry.cues.entries()) {
    for (const key of ['question', 'questionZh', 'answer', 'answerZh']) assert.ok(cue[key]?.trim());
    assert.equal(cue.kind, dataset.label === 'ATP152' && index === 2 ? 'summary' : 'response');
    assert.ok(cue.fields.length);
    const seen = new Set();
    for (const field of cue.fields) {
      assert.ok(field.question.trim() && field.answer.trim() && field.field && !seen.has(field.field));
      assert.notEqual(field.question, entry.question);
      seen.add(field.field);
    }
  }
}
const datasetIds = new Set();
let profiles = 0;
let combinations = 0;
let variants = 0;
let cueCount = 0;
let retainedCount = 0;
let supplementalCount = 0;
const uniqueCots = new Set();
for (const dataset of data.datasets) {
  assert.ok(dataset.id && dataset.label && !datasetIds.has(dataset.id));
  datasetIds.add(dataset.id);
  if (dataset.label !== 'ATP142') {
    checkReviewed(dataset);
    continue;
  }
  assert.ok(dataset.profiles.length >= 2, `${dataset.id}: offer contrasting profiles.`);
  const profileIds = new Set();
  let sharedQuestions;
  for (const profile of dataset.profiles) {
    profiles++;
    assert.ok(profile.id && !profileIds.has(profile.id));
    profileIds.add(profile.id);
    assert.ok(profile.labelFields && Object.values(profile.labelFields).filter(Boolean).length >= 2);
    assert.ok(profile.records.length >= 3, `${dataset.id}/${profile.id}: offer several questions.`);
    const questions = profile.records.map(record => record.questionId).sort();
    if (sharedQuestions) assert.deepEqual(questions, sharedQuestions, 'Every profile offers the same selected questions.');
    sharedQuestions = questions;
    assert.equal(new Set(questions).size, questions.length);
    const recordIds = new Set();
    for (const record of profile.records) {
      combinations++;
      assert.ok(record.id && !recordIds.has(record.id));
      recordIds.add(record.id);
      assert.ok(record.question?.trim() && Object.keys(record.options).length >= 2);
      const menuKey = `demo.question.${dataset.id}.${record.questionId}`;
      for (const language of ['en', 'zh', 'fr', 'de', 'ko']) {
        assert.ok(localeWindow.SOCIAL_I18N_MESSAGES[language][menuKey]?.trim(), `${menuKey}: missing ${language} menu label.`);
      }
      assert.ok(record.perceptions.length, 'Display the actual available perception inputs.');
      const fields = new Set();
      for (const item of record.perceptions) {
        assert.ok(/^(perceived_|perception-)/.test(item.field || '') && !fields.has(item.field));
        fields.add(item.field);
        assert.ok(item.question?.trim() && typeof item.response === 'string' && item.response.trim());
        if (record.targetField) assert.notEqual(item.field, record.targetField, 'Exclude the target from perception inputs.');
      }
      assert.deepEqual(Object.keys(record.experts).sort(), [...models].sort());
      const cots = [];
      for (const model of models) {
        const expert = record.experts[model];
        assert.ok(typeof expert.cot === 'string' && expert.cot.trim().length > 60);
        assert.equal(record.options[String(expert.answerId)], expert.answerLabel, 'Preserve source answer labels.');
        assert.ok(Array.isArray(expert.cues), 'Each reasoning record includes its own source cues.');
        const cueIds = new Set();
        for (const cue of expert.cues) {
          assert.ok(typeof cue.id === 'string' && cue.id.trim() && !cueIds.has(cue.id));
          cueIds.add(cue.id);
          assert.ok(typeof cue.fact === 'string' && cue.fact.trim());
          assert.equal(typeof cue.retained, 'boolean');
          cueCount++;
          retainedCount += Number(cue.retained);
        }
        assert.ok(Array.isArray(expert.supplementalEvidence), 'Supplemental profile evidence stays separate from cues.');
        for (const item of expert.supplementalEvidence) {
          assert.ok(typeof item.fact === 'string' && item.fact.trim());
          supplementalCount++;
        }
        cots.push(expert.cot);
        uniqueCots.add(expert.cot);
        variants++;
      }
      assert.ok(new Set(cots).size >= 1, 'Every choice has a complete stored CoT.');
    }
  }
}
assert.ok(!/"(?:person_id|pid|prompt|original_cot)"\s*:/.test(raw), 'Do not publish original participant IDs or full prompts.');
console.log('Verified seven reviewed survey cases and 24 cues.');
console.log(`Method demo: ${datasetIds.size} surveys, ${profiles} profiles, ${combinations} profile/question combinations, ${variants} model choices, ${uniqueCots.size} unique CoTs; complete choices and source labels verified.`);
console.log(`Reasoning evidence: ${cueCount} source cues, ${retainedCount} retained, ${supplementalCount} separate supplemental facts.`);
