/* Source-backed respondent cards. No survey values are interpreted or translated here. */
(() => {
  const messages = () => window.SOCIAL_RESPONDENT_MESSAGES || {};
  const language = () => window.SiteI18n?.language || 'en';
  const t = (key, params = {}) => {
    const fromSite = window.SiteI18n?.t?.(`respondent.${key}`, params);
    const template = fromSite && fromSite !== `respondent.${key}`
      ? fromSite : messages()[language()]?.[key] || messages().en?.[key] || key;
    return template.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`);
  };
  const element = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined && value !== null) node.textContent = String(value);
    return node;
  };
  const localized = (tag, className, key) => {
    const node = element(tag, className, t(key));
    node.dataset.i18n = `respondent.${key}`;
    return node;
  };
  const appendField = (parent, label, value, name) => {
    const row = element('div', 'respondent-field');
    if (name) row.dataset.field = name;
    row.append(element('dt', '', label), element('dd', '', value));
    parent.append(row);
  };
  const safePoster = path => typeof path === 'string'
    && /^assets\/avatars\/[A-Za-z0-9_-]+(?:-preview)?\.png$/.test(path);
  const summaryQuestion = participant => participant?.target?.question || '';
  const matchingQuestion = (a, b) => Boolean(a && b && a.target?.questionId === b.target?.questionId
    && summaryQuestion(a) === summaryQuestion(b)
    && JSON.stringify(a.target?.options) === JSON.stringify(b.target?.options));

  function validateManifest(manifest) {
    if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.datasets)) throw new Error('Invalid showcase manifest');
    const seen = new Set();
    for (const group of manifest.datasets) {
      if (!group.datasetId || seen.has(group.datasetId)) throw new Error('Duplicate showcase dataset');
      seen.add(group.datasetId);
      if (!['pending', 'partial', 'ready'].includes(group.availability)) throw new Error('Invalid showcase status');
      if (!Array.isArray(group.participants)) throw new Error('Invalid showcase participants');
      if (group.availability === 'ready' && group.participants.length !== 2) throw new Error('Incomplete showcase pair');
      if (group.availability === 'pending' && group.participants.length) throw new Error('Pending showcase has participants');
      if (group.availability === 'partial' && group.participants.length !== 1) throw new Error('Invalid partial showcase');
      for (const person of group.participants) {
        if (person.datasetId !== group.datasetId || !person.displayId || !person.regionId
          || !safePoster(person.avatar?.posterPath) || !person.avatarIllustrative
          || !Array.isArray(person.demographics) || !Array.isArray(person.perceptions)
          || !person.target?.questionId || !person.target?.question
          || !Array.isArray(person.target?.options)) throw new Error('Invalid respondent entry');
        if (person.observedOptionId != null
          && !person.target.options.some(option => option.id === person.observedOptionId)) {
          throw new Error('Recorded answer is absent from options');
        }
      }
    }
    return manifest;
  }

  function mergeRecordedExamples(base, overlay) {
    validateManifest(base);
    if (overlay?.schemaVersion !== 1 || !Array.isArray(overlay.datasets)
      || overlay.datasets.length !== base.datasets.length) throw new Error('Invalid respondent CoT data');
    const groups = new Map();
    for (const group of overlay.datasets) {
      if (!group.datasetId || groups.has(group.datasetId) || !Array.isArray(group.participants)) {
        throw new Error('Duplicate or invalid respondent CoT dataset');
      }
      groups.set(group.datasetId, group);
    }
    const datasets = base.datasets.map(baseGroup => {
      const group = groups.get(baseGroup.datasetId);
      if (!group) throw new Error('Missing respondent CoT dataset');
      if (group.datasetId === 'GSS2022') {
        if (group.availability !== 'pending' || group.participants.length) {
          throw new Error('GSS2022 cannot show respondents without matching CoTs');
        }
        return { ...baseGroup, availability: 'pending', participants: [] };
      }
      if (group.availability !== 'ready' || group.participants.length !== 2) {
        throw new Error('Incomplete respondent CoT pair');
      }
      const artwork = new Map(baseGroup.participants.map(person => [person.displayId, person]));
      const seen = new Set();
      const participants = group.participants.map(person => {
        const visual = artwork.get(person.displayId);
        if (!visual || seen.has(person.displayId) || person.datasetId !== group.datasetId
          || !person.regionId || person.mapAnchor?.regionId !== person.regionId
          || !Array.isArray(person.demographics) || !Array.isArray(person.perceptions)
          || !person.target?.questionId || !person.target?.question
          || !Array.isArray(person.target?.options) || !person.target.options.length
          || !person.target.options.some(option => option.id === person.observedOptionId)
          || typeof person.cot !== 'string' || !person.cot.trim()
          || person.sourceRef?.source !== 'thinking_data_posttrain'
          || person.sourceRef?.targetQuestionId !== person.target.questionId
          || !person.sourceRef?.sourcePersonId || person.sourceRef?.split !== 'train') {
          throw new Error('Respondent CoT does not match an artwork slot or survey record');
        }
        seen.add(person.displayId);
        return { ...person, avatar: visual.avatar, avatarIllustrative: visual.avatarIllustrative };
      });
      if (seen.size !== artwork.size) throw new Error('Respondent artwork slots do not match CoT records');
      return { ...baseGroup, availability: 'ready', participants };
    });
    return validateManifest({ ...base, datasets });
  }

  function createRespondentExplorer({ host, store, onActivePersonChange } = {}) {
    if (!host) throw new Error('Respondent explorer host is missing');
    const controller = new AbortController();
    let manifest = null;
    let dataset = 'all';
    let visible = false;
    let activePersonId = '';
    let expandedById = new Map();
    let disposed = false;

    function groupFor(id = dataset) {
      return manifest?.datasets.find(group => group.datasetId === id);
    }
    function getParticipants(id = dataset) {
      return groupFor(id)?.participants || [];
    }
    function activeSlot() {
      const people = getParticipants();
      return people[1]?.displayId === activePersonId ? 'B' : 'A';
    }
    function fieldLabel(field) {
      const key = `field_${field.key}`;
      const localizedLabel = t(key);
      return localizedLabel === key ? field.label : localizedLabel;
    }
    function recordedAnswer(person) {
      return person.target.options.find(option => option.id === person.observedOptionId)?.text || '';
    }

    function questionBlock(people, shared) {
      const first = people[0];
      const block = element('section', 'respondent-question');
      block.dataset.shared = String(shared);
      block.append(localized('p', 'respondent-question-kicker', shared ? 'sharedQuestion' : 'question'));
      block.append(element('h3', 'respondent-question-text', first.target.question));
      const identifier = element('p', 'respondent-question-id', `${t('sourceQuestion')} · ${first.target.questionId}`);
      block.append(identifier);
      const options = element('ol', 'respondent-options');
      options.setAttribute('aria-label', t('answerOptions'));
      first.target.options.forEach(option => {
        const row = element('li', 'respondent-option');
        row.dataset.optionId = option.id;
        row.append(element('span', 'respondent-option-id', option.id));
        row.append(element('span', 'respondent-option-text', option.text));
        const selected = people
          .map((person, index) => person.observedOptionId === option.id ? (index === 0 ? 'A' : 'B') : '')
          .filter(Boolean);
        if (selected.length) {
          row.classList.add('is-observed');
          const marker = element('span', 'respondent-option-markers', selected.join(' · '));
          marker.setAttribute('aria-label', t('selectedBy', { people: selected.join(' and ') }));
          row.append(marker);
        }
        options.append(row);
      });
      block.append(options);
      return block;
    }

    function profileCard(person, index, sharedQuestion) {
      const slot = index === 0 ? 'A' : 'B';
      const card = element('article', 'respondent-card');
      card.dataset.personSlot = slot;
      card.dataset.personId = person.displayId;
      card.classList.toggle('is-active', activePersonId === person.displayId);
      const head = element('div', 'respondent-card-head');
      const avatar = element('img', 'respondent-avatar');
      avatar.src = person.avatar.posterPath;
      avatar.alt = t('illustrativeAvatar');
      avatar.loading = 'lazy';
      avatar.decoding = 'async';
      avatar.addEventListener('error', () => {
        avatar.remove();
        card.classList.add('is-avatar-unavailable');
      }, { once: true, signal: controller.signal });
      head.append(avatar);
      const heading = element('div', 'respondent-person-heading');
      heading.append(element('p', 'respondent-person-slot', `${t('respondentId')} · ${person.displayId}`));
      heading.append(element('h3', 'respondent-person-id', t(slot === 'A' ? 'personA' : 'personB')));
      heading.append(element('p', 'respondent-region', `${t('region')} · ${store?.regionName?.(person.regionId) || person.regionId}`));
      head.append(heading);
      card.append(head);

      const profile = element('section', 'respondent-profile');
      profile.append(localized('h4', '', 'profile'));
      const list = element('dl', 'respondent-profile-list');
      const priority = ['age_group', 'age', 'sex', 'education_level', 'work_status', 'household_income'];
      const fields = [...person.demographics].sort((a, b) => {
        const ai = priority.indexOf(a.key), bi = priority.indexOf(b.key);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      });
      const visibleFields = fields.filter(field => priority.includes(field.key)).slice(0, 4);
      for (const field of visibleFields) appendField(list, fieldLabel(field), field.value, field.key);
      profile.append(list);
      card.append(profile);

      const perceptions = element('section', 'respondent-perceptions');
      perceptions.append(localized('h4', '', 'perceptions'));
      const featured = element('dl', 'respondent-perceptions-list');
      for (const item of person.perceptions.slice(0, 3)) {
        appendField(featured, item.question, item.value, item.profileKey);
      }
      perceptions.append(featured);
      card.append(perceptions);

      const reasoning = element('section', 'respondent-cot');
      reasoning.append(localized('h4', '', 'cot'));
      const cot = element('p', 'respondent-cot-text', person.cot);
      cot.lang = 'en';
      reasoning.append(cot);
      card.append(reasoning);

      const answer = element('p', 'respondent-recorded-answer');
      answer.append(localized('span', 'respondent-recorded-label', 'recordedAnswer'));
      answer.append(element('strong', '', recordedAnswer(person)));
      card.append(answer);

      if (!sharedQuestion) card.append(questionBlock([person], false));

      const more = element('details', 'respondent-more');
      more.open = expandedById.get(person.displayId) || false;
      const summary = element('summary', '', t('showAll'));
      summary.dataset.expandSummary = person.displayId;
      more.append(summary);
      const moreProfile = element('section', 'respondent-more-profile');
      moreProfile.append(localized('h4', '', 'profile'));
      const moreList = element('dl', 'respondent-more-list');
      for (const field of fields) appendField(moreList, fieldLabel(field), field.value, field.key);
      moreProfile.append(moreList);
      more.append(moreProfile);
      const allViews = element('section', 'respondent-all-views');
      allViews.append(localized('h4', '', 'perceptions'));
      const views = element('dl', 'respondent-all-views-list');
      for (const item of person.perceptions) appendField(views, item.question, item.value, item.profileKey);
      allViews.append(views);
      more.append(allViews);
      more.addEventListener('toggle', () => {
        expandedById.set(person.displayId, more.open);
        summary.textContent = t(more.open ? 'showLess' : 'showAll');
      }, { signal: controller.signal });
      card.append(more);
      return card;
    }

    function render() {
      if (disposed) return;
      const focused = host.contains(document.activeElement) ? document.activeElement : null;
      const focusedPerson = focused?.dataset?.personId || focused?.dataset?.expandSummary;
      const focusedType = focused?.classList.contains('respondent-switch-button') ? 'switch'
        : focused?.tagName === 'SUMMARY' ? 'summary' : '';
      host.querySelectorAll('.respondent-card').forEach(card => {
        const detail = card.querySelector('.respondent-more');
        if (detail && card.dataset.personId) expandedById.set(card.dataset.personId, detail.open);
      });
      host.hidden = !visible;
      host.dataset.activePerson = activeSlot();
      if (!visible) return;
      host.replaceChildren();
      if (!manifest) {
        host.append(element('p', 'respondent-status', t('loading')));
        return;
      }
      const group = groupFor();
      const people = group?.participants || [];
      if (group?.availability !== 'ready' || people.length !== 2) {
        host.append(element('p', 'respondent-status', t('unavailable')));
        return;
      }
      const head = element('header', 'respondent-head');
      head.append(localized('p', 'respondent-kicker', 'kicker'));
      head.append(localized('h2', 'respondent-title', 'title'));
      head.append(element('p', 'respondent-dataset-name', dataset));
      host.append(head);
      const switcher = element('div', 'respondent-switch');
      switcher.setAttribute('role', 'group');
      switcher.setAttribute('aria-label', t('actionsAria'));
      people.forEach((person, index) => {
        const slot = index === 0 ? 'A' : 'B';
        const button = element('button', 'respondent-switch-button', t(index === 0 ? 'personA' : 'personB'));
        button.type = 'button';
        button.dataset.personId = person.displayId;
        button.setAttribute('aria-pressed', String(activeSlot() === slot));
        switcher.append(button);
      });
      host.append(switcher);
      const cards = element('div', 'respondent-cards');
      const shared = matchingQuestion(people[0], people[1]);
      people.forEach((person, index) => cards.append(profileCard(person, index, shared)));
      host.append(cards);
      if (shared) host.append(questionBlock(people, true));
      if (focusedPerson && focusedType) {
        const selector = focusedType === 'switch' ? '.respondent-switch-button' : 'summary[data-expand-summary]';
        [...host.querySelectorAll(selector)]
          .find(node => (node.dataset.personId || node.dataset.expandSummary) === focusedPerson)
          ?.focus({ preventScroll: true });
      }
    }

    function setDataset(nextDataset) {
      if (disposed) return;
      const changed = dataset !== nextDataset;
      dataset = nextDataset;
      const people = getParticipants();
      if (changed || !people.some(person => person.displayId === activePersonId)) {
        activePersonId = people[0]?.displayId || '';
      }
      render();
    }
    function setVisible(nextVisible) {
      if (disposed) return;
      visible = Boolean(nextVisible);
      render();
    }
    function setActivePerson(displayId) {
      if (disposed || !getParticipants().some(person => person.displayId === displayId)) return;
      if (activePersonId === displayId) return;
      const focusWithin = host.contains(document.activeElement);
      activePersonId = displayId;
      render();
      if (focusWithin) {
        [...host.querySelectorAll('.respondent-switch-button')]
          .find(button => button.dataset.personId === displayId)?.focus({ preventScroll: true });
      }
      onActivePersonChange?.(displayId);
    }
    const click = event => {
      const button = event.target.closest?.('.respondent-switch-button');
      if (button && host.contains(button)) setActivePerson(button.dataset.personId);
    };
    host.addEventListener('click', click, { signal: controller.signal });
    window.addEventListener('site:languagechange', render, { signal: controller.signal });
    const ready = Promise.all([
      fetch('assets/respondent-showcase.json?v=20261105-glb-r2', { signal: controller.signal }),
      fetch('assets/respondent-cots.json?v=20261105-cot-r1', { signal: controller.signal })
    ])
      .then(async responses => {
        if (responses.some(response => !response.ok)) throw new Error('Respondent records unavailable');
        const [base, overlay] = await Promise.all(responses.map(response => response.json()));
        return mergeRecordedExamples(base, overlay);
      })
      .then(data => {
        if (disposed) return;
        manifest = validateManifest(data);
        setDataset(dataset);
        return manifest;
      })
      .catch(error => {
        if (disposed || error.name === 'AbortError') return;
        manifest = { datasets: [] };
        render();
        throw error;
      });
    render();
    return {
      ready, setDataset, setVisible, getParticipants, setActivePerson,
      getActivePerson: () => activePersonId,
      hasReadyPair: id => {
        const group = groupFor(id);
        return group?.availability === 'ready' && group.participants.length === 2;
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        controller.abort();
        host.replaceChildren();
      }
    };
  }
  window.createRespondentExplorer = createRespondentExplorer;
})();
