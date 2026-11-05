import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const raw = readFileSync(new URL('../assets/method-demo.json', import.meta.url), 'utf8');
const data = JSON.parse(raw);
const models = ['ebm', 'lgbm', 'mlp'];
const localeWindow = { location: { search: '' } };
vm.runInNewContext(readFileSync(new URL('../i18n.js', import.meta.url), 'utf8'), { window: localeWindow, URLSearchParams, Intl });
assert.equal(data.datasets.length, 8, 'Cover the eight post-training surveys.');
assert.ok(data.datasets.every(dataset => !dataset.id.startsWith('GSS')), 'GSS is excluded from the Method demo.');
const datasetIds = new Set();
let profiles = 0;
let combinations = 0;
let variants = 0;
const uniqueCots = new Set();
for (const dataset of data.datasets) {
  assert.ok(dataset.id && dataset.label && !datasetIds.has(dataset.id));
  datasetIds.add(dataset.id);
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
        cots.push(expert.cot);
        uniqueCots.add(expert.cot);
        variants++;
      }
      assert.ok(new Set(cots).size >= 1, 'Every choice has a complete stored CoT.');
    }
  }
}
assert.ok(!/"(?:person_id|prompt|original_cot)"\s*:/.test(raw), 'Do not publish original participant IDs or full prompts.');
console.log(`Method demo: ${datasetIds.size} surveys, ${profiles} profiles, ${combinations} profile/question combinations, ${variants} model choices, ${uniqueCots.size} unique CoTs; complete choices and source labels verified.`);
