/* Saved, source-matched Method examples. No model inference runs in the browser. */
(() => {
  const root = document.getElementById('method-demo');
  if (!root) return;

  const modelIds = ['ebm', 'lgbm', 'mlp'];
  const datasetSelect = root.querySelector('#demo-dataset');
  const profileSelect = root.querySelector('#demo-profile');
  const questionSelect = root.querySelector('#demo-question');
  const modelButtons = [...root.querySelectorAll('[data-demo-model]')];
  const status = root.querySelector('#demo-status');
  const content = root.querySelector('#demo-content');
  const result = root.querySelector('#demo-result');
  const outputIntro = root.querySelector('#demo-output-intro');
  const facts = root.querySelector('#demo-profile-facts');
  const questionText = root.querySelector('#demo-question-text');
  const options = root.querySelector('#demo-options');
  const perceptionCount = root.querySelector('#demo-perception-count');
  const perceptions = root.querySelector('#demo-perceptions');
  const more = root.querySelector('#demo-more');
  const morePerceptions = root.querySelector('#demo-more-perceptions');
  const cot = root.querySelector('#demo-cot');
  const answer = root.querySelector('#demo-answer');
  const t = (key, params) => window.SiteI18n?.t(key, params) || key;
  const state = { dataset: '', profile: '', question: '', model: '' };
  let datasets = [];
  let loadState = 'loading';

  function current() {
    const dataset = datasets.find(item => item.id === state.dataset);
    const profile = dataset?.profiles?.find(item => item.id === state.profile);
    const record = profile?.records?.find(item => item.id === state.question);
    return { dataset, profile, record, expert: record?.experts?.[state.model] };
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
    const profile = dataset?.profiles.find(item => item.id === state.profile);
    datasetSelect.replaceChildren();
    datasets.forEach(item => addOption(datasetSelect, item.id, item.label));
    datasetSelect.value = state.dataset;
    profileSelect.replaceChildren();
    dataset?.profiles.forEach((item, index) => addOption(profileSelect, item.id, profileName(item, index)));
    profileSelect.value = state.profile;
    questionSelect.replaceChildren();
    profile?.records.forEach((item, index) => {
      const key = `demo.question.${dataset.id}.${item.questionId}`;
      const topic = t(key);
      addOption(questionSelect, item.id, `${index + 1}. ${topic === key ? item.question : topic}`);
    });
    questionSelect.value = state.question;
    datasetSelect.disabled = !datasets.length;
    profileSelect.disabled = !dataset?.profiles.length;
    questionSelect.disabled = !profile?.records.length;
    modelButtons.forEach(button => {
      button.disabled = !datasets.length;
      button.setAttribute('aria-pressed', String(button.dataset.demoModel === state.model));
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

  function renderPerception(list, items) {
    list.replaceChildren();
    items.forEach(item => {
      const row = document.createElement('li');
      const question = document.createElement('span');
      const response = document.createElement('strong');
      question.textContent = item.question || item.field;
      response.textContent = item.response;
      question.lang = 'en';
      response.lang = 'en';
      row.append(question, response);
      list.append(row);
    });
  }

  function render() {
    const { profile, record, expert } = current();
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
    const modelName = modelButtons.find(button => button.dataset.demoModel === state.model)?.textContent;
    status.textContent = modelName ? t('demo.modelSelected', { model: modelName }) : t('demo.selectionChanged');
    facts.replaceChildren();
    addFact('demo.age', profile.labelFields?.age);
    addFact('demo.gender', profile.labelFields?.gender);
    addFact('demo.education', profile.labelFields?.education);
    addFact('demo.country', profile.labelFields?.country);
    questionText.textContent = record.question;
    questionText.lang = 'en';
    options.replaceChildren();
    Object.entries(record.options || {}).forEach(([number, label]) => {
      const item = document.createElement('li');
      const marker = document.createElement('span');
      marker.className = 'demo-option-number';
      marker.textContent = `${number} · `;
      item.append(marker, document.createTextNode(label));
      item.lang = 'en';
      options.append(item);
    });
    const visible = record.perceptions.slice(0, 4);
    const additional = record.perceptions.slice(4);
    renderPerception(perceptions, visible);
    renderPerception(morePerceptions, additional);
    more.hidden = !additional.length;
    perceptionCount.textContent = t('demo.perceptionCount', { count: record.perceptions.length });
    cot.textContent = expert?.cot || '';
    cot.lang = 'en';
    answer.textContent = expert ? `${expert.answerId} · ${expert.answerLabel}` : '';
    answer.lang = 'en';
    result.hidden = !expert;
    outputIntro.hidden = !!expert;
  }

  function verify(source) {
    if (!Array.isArray(source?.datasets) || !source.datasets.length) throw new Error('No datasets');
    for (const dataset of source.datasets) {
      if (!dataset.id || !dataset.label || !Array.isArray(dataset.profiles) || !dataset.profiles.length) throw new Error('Invalid dataset');
      for (const profile of dataset.profiles) {
        if (!profile.id || !Array.isArray(profile.records) || !profile.records.length) throw new Error('Invalid profile');
        for (const record of profile.records) {
          if (!record.id || !record.question || !record.options || !Array.isArray(record.perceptions)) throw new Error('Invalid record');
          for (const model of modelIds) {
            const expert = record.experts?.[model];
            if (!expert?.cot || !expert.answerId || !expert.answerLabel || record.options[String(expert.answerId)] !== expert.answerLabel) throw new Error('Missing model record');
          }
        }
      }
    }
    return source.datasets;
  }

  datasetSelect.addEventListener('change', () => {
    state.dataset = datasetSelect.value;
    state.profile = datasets.find(item => item.id === state.dataset)?.profiles[0]?.id || '';
    state.question = current().profile?.records[0]?.id || '';
    more.open = false;
    render();
  });
  profileSelect.addEventListener('change', () => {
    const previousQuestion = current().record?.questionId;
    state.profile = profileSelect.value;
    const records = current().profile?.records || [];
    state.question = records.find(item => item.questionId === previousQuestion)?.id || records[0]?.id || '';
    more.open = false;
    render();
  });
  questionSelect.addEventListener('change', () => {
    state.question = questionSelect.value;
    more.open = false;
    render();
  });
  modelButtons.forEach(button => button.addEventListener('click', () => {
    state.model = button.dataset.demoModel;
    render();
  }));
  window.addEventListener('site:languagechange', () => {
    if (datasets.length) render();
    else status.textContent = t(loadState === 'failed' ? 'demo.loadError' : 'demo.loading');
  });

  fetch('assets/method-demo.json?v=20261105-demo-r1', { cache: 'no-store' })
    .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then(source => {
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
