/* Saved, source-matched Method examples. No model inference runs in the browser. */
(() => {
  const root = document.getElementById('method-demo');
  if (!root) return;

  const modelIds = ['ebm', 'lgbm', 'mlp'];
  const datasetSelect = root.querySelector('#demo-dataset');
  const profileSelect = root.querySelector('#demo-profile');
  const questionSelect = root.querySelector('#demo-question');
  const profileControl = root.querySelector('#demo-profile-control');
  const questionControl = root.querySelector('#demo-question-control');
  const modelControl = root.querySelector('#demo-model-controls');
  const modelButtons = [...root.querySelectorAll('[data-demo-model]')];
  const status = root.querySelector('#demo-status');
  const content = root.querySelector('#demo-content');
  const result = root.querySelector('#demo-result');
  const outputIntro = root.querySelector('#demo-output-intro');
  const facts = root.querySelector('#demo-profile-facts');
  const questionText = root.querySelector('#demo-question-text');
  const options = root.querySelector('#demo-options');
  const perceptionCount = root.querySelector('#demo-perception-count');
  const perceptionHeading = root.querySelector('#demo-perception-heading');
  const perceptionLabel = root.querySelector('#demo-perception-label');
  const perceptions = root.querySelector('#demo-perceptions');
  const more = root.querySelector('#demo-more');
  const morePerceptions = root.querySelector('#demo-more-perceptions');
  const cueSection = root.querySelector('#demo-cue-section');
  const outputHeading = root.querySelector('#demo-output-heading');
  const cues = root.querySelector('#demo-cues');
  const cueHeading = root.querySelector('#demo-cue-heading');
  const filteredCues = root.querySelector('#demo-filtered-cues');
  const filteredCuesSummary = root.querySelector('#demo-filtered-cues-summary');
  const filteredCueList = root.querySelector('#demo-filtered-cue-list');
  const supplemental = root.querySelector('#demo-supplemental');
  const supplementalEvidence = root.querySelector('#demo-supplemental-evidence');
  const cot = root.querySelector('#demo-cot');
  const traceHeading = root.querySelector('#demo-trace-heading');
  const answer = root.querySelector('#demo-answer');
  const answerHeading = root.querySelector('#demo-answer-heading');
  const t = (key, params) => window.SiteI18n?.t(key, params) || key;
  const state = { dataset: '', profile: '', question: '', model: '' };
  const modelNames = { ebm: 'EBM', lgbm: 'LightGBM', mlp: 'MLP' };
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  let datasets = [];
  let loadState = 'loading';

  function availableExpert(record, model) {
    const expert = record?.experts?.[model];
    return !!(expert?.cot && expert.answerId && expert.answerLabel &&
      record.options?.[String(expert.answerId)] === expert.answerLabel && Array.isArray(expert.cues));
  }

  function selectAvailableExpert(record) {
    if (!availableExpert(record, state.model)) {
      state.model = modelIds.find(model => availableExpert(record, model)) || '';
    }
  }

  function cancelTransition() {
    animations.forEach(animation => animation.cancel());
    animations.clear();
  }

  function animateSelection() {
    if (reducedMotion?.matches || result.hidden) return;
    const play = (element, keyframes, timing) => {
      if (!element?.animate) return;
      const animation = element.animate(keyframes, timing);
      animations.add(animation);
      animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
    };
    root.querySelectorAll('[data-demo-stage]').forEach((stage, index) => {
      play(stage, [{ opacity: 0, transform: 'translateY(7px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 420, delay: index * 155, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    });
    play(root.querySelector('.demo-flow-pulse'), [
      { top: '0%', opacity: 0 }, { top: '12%', opacity: .85, offset: .2 },
      { top: '85%', opacity: .65, offset: .8 }, { top: '100%', opacity: 0 }
    ], { duration: 780, easing: 'cubic-bezier(.25,.4,.35,1)' });
  }

  reducedMotion?.addEventListener('change', event => { if (event.matches) cancelTransition(); });

  function current() {
    const dataset = datasets.find(item => item.id === state.dataset);
    if (dataset?.mode === 'single') {
      const record = dataset.case;
      return { dataset, profile: { labelFields: record.demographics || {} }, record, expert: null, single: true };
    }
    const profile = dataset?.profiles?.find(item => item.id === state.profile);
    const record = profile?.records?.find(item => item.id === state.question);
    return { dataset, profile, record, expert: record?.experts?.[state.model], single: false };
  }

  function addOption(select, value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  }

  function profileName(profile, index) {
    const fields = profile.labelFields || {};
    const parts = [fields.age, fields.country].filter(Boolean);
    return `${t('demo.profileChoice', { index: index + 1 })}${parts.length ? ` · ${parts.join(' · ')}` : ''}`;
  }

  function populateControls() {
    const dataset = datasets.find(item => item.id === state.dataset);
    const single = dataset?.mode === 'single';
    const profile = single ? null : dataset?.profiles.find(item => item.id === state.profile);
    datasetSelect.replaceChildren();
    datasets.forEach(item => addOption(datasetSelect, item.id, item.label));
    datasetSelect.value = state.dataset;
    profileControl.hidden = single;
    questionControl.hidden = single;
    modelControl.hidden = single;
    profileSelect.replaceChildren();
    if (!single) dataset?.profiles.forEach((item, index) => addOption(profileSelect, item.id, profileName(item, index)));
    profileSelect.value = state.profile;
    questionSelect.replaceChildren();
    profile?.records.forEach((item, index) => {
      const key = `demo.question.${dataset.id}.${item.questionId}`;
      const topic = t(key);
      addOption(questionSelect, item.id, `${index + 1}. ${topic === key ? item.question : topic}`);
    });
    questionSelect.value = state.question;
    datasetSelect.disabled = !datasets.length;
    profileSelect.disabled = single || !dataset?.profiles.length;
    questionSelect.disabled = single || !profile?.records.length;
    modelButtons.forEach(button => {
      button.disabled = single || !availableExpert(current().record, button.dataset.demoModel);
      button.setAttribute('aria-pressed', String(!single && button.dataset.demoModel === state.model));
    });
  }

  function addFact(labelKey, value) {
    if (!value) return;
    const row = document.createElement('div');
    const label = document.createElement('dt');
    label.textContent = t(labelKey);
    const description = document.createElement('dd');
    description.textContent = value;
    description.lang = 'en';
    row.append(label, description);
    facts.append(row);
  }

  function displayed(original, translated) {
    return window.SiteI18n?.language === 'zh' && translated ? translated : original;
  }

  function displayLanguage(translated) {
    return window.SiteI18n?.language === 'zh' && translated ? 'zh-CN' : 'en';
  }

  function setHeading(element, key) {
    element.dataset.i18n = key;
    element.textContent = t(key);
  }

  function renderPerception(list, items, single = false) {
    list.replaceChildren();
    items.forEach(item => {
      const row = document.createElement('li');
      const question = document.createElement('span');
      const response = document.createElement('strong');
      question.textContent = single ? displayed(item.question || item.field, item.questionZh) : item.question || item.field;
      response.textContent = single ? displayed(item.response, item.responseZh) : item.response;
      question.lang = single ? displayLanguage(item.questionZh) : 'en';
      response.lang = single ? displayLanguage(item.responseZh) : 'en';
      row.append(question, response);
      list.append(row);
    });
  }

  // This presentation lookup is generated by exact source sentence reconstruction.
  // Each pair must also match the current record uniquely; otherwise use the full fact.
  const structuredEvidence = new Map();

  function renderCueList(list, items, record, openDetails = new Set()) {
    list.replaceChildren();
    items.forEach(item => {
      const row = document.createElement('li');
      row.dataset.cueId = item.id;
      row.className = 'demo-evidence-card';
      const source = document.createElement('span');
      source.className = 'demo-evidence-source';
      source.textContent = modelNames[state.model];
      const expected = structuredEvidence.get(item.fact);
      const matches = expected ? record.perceptions.filter(perception =>
        perception.question === expected.question && perception.response === expected.response) : [];
      if (matches.length === 1) {
        const topic = document.createElement('p');
        topic.className = 'demo-evidence-topic';
        topic.textContent = matches[0].question;
        topic.lang = 'en';
        const value = document.createElement('p');
        value.className = 'demo-evidence-value';
        value.textContent = matches[0].response;
        value.lang = 'en';
        row.append(topic, value);
      } else {
        row.classList.add('demo-evidence-fallback');
        const fact = document.createElement('p');
        fact.className = 'demo-cue-fact';
        fact.textContent = item.fact;
        fact.lang = 'en';
        row.append(fact);
      }
      const details = document.createElement('details');
      details.className = 'demo-evidence-original';
      details.open = openDetails.has(item.id);
      const summary = document.createElement('summary');
      summary.textContent = t('demo.evidenceDetails');
      const original = document.createElement('p');
      original.textContent = item.fact;
      original.lang = 'en';
      const number = document.createElement('span');
      number.className = 'demo-cue-number';
      number.textContent = `${t('demo.evidenceId')} · ${item.id}`;
      details.append(summary, number, original);
      row.append(source, details);
      list.append(row);
    });
  }

  function renderCues(expert, record, openDetails) {
    if (!cueSection) return;
    const items = expert?.cues || [];
    const evidence = expert?.supplementalEvidence || [];
    const retained = items.filter(item => item.retained);
    const filtered = items.filter(item => !item.retained);
    renderCueList(cues, retained, record, openDetails);
    if (expert && !retained.length) {
      const empty = document.createElement('li');
      empty.className = 'demo-cue-empty';
      empty.textContent = t('demo.noRetainedCues');
      cues.append(empty);
    }
    renderCueList(filteredCueList, filtered, record, openDetails);
    filteredCues.hidden = !filtered.length;
    filteredCuesSummary.textContent = t('demo.filteredCues', { count: filtered.length });
    supplementalEvidence.replaceChildren();
    evidence.forEach(item => {
      const row = document.createElement('li');
      row.textContent = item.fact;
      row.lang = 'en';
      supplementalEvidence.append(row);
    });
    supplemental.hidden = !evidence.length;
    cueSection.hidden = !expert;
  }

  function renderSingleCues(record, openDetails) {
    cues.replaceChildren();
    record.cues.forEach((item, index) => {
      const row = document.createElement('li');
      row.className = 'demo-evidence-card';
      row.dataset.cueId = `response-${index + 1}`;
      const topic = document.createElement('p');
      topic.className = 'demo-evidence-topic';
      topic.textContent = displayed(item.question, item.questionZh);
      topic.lang = displayLanguage(item.questionZh);
      const value = document.createElement('p');
      value.className = 'demo-evidence-value';
      value.textContent = displayed(item.answer, item.answerZh);
      value.lang = displayLanguage(item.answerZh);
      row.append(topic, value);
      if (item.kind === 'summary') {
        const source = document.createElement('span');
        source.className = 'demo-evidence-source';
        source.textContent = t('demo.summarySource');
        row.append(source);
      }
      const details = document.createElement('details');
      details.className = 'demo-evidence-original';
      details.open = openDetails.has(row.dataset.cueId);
      const summary = document.createElement('summary');
      summary.textContent = t('demo.singleSourceAnswers');
      details.append(summary);
      item.fields.forEach(field => {
        const original = document.createElement('p');
        original.textContent = `${field.question}: ${field.answer}`;
        original.lang = 'en';
        details.append(original);
      });
      row.append(details);
      cues.append(row);
    });
    filteredCueList.replaceChildren();
    filteredCues.hidden = true;
    supplementalEvidence.replaceChildren();
    supplemental.hidden = true;
    cueSection.hidden = false;
  }

  function resetDisclosure() {
    more.open = false;
    if (filteredCues) filteredCues.open = false;
  }

  function render({ animate = false, preserveDetails = false } = {}) {
    cancelTransition();
    const openDetails = new Set(preserveDetails ? [...root.querySelectorAll('.demo-evidence-original[open]')].map(element => element.parentElement.dataset.cueId) : []);
    if (!current().single) selectAvailableExpert(current().record);
    const { profile, record, expert, single } = current();
    root.dataset.mode = single ? 'single' : 'legacy';
    root.dataset.expert = single ? 'respondent' : state.model;
    populateControls();
    if (!profile || !record) {
      content.hidden = true;
      status.hidden = false;
      status.classList.remove('sr-only');
      status.textContent = t('demo.unavailable');
      return;
    }
    content.hidden = false;
    status.hidden = false;
    status.classList.add('sr-only');
    const modelName = modelNames[state.model];
    status.textContent = single ? t('demo.singleReady') : modelName ? t('demo.modelSelected', { model: modelName }) : t('demo.noExperts');
    setHeading(perceptionLabel, single ? 'demo.singlePerceptions' : 'demo.perceptions');
    setHeading(outputHeading, single ? 'demo.singleOutputHeading' : 'demo.outputHeading');
    setHeading(cueHeading, single ? 'demo.singleCues' : 'demo.cues');
    setHeading(traceHeading, single ? 'demo.singleReasoning' : 'demo.reasoning');
    setHeading(answerHeading, single ? 'demo.singleAnswer' : 'demo.answer');
    facts.replaceChildren();
    addFact('demo.age', profile.labelFields?.age);
    addFact('demo.gender', profile.labelFields?.gender);
    addFact('demo.education', profile.labelFields?.education);
    addFact('demo.country', profile.labelFields?.country);
    questionText.textContent = single ? displayed(record.question, record.questionZh) : record.question;
    questionText.lang = single ? displayLanguage(record.questionZh) : 'en';
    options.replaceChildren();
    Object.entries(record.options || {}).forEach(([number, label]) => {
      const item = document.createElement('li');
      const marker = document.createElement('span');
      marker.className = 'demo-option-number';
      marker.textContent = `${number} · `;
      const translated = single && record.optionsZh?.[number];
      item.append(marker, document.createTextNode(displayed(label, translated)));
      item.lang = single ? displayLanguage(translated) : 'en';
      options.append(item);
    });
    const visible = record.perceptions.slice(0, 4);
    const additional = record.perceptions.slice(4);
    renderPerception(perceptions, visible, single);
    renderPerception(morePerceptions, additional, single);
    perceptionHeading.hidden = single && !record.perceptions.length;
    perceptions.hidden = single && !record.perceptions.length;
    more.hidden = !additional.length;
    perceptionCount.textContent = t('demo.perceptionCount', { count: record.perceptions.length });
    if (single) renderSingleCues(record, openDetails);
    else renderCues(expert, record, openDetails);
    cot.textContent = single ? displayed(record.cot, record.cotZh) : expert?.cot || '';
    cot.lang = single ? displayLanguage(record.cotZh) : 'en';
    answer.replaceChildren();
    if (single || expert) {
      const number = document.createElement('span');
      number.className = 'demo-answer-number';
      number.textContent = single ? record.answerId : expert.answerId;
      const label = document.createElement('span');
      label.className = 'demo-answer-text';
      label.textContent = single ? displayed(record.answer, record.answerZh) : expert.answerLabel;
      answer.append(number, document.createTextNode(' '), label);
    }
    answer.lang = single ? displayLanguage(record.answerZh) : 'en';
    result.hidden = !single && !expert;
    outputIntro.hidden = single || !!expert;
    outputIntro.textContent = t('demo.noExperts');
    if (animate) animateSelection();
  }

  function verify(source) {
    if (!Array.isArray(source?.datasets) || !source.datasets.length) throw new Error('No datasets');
    for (const dataset of source.datasets) {
      if (dataset.mode === 'single') {
        const record = dataset.case;
        if (!dataset.id || !dataset.label || !record?.question || !record.options ||
            record.options[String(record.answerId)] !== record.answer || !record.cot ||
            !record.demographics || !Array.isArray(record.perceptions) ||
            !Array.isArray(record.cues) || !record.cues.length) throw new Error('Invalid single Method example');
        for (const item of record.perceptions) {
          if (!item?.question || typeof item.response !== 'string') throw new Error('Invalid perception');
        }
        for (const item of record.cues) {
          if (!['response', 'summary'].includes(item?.kind) || !item.question || !item.answer ||
              !Array.isArray(item.fields) || !item.fields.length ||
              item.fields.some(field => !field?.field || !field.question || !field.answer)) throw new Error('Invalid respondent evidence');
        }
        continue;
      }
      if (!dataset.id || !dataset.label || !Array.isArray(dataset.profiles) || !dataset.profiles.length) throw new Error('Invalid dataset');
      for (const profile of dataset.profiles) {
        if (!profile.id || !Array.isArray(profile.records) || !profile.records.length) throw new Error('Invalid profile');
        for (const record of profile.records) {
          if (!record.id || !record.question || !record.options || !Array.isArray(record.perceptions)) throw new Error('Invalid record');
          for (const model of modelIds) {
            const expert = record.experts?.[model];
            if (expert === undefined || expert === null) continue;
            if (!expert?.cot || !expert.answerId || !expert.answerLabel || record.options[String(expert.answerId)] !== expert.answerLabel) throw new Error('Missing model record');
            if (!Array.isArray(expert.cues)) throw new Error('Missing model cues');
            const cueIds = new Set();
            for (const cue of expert.cues) {
              if (!cue || typeof cue.id !== 'string' || !cue.id.trim() || cueIds.has(cue.id) || typeof cue.fact !== 'string' || !cue.fact.trim() || typeof cue.retained !== 'boolean') throw new Error('Invalid model cue');
              cueIds.add(cue.id);
            }
            if (expert.supplementalEvidence !== undefined && (!Array.isArray(expert.supplementalEvidence) || expert.supplementalEvidence.some(item => !item || typeof item.fact !== 'string' || !item.fact.trim()))) throw new Error('Invalid supplemental evidence');
          }
        }
      }
    }
    return source.datasets;
  }

  datasetSelect.addEventListener('change', () => {
    state.dataset = datasetSelect.value;
    const dataset = datasets.find(item => item.id === state.dataset);
    state.profile = dataset?.mode === 'single' ? '' : dataset?.profiles[0]?.id || '';
    state.question = dataset?.mode === 'single' ? '' : current().profile?.records[0]?.id || '';
    resetDisclosure();
    render({ animate: true });
  });
  profileSelect.addEventListener('change', () => {
    if (current().single) return;
    const previousQuestion = current().record?.questionId;
    state.profile = profileSelect.value;
    const records = current().profile?.records || [];
    state.question = records.find(item => item.questionId === previousQuestion)?.id || records[0]?.id || '';
    resetDisclosure();
    render({ animate: true });
  });
  questionSelect.addEventListener('change', () => {
    if (current().single) return;
    state.question = questionSelect.value;
    resetDisclosure();
    render({ animate: true });
  });
  modelButtons.forEach(button => button.addEventListener('click', () => {
    if (!availableExpert(current().record, button.dataset.demoModel) || state.model === button.dataset.demoModel) return;
    state.model = button.dataset.demoModel;
    if (filteredCues) filteredCues.open = false;
    render({ animate: true });
  }));
  window.addEventListener('site:languagechange', () => {
    if (datasets.length) render({ preserveDetails: true });
    else status.textContent = t(loadState === 'failed' ? 'demo.loadError' : 'demo.loading');
  });

  Promise.all([
    fetch('assets/method-demo.json?v=20261124-method7-r1', { cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); }),
    fetch('assets/method-evidence-display.json?v=20261124-method7-r1')
      .then(response => response.ok ? response.json() : null).catch(() => null)
  ])
    .then(([source, display]) => {
      if (display?.version === 1 && Array.isArray(display.entries)) {
        for (const item of display.entries) {
          if (typeof item.fact === 'string' && typeof item.question === 'string' && typeof item.response === 'string') {
            structuredEvidence.set(item.fact, item);
          }
        }
      }
      datasets = verify(source);
      loadState = 'ready';
      state.dataset = datasets[0].id;
      state.profile = datasets[0].profiles[0].id;
      state.question = datasets[0].profiles[0].records[0].id;
      render();
    })
    .catch(error => {
      loadState = 'failed';
      console.error('Method examples could not be loaded:', error);
      content.hidden = true;
      status.hidden = false;
      status.classList.remove('sr-only');
      status.textContent = t('demo.loadError');
    });
})();
