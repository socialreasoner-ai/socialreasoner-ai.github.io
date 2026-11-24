import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const raw = readFileSync(new URL('../assets/method-demo.json', import.meta.url), 'utf8');
const data = JSON.parse(raw);
const expected = {
  ATP142: [2, 'a02fa26462bc7106c29b2ef5503260cd8a248376236d4b36d559b594e32c63c0'],
  ATP152: [3, '1248b77e4dce8a05626fab76277623e710898b61b608b4a24d2b9f5d223b850c'],
  EVS2017: [3, '40a9d53db374e5ac04199800daa2f417a49bb3ed77f1a800febbde6e3a868c3a'],
  ISSP2009: [3, '2937e218a531d9d9ef7c5a3f15eb945b67c6c8c589ab3b96b8f94daf0b93b898'],
  ISSP2015: [4, '8d5e3f25b4c8077ec27d4b08ca1ccbf1a6730d9224f0f38129e1eb86687868b7'],
  ISSP2016: [3, '44ff3902fedcc3e08dc1563ccd8ac005c17d57eeec95b370c81f8e671b3a2208'],
  ISSP2019: [4, '84d4b5615d3e87cd15ea54e5aff4736820d9f06fb66cf8fd1a722a7d33335fe2'],
  ISSP2021: [4, '5361fa8f6cdf2e60d8bbd4b0f07be7a25b3e8d806b8d26c96b4358d18a6ea8bd']
};
const expertNames = ['EBM', 'LightGBM', 'MLP'];

assert.deepEqual(data.datasets.map(dataset => dataset.label), Object.keys(expected),
  'Show exactly the eight training surveys in their published order.');
const ids = new Set();
let cueCount = 0;
let sourceAnswerCount = 0;
for (const dataset of data.datasets) {
  const entry = dataset.case;
  const [expectedCues, expectedCotHash] = expected[dataset.label];
  assert.equal(dataset.id, `${dataset.label}-perceived`);
  assert.ok(!ids.has(dataset.id), `Duplicate dataset ${dataset.id}`);
  ids.add(dataset.id);
  assert.equal(dataset.mode, 'single', `${dataset.id}: display one reviewed case.`);
  assert.ok(entry && !dataset.profiles && !entry.experts,
    `${dataset.id}: do not expose the former profile/model choice fixture.`);
  assert.ok(entry.question?.trim() && entry.questionZh?.trim());
  assert.ok(entry.cot?.trim() && entry.cotZh?.trim());
  assert.equal(createHash('sha256').update(entry.cot).digest('hex'), expectedCotHash,
    `${dataset.id}: retain the selected source CoT exactly.`);
  assert.equal(entry.options?.[entry.answerId], entry.answer);
  assert.equal(entry.optionsZh?.[entry.answerId], entry.answerZh);
  assert.deepEqual(Object.keys(entry.options), Object.keys(entry.optionsZh));
  assert.ok(Object.keys(entry.options).length >= 2);
  assert.ok(Array.isArray(entry.perceptions) && entry.perceptions.length);
  assert.ok(entry.demographics && Object.values(entry.demographics).some(Boolean));
  assert.equal(entry.cues?.length, expectedCues, `${dataset.id}: reviewed cue count changed.`);
  const assignedExperts = new Set();

  for (const [index, cue] of entry.cues.entries()) {
    for (const key of ['question', 'questionZh', 'answer', 'answerZh']) {
      assert.ok(cue[key]?.trim(), `${dataset.id} cue ${index + 1}: missing ${key}.`);
    }
    const kind = dataset.label === 'ATP142' && index === 1 ? 'illustrative'
      : dataset.label === 'ATP152' && index === 2 ? 'summary' : 'response';
    assert.equal(cue.kind, kind, `${dataset.id} cue ${index + 1}: incorrect source type.`);
    assert.ok(Array.isArray(cue.exampleExperts) && cue.exampleExperts.length >= 1 &&
      cue.exampleExperts.length <= 2 && new Set(cue.exampleExperts).size === cue.exampleExperts.length,
    `${dataset.id} cue ${index + 1}: show one or two distinct example experts.`);
    for (const expert of cue.exampleExperts) {
      assert.ok(expertNames.includes(expert), `${dataset.id}: unknown example expert ${expert}.`);
      assignedExperts.add(expert);
    }
    if (kind === 'illustrative') {
      assert.ok(!cue.fields || cue.fields.length === 0,
        'The illustrative example has no source answer or original-answer detail.');
    } else {
      assert.ok(Array.isArray(cue.fields) && cue.fields.length,
        `${dataset.id} cue ${index + 1}: source answers must be expandable.`);
      const fields = new Set();
      for (const field of cue.fields) {
        assert.ok(field.field && field.question?.trim() && field.answer?.trim());
        assert.ok(!fields.has(field.field), `${dataset.id}: duplicate source field.`);
        assert.notEqual(field.question, entry.question, `${dataset.id}: target answer leaked into a cue.`);
        fields.add(field.field);
        sourceAnswerCount++;
      }
    }
    cueCount++;
  }
  assert.deepEqual([...assignedExperts].sort(), [...expertNames].sort(),
    `${dataset.id}: its cue examples must include all three expert labels.`);
}
assert.ok(!/"(?:person_id|pid|prompt|original_cot)"\s*:/.test(raw),
  'Do not publish original participant IDs or full prompts.');
assert.ok(!/P\d{7}/.test(raw), 'Do not publish source participant IDs.');
console.log(`Method demo: ${ids.size} single cases, ${cueCount} cues, ${sourceAnswerCount} expandable source answers; exact CoTs, labels and public fields verified.`);
