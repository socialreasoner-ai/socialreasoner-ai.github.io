/* Grounded Method example. Structures remain schematic; cues come from local OOF attribution. */
(() => {
  window.__socialMethodExampleCleanup?.();
  const scriptUrl = new URL(document.currentScript?.src || document.baseURI);
  const dataUrl = new URL('./assets/method-example.json', scriptUrl);
  dataUrl.search = scriptUrl.search;
  const abort = new AbortController();
  const cueKeys = Object.freeze({
    perceived_AICHANGE_W152: 'overall',
    perceived_AIFUTRIMPCT_f_W152: 'arts',
    perceived_FUTRAI_d_W152: 'happiness',
    perceived_FUTRAI_b_W152: 'harm',
    perceived_AICONTROL2_W152: 'control',
    perceived_CHATAWARE_W152: 'chatbot',
    perceived_AICONCERN_g_W152: 'jobloss'
  });
  const expertNames = ['ebm', 'lgbm', 'mlp'];
  const t = (key, fallback = key) => window.SiteI18n?.t(key) || fallback;
  const make = (tag, className, value = '') => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    return node;
  };
  const bind = (node, key, fallback = key) => {
    if (!node) return;
    node.dataset.i18n = key;
    node.textContent = t(key, fallback);
  };

  function validate(data) {
    if (data?.kind !== 'real_contribution_example' || data.default_k !== 3 ||
        data.provenance?.semantic_filter_run !== false || !data.target?.question ||
        !data.observed_answer?.label) throw new Error('Invalid Method example metadata');
    for (const name of expertNames) {
      const expert = data.experts?.[name];
      if (!expert || expert.top_three?.length !== 3 ||
          expert.predicted_answer?.id !== data.observed_answer.id) {
        throw new Error(`Incomplete ${name} contribution example`);
      }
      expert.top_three.forEach((cue, index) => {
        const key = cueKeys[cue.field];
        if (!key || cue.rank !== index + 1 || !Number.isFinite(cue.contribution) ||
            cue.contribution <= 0 || !cue.question || !cue.response ||
            window.SOCIAL_I18N_MESSAGES?.en?.[`method.real.cue.${key}.question`] !== cue.question ||
            window.SOCIAL_I18N_MESSAGES?.en?.[`method.real.cue.${key}.response`] !== cue.response) {
          throw new Error(`Unmatched ${name} cue ${index + 1}`);
        }
      });
    }
  }

  function context(root, data) {
    const caption = root.querySelector('.ml-overview .ml-flow-caption');
    if (!caption) return;
    let block = root.querySelector('.ml-overview .ml-real-context');
    if (!block) {
      block = make('div', 'ml-real-context');
      const main = make('div', 'ml-real-context-main');
      main.append(make('p', 'ml-real-kicker'), make('span', 'ml-real-question-label'), make('p', 'ml-real-question'));
      const observed = make('div', 'ml-real-observed');
      observed.append(make('span', 'ml-real-observed-label'), make('strong', 'ml-real-observed-value'));
      block.append(main, observed);
      caption.after(block);
    }
    bind(block.querySelector('.ml-real-kicker'), 'method.real.kicker');
    bind(block.querySelector('.ml-real-question-label'), 'method.real.questionLabel');
    bind(block.querySelector('.ml-real-question'), 'method.real.targetQuestion', data.target.question);
    bind(block.querySelector('.ml-real-observed-label'), 'method.real.observed');
    bind(block.querySelector('.ml-real-observed-value'), `method.real.option.${data.observed_answer.id}`, data.observed_answer.label);
  }

  function renderOverview(root, data) {
    context(root, data);
    for (const name of expertNames) {
      const lane = root.querySelector(`.ml-lane[data-lane="${name}"]`);
      if (!lane) continue;
      bind(lane.querySelector('.ml-evidence-head small'), 'method.real.top3');
      bind(lane.querySelector('.ml-filter-label'), 'method.real.filterRule');
      bind(lane.querySelector('.ml-record-source [data-i18n]'), 'method.real.recordFormat');
      const list = lane.querySelector('.ml-cue-list');
      if (!list) continue;
      const items = data.experts[name].top_three.map(cue => {
        const key = `method.real.cue.${cueKeys[cue.field]}`;
        const item = make('li', 'ml-cue ml-real-cue');
        item.append(make('span', 'ml-cue-rank', String(cue.rank).padStart(2, '0')));
        const content = make('span', 'ml-real-cue-main');
        content.append(
          make('strong', 'ml-real-cue-short', t(`${key}.short`, cue.question)),
          make('span', 'ml-real-cue-response', `${t('method.real.response')}: ${t(`${key}.response`, cue.response)}`)
        );
        item.append(content);
        return item;
      });
      list.replaceChildren(...items);
    }
  }

  function panelInput(section, expert) {
    const panel = section.querySelector('[data-detail-panel="0"]');
    if (!panel) return;
    let block = panel.querySelector('.ml-real-input');
    if (!block) {
      block = make('div', 'ml-real-input');
      block.append(make('span', 'ml-real-input-title'), make('p', 'ml-real-input-question'),
        make('span', 'ml-real-input-fields-label'), make('ul', 'ml-real-input-fields'));
      panel.append(block);
    }
    bind(block.querySelector('.ml-real-input-title'), 'method.real.questionLabel');
    bind(block.querySelector('.ml-real-input-question'), 'method.real.targetQuestion');
    bind(block.querySelector('.ml-real-input-fields-label'), 'method.real.inputSubset');
    const fields = expert.top_three.map(cue => {
      const key = `method.real.cue.${cueKeys[cue.field]}`;
      const item = make('li', 'ml-real-input-field');
      item.append(
        make('span', '', t(`${key}.short`, cue.question)),
        make('strong', '', t(`${key}.response`, cue.response))
      );
      return item;
    });
    block.querySelector('.ml-real-input-fields').replaceChildren(...fields);
  }

  function panelPrediction(section, expert) {
    const panel = section.querySelector('[data-detail-panel="1"]');
    const diagram = panel?.querySelector('.ml-detail-diagram');
    if (!diagram) return;
    let block = panel.querySelector('.ml-real-prediction');
    if (!block) {
      block = make('div', 'ml-real-prediction');
      block.append(make('span', 'ml-real-prediction-label'), make('strong', 'ml-real-prediction-value'));
      diagram.after(block);
    }
    bind(block.querySelector('.ml-real-prediction-label'), 'method.real.prediction');
    bind(block.querySelector('.ml-real-prediction-value'), `method.real.option.${expert.predicted_answer.id}`, expert.predicted_answer.label);
  }

  function panelRanking(section, name, expert) {
    const panel = section.querySelector('[data-detail-panel="2"]');
    const tag = panel?.querySelector('.ml-example-tag');
    const list = panel?.querySelector('.ml-detail-cues');
    if (!tag || !list) return;
    tag.classList.add('ml-real-top3');
    bind(tag, 'method.real.top3');
    let unit = panel.querySelector('.ml-real-unit');
    if (!unit) {
      unit = make('span', 'ml-real-unit');
      tag.after(unit);
    }
    const unitKey = name === 'mlp' ? 'method.real.logitUnit' : 'method.real.rawUnit';
    bind(unit, unitKey);
    const items = expert.top_three.map(cue => {
      const key = `method.real.cue.${cueKeys[cue.field]}`;
      const item = make('li', 'ml-real-detail-cue');
      item.append(make('b', '', String(cue.rank).padStart(2, '0')));
      item.append(
        make('span', 'ml-real-detail-question', t(`${key}.question`, cue.question)),
        make('span', 'ml-real-detail-response', `${t('method.real.response')}: ${t(`${key}.response`, cue.response)}`),
        make('strong', 'ml-real-detail-score', `+${cue.contribution.toFixed(4)}`)
      );
      return item;
    });
    list.replaceChildren(...items);
  }

  function panelRule(section) {
    const panel = section.querySelector('[data-detail-panel="3"]');
    if (!panel) return;
    let label = panel.querySelector('.ml-real-rule-label');
    if (!label) {
      label = make('span', 'ml-real-rule-label');
      panel.querySelector('.ml-detail-body')?.before(label);
    }
    bind(label, 'method.real.filterRule');
    let flow = panel.querySelector('.ml-real-rule-flow');
    if (!flow) {
      const old = panel.querySelector('.ml-filter-demo');
      if (!old) return;
      flow = make('div', 'ml-real-rule-flow');
      old.replaceWith(flow);
    }
    flow.replaceChildren(
      make('span', 'ml-real-rule-node', t('lab.cuesTitle', 'Predictive cues')),
      make('span', 'ml-real-rule-arrow', '→'),
      make('span', 'ml-real-rule-node', t('lab.filter', 'Answer-blind cue filtering')),
      make('span', 'ml-real-rule-arrow', '→'),
      make('span', 'ml-real-rule-node', t('lab.detail.cueRetained', 'Retained cues'))
    );
    flow.querySelectorAll('.ml-real-rule-arrow').forEach(arrow => arrow.setAttribute('aria-hidden', 'true'));
  }

  function panelRecord(section) {
    const panel = section.querySelector('[data-detail-panel="4"]');
    if (!panel) return;
    let label = panel.querySelector('.ml-real-record-label');
    if (!label) {
      label = make('span', 'ml-real-record-label');
      panel.querySelector('.ml-detail-record')?.before(label);
    }
    bind(label, 'method.real.recordFormat');
  }

  function render(root, data) {
    // Only data content is replaced. Method mode, focused controls and active
    // detail stage belong to method-motion.js and are never recreated here.
    renderOverview(root, data);
    for (const name of expertNames) {
      const section = root.querySelector(`[data-expert-detail="${name}"]`);
      if (!section) continue;
      bind(section.querySelector('.ml-illustrative-note'), 'method.real.structure');
      const expert = data.experts[name];
      panelInput(section, expert);
      panelPrediction(section, expert);
      panelRanking(section, name, expert);
      panelRule(section);
      panelRecord(section);
    }
    root.classList.add('has-real-example');
    root.dataset.realExample = 'ready';
  }

  async function start() {
    const root = document.querySelector('.method-lab');
    if (!root) return;
    try {
      const response = await fetch(dataUrl, { signal: abort.signal });
      if (!response.ok) throw new Error(`Method example HTTP ${response.status}`);
      const data = await response.json();
      if (abort.signal.aborted) return;
      validate(data);
      render(root, data);
      window.addEventListener('site:languagechange', () => render(root, data), { signal: abort.signal });
    } catch (error) {
      if (error.name !== 'AbortError') console.warn('Method example unavailable; showing the schematic.', error);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true, signal: abort.signal });
  } else start();
  window.__socialMethodExampleCleanup = () => abort.abort();
})();
