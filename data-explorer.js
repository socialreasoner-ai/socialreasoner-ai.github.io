/* Survey portraits use the manuscript cohort and the surveys' own age categories. */
(() => {
  const nav = document.getElementById('portrait-nav');
  const panel = document.getElementById('data-portrait');
  const geography = document.getElementById('coverage-geography');
  if (!nav || !panel || !geography) return;

  const copy = {
    tabAges: 'Age profiles',
    tabEconomies: 'Economic groups',
    tabSurveys: 'Survey landscape',
    tabGeography: 'Geography',
    groupLabel: 'ECONOMY GROUP',
    groupAll: 'All economies',
    groupAdvanced: 'Advanced',
    groupEmerging: 'Emerging & developing',
    resetFilters: 'Reset filters',
    selectedRespondents: 'RESPONDENTS',
    surveyRegions: 'SURVEY REGIONS',
    knownAges: 'REPORTED AGES',
    agesTitle: 'Age profiles',
    agesAllSubtitle: 'Select a survey to explore its age profile.',
    agesDatasetSubtitle: 'Age groups reported in {dataset}.',
    ageCoverage: 'Share of respondents with age data.',
    ageKnown: 'Reported age',
    ageUnknown: 'Age unavailable',
    ageBinDetail: '{count} respondents · {share}% of reported ages',
    ageReportedCategories: 'Reported age categories',
    ageOtherRegions: 'Other regions',
    ageDenmark: 'Denmark',
    ageCardZoom: 'View {dataset} age profile',
    ageSelectBin: 'Show details for {age}',
    ageEmpty: 'No reported ages for this selection.',
    ageChartAria: 'Age profile for {dataset}',
    economyTitle: 'Economic groups',
    economySubtitle: 'Survey respondents by IMF WEO economy group.',
    economyAdvanced: 'Advanced economies',
    economyEmerging: 'Emerging and developing economies',
    economyRegionCount: '{count} regions',
    economyShare: '{share}% of selected respondents',
    economyTopRegions: 'Largest survey samples',
    economySource: 'IMF WEO · October 2026',
    economyEmpty: 'No respondents for this selection.',
    surveyTitle: 'Survey landscape',
    surveySubtitle: 'Compare sample sizes across nine surveys.',
    surveyRespondents: 'Respondents',
    surveyResponses: 'Responses',
    surveyResponsesUnavailable: 'Select all regions and economies to compare responses.',
    surveyDatasetClick: 'Filter to {dataset}',
    surveyEmpty: 'No respondents for this selection.',
    surveyCountRespondents: '{count} respondents',
    surveyCountResponses: '{count} responses',
    surveyAllDatasets: 'All datasets',
    selectedRegionLabel: 'Selected region: {region}'
  };
  const language = () => window.SiteI18n?.language || 'en';
  const t = (key, params = {}) => {
    const fullKey = 'portrait.' + key;
    const translated = window.SiteI18n?.t?.(fullKey, params);
    const source = translated && translated !== fullKey ? translated : (copy[key] || key);
    return String(source).replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match);
  };
  const number = value => window.SiteI18n?.number
    ? window.SiteI18n.number(value)
    : new Intl.NumberFormat(language()).format(value);
  const percent = value => window.SiteI18n?.number
    ? window.SiteI18n.number(value, { maximumFractionDigits: 1 })
    : new Intl.NumberFormat(language(), { maximumFractionDigits: 1 }).format(value);
  const element = (tag, className, value) => {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (value !== undefined) item.textContent = value;
    return item;
  };
  const svgElement = (tag, attrs = {}) => {
    const item = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([name, value]) => item.setAttribute(name, String(value)));
    return item;
  };

  let data = null;
  let svgSerial = 0;
  const waveDraws = new WeakMap();
  const waveObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(entries => entries.forEach(entry => waveDraws.get(entry.target)?.(entry.contentRect.width)))
    : null;
  const state = { view: 'ages', group: 'all', metric: 'respondents' };
  const views = [
    ['ages', 'tabAges'],
    ['economies', 'tabEconomies'],
    ['surveys', 'tabSurveys'],
    ['geography', 'tabGeography']
  ];
  const groups = [
    ['all', 'groupAll'],
    ['advanced', 'groupAdvanced'],
    ['emerging_developing', 'groupEmerging']
  ];
  const api = () => window.SocialCoverage;
  const currentSelection = () => api()?.getSelection?.() || { ready: false, dataset: 'all', selectedRegion: '' };
  const datasetName = id => data?.geoDatasets.get(id)?.label || id;
  const regionName = id => api()?.regionName?.(id) || data?.geoRegions.get(id)?.label || id;
  const ageLabel = bin => bin.id === 'under_18' ? '<18' : bin.label;
  const countFor = (region, datasetId) => datasetId === 'all'
    ? Number(region.count || 0)
    : Number(region.byDataset?.[datasetId] || 0);
  const belongs = (regionId, group) => group === 'all' || data?.economyMap.get(regionId) === group;
  const regionFits = (regionId, selection, group) =>
    (!selection.selectedRegion || selection.selectedRegion === regionId) && belongs(regionId, group);
  const regionRows = (selection, group, datasetId = selection.dataset) =>
    data.geography.regions
      .filter(region => regionFits(region.id, selection, group) && countFor(region, datasetId) > 0)
      .map(region => ({ id: region.id, count: countFor(region, datasetId), group: data.economyMap.get(region.id) }));
  const datasetCount = (datasetId, selection, group) =>
    regionRows(selection, group, datasetId).reduce((sum, row) => sum + row.count, 0);
  const scopeLabel = selection => selection.selectedRegion
    ? t('selectedRegionLabel', { region: regionName(selection.selectedRegion) })
    : selection.dataset === 'all' ? t('surveyAllDatasets') : datasetName(selection.dataset);

  function ageSchemes(dataset, selection, group) {
    const schemes = dataset.nativeSchemes?.length
      ? dataset.nativeSchemes
      : [{ id: 'reported', regionIds: dataset.regions.map(region => region.regionId), binIds: dataset.bins.map(bin => bin.id) }];
    const binIndex = new Map(dataset.bins.map((bin, index) => [bin.id, index]));
    return schemes.map(scheme => {
      const schemeRegions = new Set(scheme.regionIds);
      const selectedRows = dataset.regions.filter(region =>
        schemeRegions.has(region.regionId) && regionFits(region.regionId, selection, group));
      const bins = scheme.binIds.map(id => dataset.bins[binIndex.get(id)]).filter(Boolean);
      const counts = bins.map(bin => selectedRows.reduce((sum, region) =>
        sum + Number(region.counts[binIndex.get(bin.id)] || 0), 0));
      return {
        id: scheme.id,
        bins,
        counts,
        known: counts.reduce((sum, count) => sum + count, 0),
        unknown: selectedRows.reduce((sum, region) => sum + Number(region.unknown || 0), 0),
        regionIds: selectedRows.map(region => region.regionId)
      };
    }).filter(scheme => scheme.regionIds.length);
  }

  function knownAges(selection, group) {
    const datasets = selection.dataset === 'all'
      ? data.demographics.datasets
      : data.demographics.datasets.filter(item => item.id === selection.dataset);
    return datasets.reduce((sum, dataset) =>
      sum + ageSchemes(dataset, selection, group).reduce((schemeSum, scheme) => schemeSum + scheme.known, 0), 0);
  }

  function setView(view, focus) {
    state.view = view;
    render();
    if (focus) nav.querySelector('[data-portrait-view="' + view + '"]')?.focus({ preventScroll: true });
  }

  function renderNav() {
    nav.replaceChildren();
    nav.className = 'portrait-nav';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', t('tabAges'));
    views.forEach(([id, label]) => {
      const button = element('button', 'portrait-tab' + (state.view === id ? ' is-active' : ''), t(label));
      button.type = 'button';
      button.dataset.portraitView = id;
      button.id = 'portrait-tab-' + id;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', id === 'geography' ? 'coverage-geography' : 'data-portrait');
      button.setAttribute('aria-selected', String(state.view === id));
      button.tabIndex = state.view === id ? 0 : -1;
      button.addEventListener('click', () => setView(id, true));
      nav.append(button);
    });
  }

  nav.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const current = views.findIndex(([id]) => id === state.view);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1
      : (current + (event.key === 'ArrowRight' ? 1 : -1) + views.length) % views.length;
    event.preventDefault();
    setView(views[next][0], true);
  });

  function addToolbar(selection, main) {
    const toolbar = element('div', 'portrait-toolbar');
    const groupBox = element('div', 'portrait-group-box');
    groupBox.append(element('span', 'portrait-eyebrow', t('groupLabel')));
    const choices = element('div', 'portrait-segment');
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-label', t('groupLabel'));
    groups.forEach(([id, label]) => {
      const button = element('button', state.group === id ? 'is-active' : '', t(label));
      button.type = 'button';
      button.dataset.portraitGroup = id;
      button.setAttribute('aria-pressed', String(state.group === id));
      button.addEventListener('click', () => {
        state.group = id;
        if (id !== 'all') state.metric = 'respondents';
        render();
        panel.querySelector('[data-portrait-group="' + id + '"]')?.focus({ preventScroll: true });
      });
      choices.append(button);
    });
    groupBox.append(choices);
    toolbar.append(groupBox);
    const reset = element('button', 'portrait-reset', t('resetFilters'));
    reset.type = 'button';
    reset.addEventListener('click', () => {
      state.group = 'all';
      state.metric = 'respondents';
      api()?.setDataset?.('all');
      api()?.setRegion?.('');
      render();
      panel.querySelector('.portrait-reset')?.focus({ preventScroll: true });
    });
    toolbar.append(reset);
    main.append(toolbar);

    const rows = regionRows(selection, state.group);
    const metrics = element('div', 'portrait-metrics');
    [
      [t('selectedRespondents'), number(rows.reduce((sum, row) => sum + row.count, 0))],
      [t('surveyRegions'), number(rows.length)],
      [t('knownAges'), number(knownAges(selection, state.group))]
    ].forEach(([label, value]) => {
      const metric = element('div', 'portrait-metric');
      metric.append(element('span', '', label), element('strong', '', value));
      metrics.append(metric);
    });
    main.append(metrics);
  }

  function sectionHeading(title, subtitle, selection) {
    const header = element('div', 'portrait-section-heading');
    const textBox = element('div');
    textBox.append(element('span', 'portrait-kicker', scopeLabel(selection)));
    const titleNode = element('h3', '', t(title));
    titleNode.tabIndex = -1;
    textBox.append(titleNode);
    textBox.append(element('p', '', subtitle));
    header.append(textBox);
    return header;
  }

  function schemeLabel(dataset, scheme) {
    if (dataset.nativeSchemes?.length <= 1) return '';
    if (scheme.regionIds.length === 1) return regionName(scheme.regionIds[0]);
    if (scheme.id === 'denmark') return t('ageDenmark');
    if (scheme.id === 'standard') return t('ageOtherRegions');
    return t('ageOtherRegions');
  }

  function ageEmpty(unknown) {
    const empty = element('div', 'portrait-age-empty');
    empty.append(element('strong', '', t('ageUnknown')));
    if (unknown) empty.append(element('span', '', t('surveyCountRespondents', { count: number(unknown) })));
    empty.append(element('p', '', t('ageEmpty')));
    return empty;
  }

  function makeWave(dataset, scheme, compact) {
    const svg = svgElement('svg', {
      class: 'portrait-wave' + (compact ? ' is-compact' : ''),
      viewBox: '0 0 300 142',
      role: compact ? 'img' : 'group',
      'aria-label': t('ageChartAria', { dataset: datasetName(dataset.id) })
    });
    const gradientId = 'portrait-wave-gradient-' + (++svgSerial);
    const detail = compact ? null : element('div', 'portrait-age-detail');
    let lastWidth = 0;
    let activeIndex = scheme.counts.indexOf(Math.max(...scheme.counts));
    const draw = measuredWidth => {
      const width = Math.max(200, Math.round(measuredWidth || (compact ? 300 : 680)));
      if (width === lastWidth) return;
      lastWidth = width;
      const height = compact ? (width < 220 ? 153 : 142) : (width < 460 ? 272 : 256);
      const left = compact ? 17 : 52;
      const right = compact ? 15 : 24;
      const top = compact ? 14 : 24;
      const bottom = compact ? 47 : 58;
      const baseline = height - bottom;
      const plotHeight = baseline - top;
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.replaceChildren();
      const title = svgElement('title');
      title.textContent = t('ageChartAria', { dataset: datasetName(dataset.id) });
      svg.append(title);
      if (!scheme.known || !scheme.bins.length) return;
      const maxObserved = Math.max(...scheme.counts.map(count => count / scheme.known));
      const maxShare = Math.min(1, Math.max(0.2, Math.ceil(maxObserved * 11.2) / 10));
      const spacing = scheme.counts.length > 1
        ? (width - left - right) / (scheme.counts.length - 1)
        : width - left - right;
      const pts = scheme.counts.map((count, index) => ({
        x: left + (scheme.counts.length === 1 ? 0.5 : index / (scheme.counts.length - 1)) * (width - left - right),
        y: baseline - (count / scheme.known / maxShare) * plotHeight,
        count
      }));
      [0, 0.5, 1].forEach(fraction => {
        const y = baseline - fraction * plotHeight;
        svg.append(svgElement('line', {
          x1: left, x2: width - right, y1: y, y2: y, class: 'portrait-wave-grid'
        }));
        if (!compact) {
          const tick = svgElement('text', {
            x: left - 9, y: y + 3, 'text-anchor': 'end', class: 'portrait-wave-tick'
          });
          tick.textContent = percent(fraction * maxShare * 100) + '%';
          svg.append(tick);
        }
      });
      const defs = svgElement('defs');
      const gradient = svgElement('linearGradient', { id: gradientId, x1: '0', x2: '0', y1: '0', y2: '1' });
      gradient.append(
        svgElement('stop', { offset: '0%', 'stop-color': '#70d5ff', 'stop-opacity': compact ? '.26' : '.35' }),
        svgElement('stop', { offset: '100%', 'stop-color': '#6e65d5', 'stop-opacity': '0' })
      );
      defs.append(gradient);
      svg.append(defs);
      const curve = window.d3?.curveMonotoneX;
      const linePath = window.d3 && curve
        ? window.d3.line().x(point => point.x).y(point => point.y).curve(curve)(pts)
        : pts.map((point, index) => (index ? 'L' : 'M') + point.x + ',' + point.y).join(' ');
      const areaPath = window.d3 && curve
        ? window.d3.area().x(point => point.x).y0(baseline).y1(point => point.y).curve(curve)(pts)
        : linePath + 'L' + pts[pts.length - 1].x + ',' + baseline + 'L' + pts[0].x + ',' + baseline + 'Z';
      svg.append(svgElement('path', { d: areaPath, fill: 'url(#' + gradientId + ')', class: 'portrait-wave-area' }));
      svg.append(svgElement('path', { d: linePath, class: 'portrait-wave-line' }));
      const visiblePoints = [];
      const activate = index => {
        if (!detail) return;
        activeIndex = index;
        const bin = scheme.bins[index];
        const count = scheme.counts[index];
        detail.replaceChildren(
          element('strong', '', ageLabel(bin)),
          element('span', '', t('ageBinDetail', {
            count: number(count),
            share: percent(count / scheme.known * 100)
          }))
        );
        visiblePoints.forEach((point, pointIndex) => point.classList.toggle('is-active', pointIndex === index));
      };
      pts.forEach((point, index) => {
        const visible = svgElement('circle', {
          class: 'portrait-wave-point',
          cx: point.x, cy: point.y, r: compact ? 3.6 : 5.4
        });
        svg.append(visible);
        visiblePoints.push(visible);
        const label = ageLabel(scheme.bins[index]);
        const summary = label + ': ' + t('ageBinDetail', {
          count: number(point.count),
          share: percent(point.count / scheme.known * 100)
        });
        if (!compact) {
          const hitWidth = Math.min(40, Math.max(16, spacing - 2));
          const hit = svgElement('rect', {
            class: 'portrait-wave-hit',
            x: point.x - hitWidth / 2, y: point.y - 20,
            width: hitWidth, height: 40, rx: 5,
            tabindex: 0, role: 'button',
            'aria-label': t('ageSelectBin', { age: label }) + '. ' + summary
          });
          const hitTitle = svgElement('title');
          hitTitle.textContent = summary;
          hit.append(hitTitle);
          hit.addEventListener('mouseenter', () => activate(index));
          hit.addEventListener('focus', () => activate(index));
          hit.addEventListener('click', () => activate(index));
          hit.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              activate(index);
            }
          });
          svg.append(hit);
        } else {
          const pointTitle = svgElement('title');
          pointTitle.textContent = summary;
          visible.append(pointTitle);
        }
        const text = svgElement('text', {
          x: point.x, y: height - (compact ? 17 : 23),
          'text-anchor': 'middle', class: 'portrait-wave-label'
        });
        text.textContent = label;
        svg.append(text);
      });
      if (detail) activate(Math.max(0, activeIndex));
    };
    waveDraws.set(svg, draw);
    if (waveObserver) waveObserver.observe(svg);
    else requestAnimationFrame(() => draw(svg.getBoundingClientRect().width));
    if (!detail) return svg;
    const wrapper = element('div', 'portrait-wave-wrapper');
    wrapper.append(svg, detail);
    return wrapper;
  }

  function renderAges(selection, content) {
    const selected = selection.dataset === 'all' ? null : data.demoDatasets.get(selection.dataset);
    const subtitle = selected
      ? t('agesDatasetSubtitle', { dataset: datasetName(selected.id) })
      : t('agesAllSubtitle');
    content.append(sectionHeading('agesTitle', subtitle, selection));
    if (selected) {
      const schemeData = ageSchemes(selected, selection, state.group);
      if (!schemeData.length) {
        content.append(element('p', 'portrait-empty', t('surveyEmpty')));
      } else if (!schemeData.some(scheme => scheme.known)) {
        content.append(ageEmpty(schemeData.reduce((sum, scheme) => sum + scheme.unknown, 0)));
      } else {
        const stage = element('div', 'portrait-age-stage');
        schemeData.forEach(scheme => {
          const block = element('section', 'portrait-age-scheme');
          const schemeHeading = schemeLabel(selected, scheme);
          if (schemeHeading) block.append(element('h4', '', schemeHeading));
          if (scheme.known) block.append(makeWave(selected, scheme, false));
          else block.append(ageEmpty(scheme.unknown));
          stage.append(block);
        });
        content.append(stage);
      }
    } else {
      const grid = element('div', 'portrait-age-grid');
      data.demographics.datasets.forEach(dataset => {
        const button = element('button', 'portrait-age-card');
        button.type = 'button';
        button.setAttribute('aria-label', t('ageCardZoom', { dataset: datasetName(dataset.id) }));
        button.addEventListener('click', () => {
          api()?.setDataset?.(dataset.id);
          panel.querySelector('.portrait-section-heading h3')?.focus({ preventScroll: true });
        });
        const head = element('div', 'portrait-card-head');
        head.append(element('strong', '', datasetName(dataset.id)));
        const schemes = ageSchemes(dataset, selection, state.group);
        head.append(element('span', '', number(schemes.reduce((sum, scheme) => sum + scheme.known, 0))));
        button.append(head);
        if (!schemes.length) {
          button.append(element('span', 'portrait-empty', t('surveyEmpty')));
        } else if (!schemes.some(scheme => scheme.known)) {
          button.append(ageEmpty(schemes.reduce((sum, scheme) => sum + scheme.unknown, 0)));
        } else {
          schemes.forEach(scheme => {
            const label = schemeLabel(dataset, scheme);
            if (label) button.append(element('span', 'portrait-scheme-label', label));
            if (scheme.known) button.append(makeWave(dataset, scheme, true));
          });
        }
        grid.append(button);
      });
      content.append(grid);
    }
    const note = element('p', 'portrait-note');
    note.append(element('span', '', t('ageCoverage')));
    content.append(note);
  }

  function renderEconomies(selection, content) {
    const heading = sectionHeading('economyTitle', t('economySubtitle'), selection);
    const source = element('a', 'portrait-source', t('economySource'));
    source.href = data.economy.source.url;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    heading.append(source);
    content.append(heading);
    const rows = regionRows(selection, state.group);
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    if (!total) {
      content.append(element('p', 'portrait-empty', t('economyEmpty')));
      return;
    }
    const groupCards = element('div', 'portrait-economy-grid');
    [
      ['advanced', 'economyAdvanced'],
      ['emerging_developing', 'economyEmerging']
    ].forEach(([id, label]) => {
      const groupRows = rows.filter(row => row.group === id);
      const count = groupRows.reduce((sum, row) => sum + row.count, 0);
      const share = total ? count / total * 100 : 0;
      const card = element('article', 'portrait-economy-card is-' + id);
      card.append(element('span', 'portrait-economy-label', t(label)));
      card.append(element('strong', 'portrait-economy-number', number(count)));
      card.append(element('span', 'portrait-economy-meta', t('economyRegionCount', { count: number(groupRows.length) })));
      const track = element('div', 'portrait-economy-track');
      track.setAttribute('role', 'img');
      track.setAttribute('aria-label', t('economyShare', { share: percent(share) }));
      const fill = element('span', 'portrait-economy-fill');
      fill.style.width = share + '%';
      track.append(fill);
      card.append(track);
      card.append(element('span', 'portrait-economy-share', t('economyShare', { share: percent(share) })));
      groupCards.append(card);
    });
    content.append(groupCards);
    const ranking = element('section', 'portrait-ranking');
    ranking.append(element('h4', '', t('economyTopRegions')));
    const list = element('ol');
    const ranked = rows.sort((a, b) => b.count - a.count).slice(0, 8);
    const max = ranked[0]?.count || 1;
    ranked.forEach(row => {
      const item = element('li');
      const button = element('button', 'portrait-rank-row');
      button.type = 'button';
      button.addEventListener('click', () => {
        api()?.setRegion?.(row.id);
        document.getElementById('coverage-region')?.focus({ preventScroll: true });
      });
      button.append(element('span', 'portrait-rank-name', regionName(row.id)));
      const bar = element('span', 'portrait-rank-bar');
      const fill = element('span', 'portrait-rank-fill is-' + row.group);
      fill.style.width = row.count / max * 100 + '%';
      bar.append(fill);
      button.append(bar, element('strong', '', number(row.count)));
      item.append(button);
      list.append(item);
    });
    ranking.append(list);
    content.append(ranking);
  }

  function renderSurveys(selection, content) {
    const heading = sectionHeading('surveyTitle', t('surveySubtitle'), selection);
    const canShowResponses = !selection.selectedRegion && state.group === 'all';
    if (!canShowResponses) state.metric = 'respondents';
    const switcher = element('div', 'portrait-metric-switch');
    switcher.setAttribute('role', 'group');
    switcher.setAttribute('aria-label', t('surveyTitle'));
    [['respondents', 'surveyRespondents'], ['responses', 'surveyResponses']].forEach(([id, label]) => {
      const button = element('button', state.metric === id ? 'is-active' : '', t(label));
      button.type = 'button';
      button.dataset.portraitMetric = id;
      button.setAttribute('aria-pressed', String(state.metric === id));
      button.disabled = id === 'responses' && !canShowResponses;
      button.addEventListener('click', () => {
        state.metric = id;
        render();
        panel.querySelector('[data-portrait-metric="' + id + '"]')?.focus({ preventScroll: true });
      });
      switcher.append(button);
    });
    heading.append(switcher);
    content.append(heading);
    if (!canShowResponses) content.append(element('p', 'portrait-note portrait-response-note', t('surveyResponsesUnavailable')));
    const values = data.geography.datasets.map(dataset => ({
      id: dataset.id,
      value: state.metric === 'responses'
        ? Number(dataset.responses || 0)
        : datasetCount(dataset.id, selection, state.group)
    }));
    const max = Math.max(0, ...values.map(row => row.value));
    if (!max) {
      content.append(element('p', 'portrait-empty', t('surveyEmpty')));
      return;
    }
    const chart = element('div', 'portrait-survey-chart');
    values.forEach((row, index) => {
      const button = element('button', 'portrait-survey-row' + (selection.dataset === row.id ? ' is-selected' : ''));
      button.type = 'button';
      button.dataset.portraitSurveyDataset = row.id;
      button.setAttribute('aria-label', t('surveyDatasetClick', { dataset: datasetName(row.id) }) + '. ' +
        t(state.metric === 'responses' ? 'surveyCountResponses' : 'surveyCountRespondents', { count: number(row.value) }));
      button.addEventListener('click', () => {
        api()?.setDataset?.(row.id);
        panel.querySelector('[data-portrait-survey-dataset="' + row.id + '"]')?.focus({ preventScroll: true });
      });
      button.append(element('span', 'portrait-survey-index', String(index + 1).padStart(2, '0')));
      button.append(element('strong', 'portrait-survey-name', datasetName(row.id)));
      const track = element('span', 'portrait-survey-track');
      const fill = element('span', 'portrait-survey-fill');
      fill.style.width = row.value / max * 100 + '%';
      track.append(fill);
      button.append(track, element('span', 'portrait-survey-value', number(row.value)));
      chart.append(button);
    });
    content.append(chart);
  }

  function render() {
    if (!data) return;
    const selection = currentSelection();
    if (!selection.ready) return;
    waveObserver?.disconnect();
    nav.hidden = false;
    renderNav();
    geography.hidden = state.view !== 'geography';
    panel.hidden = state.view === 'geography';
    geography.setAttribute('role', 'tabpanel');
    geography.setAttribute('aria-labelledby', 'portrait-tab-geography');
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'portrait-tab-' + state.view);
    if (state.view === 'geography') return;
    panel.replaceChildren();
    addToolbar(selection, panel);
    const content = element('div', 'portrait-content');
    if (state.view === 'ages') renderAges(selection, content);
    else if (state.view === 'economies') renderEconomies(selection, content);
    else renderSurveys(selection, content);
    panel.append(content);
  }

  function validate(geographyData, economyData, demographicsData) {
    if (geographyData.schemaVersion !== 1 || economyData.schemaVersion !== 1 || demographicsData.schemaVersion !== 1 ||
      !Array.isArray(geographyData.datasets) || !Array.isArray(geographyData.regions) ||
      !Array.isArray(economyData.regions) || !Array.isArray(demographicsData.datasets)) {
      throw new Error('Invalid portrait data schema');
    }
    const geoDatasets = new Map(geographyData.datasets.map(dataset => [dataset.id, dataset]));
    const geoRegions = new Map(geographyData.regions.map(region => [region.id, region]));
    const economyMap = new Map(economyData.regions.map(region => [region.regionId, region.group]));
    const demoDatasets = new Map(demographicsData.datasets.map(dataset => [dataset.id, dataset]));
    if (geoDatasets.size !== 9 || demoDatasets.size !== geoDatasets.size ||
      [...geoDatasets.keys()].some(id => !demoDatasets.has(id)) ||
      [...geoRegions.keys()].some(id => !economyMap.has(id))) {
      throw new Error('Portrait datasets or economy regions do not match geography');
    }
    demographicsData.datasets.forEach(dataset => {
      if (!Array.isArray(dataset.bins) || !Array.isArray(dataset.regions) ||
        !Array.isArray(dataset.nativeSchemes) ||
        dataset.regions.some(region => !geoRegions.has(region.regionId) ||
          !Array.isArray(region.counts) || region.counts.length !== dataset.bins.length)) {
        throw new Error('Invalid age groups in ' + dataset.id);
      }
    });
    return { geography: geographyData, economy: economyData, demographics: demographicsData,
      geoDatasets, geoRegions, economyMap, demoDatasets };
  }

  const fetchJson = path => fetch(path, { credentials: 'same-origin' })
    .then(response => {
      if (!response.ok) throw new Error(path + ': ' + response.status);
      return response.json();
    });
  window.addEventListener('social:coveragechange', render);
  window.addEventListener('site:languagechange', render);
  if (!waveObserver) window.addEventListener('resize', () => {
    if (state.view === 'ages') render();
  });
  Promise.all([
    fetchJson('assets/geography.json?v=20261104-paper-cohort-r1'),
    fetchJson('assets/economy-groups.json?v=20261104-portrait-r1'),
    fetchJson('assets/demographics.json?v=20261104-portrait-r1')
  ]).then(([geographyData, economyData, demographicsData]) => {
    data = validate(geographyData, economyData, demographicsData);
    render();
  }).catch(error => {
    // The existing geography panel remains available if a portrait asset is missing.
    console.warn('Data portrait unavailable:', error);
  });
})();
