/* Saved Method case studies. No model inference runs in the browser. */
(() => {
  const root = document.getElementById('method-demo');
  if (!root) return;

  const datasetSelect = root.querySelector('#demo-dataset');
  const status = root.querySelector('#demo-status');
  const content = root.querySelector('#demo-content');
  const result = root.querySelector('#demo-result');
  const facts = root.querySelector('#demo-profile-facts');
  const questionText = root.querySelector('#demo-question-text');
  const options = root.querySelector('#demo-options');
  const perceptionHeading = root.querySelector('#demo-perception-heading');
  const perceptionCount = root.querySelector('#demo-perception-count');
  const perceptions = root.querySelector('#demo-perceptions');
  const more = root.querySelector('#demo-more');
  const morePerceptions = root.querySelector('#demo-more-perceptions');
  const cues = root.querySelector('#demo-cues');
  const cot = root.querySelector('#demo-cot');
  const answer = root.querySelector('#demo-answer');
  const t = (key, params) => window.SiteI18n?.t(key, params) || key;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  let datasets = [];
  let selectedDataset = '';
  let loadState = 'loading';

  function cancelTransition() {
    animations.forEach(animation => animation.cancel());
    animations.clear();
  }

  function animateSelection() {
    if (reducedMotion?.matches || result.hidden) return;
    root.querySelectorAll('[data-demo-stage]').forEach((stage, index) => {
      if (!stage.animate) return;
      const animation = stage.animate(
        [{ opacity: 0, transform: 'translateY(7px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 420, delay: index * 155, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }
      );
      animations.add(animation);
      animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
    });
  }

  reducedMotion?.addEventListener('change', event => { if (event.matches) cancelTransition(); });

  function displayed(original, translated) {
    return window.SiteI18n?.language === 'zh' && translated ? translated : original;
  }

  function displayLanguage(translated) {
    return window.SiteI18n?.language === 'zh' && translated ? 'zh-CN' : 'en';
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

  function renderPerceptions(list, items) {
    list.replaceChildren();
    items.forEach(item => {
      const row = document.createElement('li');
      const question = document.createElement('span');
      const response = document.createElement('strong');
      question.textContent = displayed(item.question || item.field, item.questionZh);
      response.textContent = displayed(item.response, item.responseZh);
      question.lang = displayLanguage(item.questionZh);
      response.lang = displayLanguage(item.responseZh);
      row.append(question, response);
      list.append(row);
    });
  }

  function renderCues(record, openDetails) {
    cues.replaceChildren();
    record.cues.forEach((item, index) => {
      const row = document.createElement('li');
      row.className = 'demo-evidence-card';
      row.dataset.cueId = 'cue-' + (index + 1);
      const topic = document.createElement('p');
      topic.className = 'demo-evidence-topic';
      topic.textContent = displayed(item.question, item.questionZh);
      topic.lang = displayLanguage(item.questionZh);
      const value = document.createElement('p');
      value.className = 'demo-evidence-value';
      value.textContent = displayed(item.answer, item.answerZh);
      value.lang = displayLanguage(item.answerZh);
      row.append(topic, value);

      const meta = document.createElement('div');
      meta.className = 'demo-evidence-meta';
      if (item.kind === 'summary' || item.kind === 'illustrative') {
        const source = document.createElement('span');
        source.className = 'demo-evidence-source';
        source.textContent = t(item.kind === 'summary' ? 'demo.summarySource' : 'demo.illustrativeSource');
        meta.append(source);
      }
      if (item.exampleExperts?.length) {
        const experts = document.createElement('span');
        experts.className = 'demo-cue-experts';
        experts.setAttribute('role', 'group');
        experts.setAttribute('aria-label', t('demo.exampleExperts'));
        item.exampleExperts.forEach(name => {
          const badge = document.createElement('span');
          badge.className = 'demo-cue-expert';
          badge.textContent = name;
          experts.append(badge);
        });
        meta.append(experts);
      }
      if (meta.children.length) row.append(meta);

      if (item.fields.length) {
        const details = document.createElement('details');
        details.className = 'demo-evidence-original';
        details.open = openDetails.has(row.dataset.cueId);
        const summary = document.createElement('summary');
        summary.textContent = t('demo.singleSourceAnswers');
        details.append(summary);
        item.fields.forEach(field => {
          const original = document.createElement('p');
          original.textContent = field.question + ': ' + field.answer;
          original.lang = 'en';
          details.append(original);
        });
        row.append(details);
      }
      cues.append(row);
    });
  }

  function render({ animate = false, preserveDetails = false } = {}) {
    cancelTransition();
    const openDetails = new Set(preserveDetails
      ? [...root.querySelectorAll('.demo-evidence-original[open]')].map(element => element.parentElement.dataset.cueId)
      : []);
    const dataset = datasets.find(item => item.id === selectedDataset);
    const record = dataset?.case;
    datasetSelect.value = selectedDataset;
    if (!record) {
      content.hidden = true;
      status.hidden = false;
      status.classList.remove('sr-only');
      status.textContent = t('demo.unavailable');
      return;
    }

    content.hidden = false;
    status.hidden = false;
    status.classList.add('sr-only');
    status.textContent = t('demo.singleReady');
    facts.replaceChildren();
    addFact('demo.age', record.demographics.age);
    addFact('demo.gender', record.demographics.gender);
    addFact('demo.education', record.demographics.education);
    addFact('demo.country', record.demographics.country);
    questionText.textContent = displayed(record.question, record.questionZh);
    questionText.lang = displayLanguage(record.questionZh);
    options.replaceChildren();
    Object.entries(record.options).forEach(([number, label]) => {
      const item = document.createElement('li');
      const marker = document.createElement('span');
      marker.className = 'demo-option-number';
      marker.textContent = number + ' · ';
      const translated = record.optionsZh?.[number];
      item.append(marker, document.createTextNode(displayed(label, translated)));
      item.lang = displayLanguage(translated);
      options.append(item);
    });
    const visible = record.perceptions.slice(0, 4);
    const additional = record.perceptions.slice(4);
    renderPerceptions(perceptions, visible);
    renderPerceptions(morePerceptions, additional);
    perceptionHeading.hidden = !record.perceptions.length;
    perceptions.hidden = !record.perceptions.length;
    more.hidden = !additional.length;
    perceptionCount.textContent = t('demo.perceptionCount', { count: record.perceptions.length });
    renderCues(record, openDetails);
    cot.textContent = displayed(record.cot, record.cotZh);
    cot.lang = displayLanguage(record.cotZh);
    answer.replaceChildren();
    const number = document.createElement('span');
    number.className = 'demo-answer-number';
    number.textContent = record.answerId;
    const label = document.createElement('span');
    label.className = 'demo-answer-text';
    label.textContent = displayed(record.answer, record.answerZh);
    answer.append(number, document.createTextNode(' '), label);
    answer.lang = displayLanguage(record.answerZh);
    result.hidden = false;
    if (animate) animateSelection();
  }

  function verify(source) {
    if (!Array.isArray(source?.datasets) || source.datasets.length !== 8) throw new Error('Expected eight Method datasets');
    const ids = new Set();
    for (const dataset of source.datasets) {
      const record = dataset.case;
      if (!dataset.id || ids.has(dataset.id) || !dataset.label || dataset.mode !== 'single' ||
          !record?.question || !record.options ||
          record.options[String(record.answerId)] !== record.answer || !record.cot ||
          !record.demographics || !Array.isArray(record.perceptions) ||
          !Array.isArray(record.cues) || !record.cues.length) throw new Error('Invalid Method example');
      ids.add(dataset.id);
      for (const item of record.perceptions) {
        if (!item?.question || typeof item.response !== 'string') throw new Error('Invalid survey response');
      }
      for (const item of record.cues) {
        if (!['response', 'summary', 'illustrative'].includes(item?.kind) || !item.question || !item.answer ||
            !Array.isArray(item.fields) ||
            (item.exampleExperts !== undefined &&
              (!Array.isArray(item.exampleExperts) || item.exampleExperts.length < 1 ||
                item.exampleExperts.length > 2 || new Set(item.exampleExperts).size !== item.exampleExperts.length ||
                item.exampleExperts.some(name => !['EBM', 'LightGBM', 'MLP'].includes(name)))) ||
            (item.kind === 'illustrative' ? item.fields.length !== 0 :
              !item.fields.length || item.fields.some(field => !field?.field || !field.question || !field.answer))) {
          throw new Error('Invalid case cue');
        }
      }
    }
    return source.datasets;
  }

  datasetSelect.addEventListener('change', () => {
    selectedDataset = datasetSelect.value;
    more.open = false;
    render({ animate: true });
  });
  window.addEventListener('site:languagechange', () => {
    if (datasets.length) render({ preserveDetails: true });
    else status.textContent = t(loadState === 'failed' ? 'demo.loadError' : 'demo.loading');
  });

  fetch('assets/method-demo.json?v=20261124-method8-r2', { cache: 'no-store' })
    .then(response => { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); })
    .then(source => {
      datasets = verify(source);
      loadState = 'ready';
      selectedDataset = datasets[0].id;
      datasetSelect.replaceChildren();
      datasets.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.label;
        datasetSelect.append(option);
      });
      datasetSelect.disabled = false;
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
