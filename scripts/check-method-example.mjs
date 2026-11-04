import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = new URL('../assets/method-example.json', import.meta.url);
const raw = readFileSync(source, 'utf8');
const sample = JSON.parse(raw);
assert.equal(sample.default_k, 3, 'The author-confirmed default is K=3.');
assert.equal(sample.provenance.semantic_filter_run, false, 'Only the verified contribution output is published.');
assert.equal(sample.target.options[sample.observed_answer.id], sample.observed_answer.label);
assert.deepEqual(Object.keys(sample.experts).sort(), ['ebm', 'lgbm', 'mlp']);
assert.ok(!/"(?:person_id|profile|prompt|age|gender|location)"\s*:/.test(raw), 'Keep identity and the full input profile out of the public sample.');
for (const [name, expert] of Object.entries(sample.experts)) {
  assert.equal(expert.predicted_answer.id, sample.observed_answer.id, `${name}: retain only correct OOF predictions.`);
  assert.equal(expert.predicted_answer.label, sample.target.options[expert.predicted_answer.id]);
  assert.equal(expert.top_three.length, 3);
  const fields = new Set();
  expert.top_three.forEach((cue, index) => {
    assert.equal(cue.rank, index + 1);
    assert.ok(Number.isFinite(cue.contribution) && cue.contribution > 0);
    if (index) assert.ok(expert.top_three[index - 1].contribution >= cue.contribution);
    assert.equal(cue.selection_metric, 'target_contribution');
    assert.equal(cue.prompt_match_method, 'exact_value');
    assert.ok(cue.question && cue.response);
    assert.ok(cue.field.startsWith('perceived_') && cue.field !== 'perceived_CNCEXC_W152', 'The target response cannot enter the features.');
    assert.ok(!fields.has(cue.field), 'Each ranked field must be distinct.');
    fields.add(cue.field);
    assert.equal(cue.contribution_unit, name === 'mlp' ? 'accepted-class logit change' : 'accepted-class raw-score contribution');
  });
}
console.log('Method example: three independent, positive Top-3 rankings; answer, units and minimal public fields verified.');
