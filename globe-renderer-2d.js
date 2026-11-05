/* The original D3 globe remains the readable fallback and owns the coverage controls. */
export function createGlobeRenderer2d({ canvas, host: hero, store, onHeroDataset, onCoverageAction, onResetView, onRotationChange, onTouchRotateChange }) {
  const aborter = typeof AbortController === 'function' ? new AbortController() : null;
  const on = (target, type, handler, options = {}) => target?.addEventListener?.(
    type, handler, aborter ? { ...options, signal: aborter.signal } : options);
  const language = () => window.SiteI18n?.language || 'en';
  const translate = (key, params = {}) => {
    if (window.SiteI18n?.t) return window.SiteI18n.t(`globe.${key}`, params);
    const copy = window.SOCIAL_GLOBE_MESSAGES?.[language()]?.[key]
      || window.SOCIAL_GLOBE_MESSAGES?.en?.[key] || key;
    return copy.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`);
  };
  const formatNumber = value => window.SiteI18n?.number
    ? window.SiteI18n.number(value) : new Intl.NumberFormat(language()).format(value);
  const clockNow = () => typeof performance === 'undefined' ? Date.now() : performance.now();
  const countryCodes = {
    USA: 'US', ZAF: 'ZA', CHE: 'CH', FRA: 'FR', DEU: 'DE', PHL: 'PH', DNK: 'DK', RUS: 'RU',
    CZE: 'CZ', NOR: 'NO', JPN: 'JP', ISL: 'IS', FIN: 'FI', HRV: 'HR', SWE: 'SE', SVN: 'SI',
    AUT: 'AT', ESP: 'ES', SVK: 'SK', AUS: 'AU', POL: 'PL', LTU: 'LT', ISR: 'IL', HUN: 'HU',
    GEO: 'GE', ITA: 'IT', BEL: 'BE', CHL: 'CL', NZL: 'NZ', IND: 'IN', LVA: 'LV', THA: 'TH',
    VEN: 'VE', SUR: 'SR', BGR: 'BG', UKR: 'UA', EST: 'EE', TUR: 'TR', KOR: 'KR', NLD: 'NL',
    MEX: 'MX', AZE: 'AZ', BIH: 'BA', ARM: 'AM', PRT: 'PT', ALB: 'AL', ROU: 'RO', BLR: 'BY',
    SRB: 'RS', ARG: 'AR', MKD: 'MK', CYP: 'CY', MNE: 'ME'
  };
  const displayNames = new Map();
  function regionName(region) { return store.regionName(region?.id); }

  if (!canvas || !hero) throw new Error('Globe canvas unavailable');
  let ctx = null;
  try { ctx = canvas.getContext('2d'); } catch { /* Filters remain available without canvas. */ }
  const visualReady = Boolean(ctx && window.d3 && window.topojson);

  const selects = [document.querySelector('#hero-dataset'), document.querySelector('#coverage-dataset')];
  const regionSelect = document.querySelector('#coverage-region');
  const heroRegionSelect = document.querySelector('#globe-region-select');
  const tooltip = document.querySelector('#globe-tooltip');
  const overlapPicker = document.querySelector('#globe-overlap-picker');
  const inspector = document.querySelector('.globe-inspector');
  const distribution = document.querySelector('#globe-region-distribution');
  const rotationControl = document.querySelector('#globe-control-rotation');
  const resetControl = document.querySelector('#globe-control-reset');
  const clearControl = document.querySelector('#globe-control-clear');
  const interactionControl = document.querySelector('#globe-control-interaction');
  const viewDataLink = document.querySelector('#globe-view-data');
  const chartList = document.querySelector('#coverage-list');
  const coverageControls = document.querySelector('.coverage-controls');
  const coverageSummary = document.querySelector('.coverage-summary');
  const coverageListHead = document.querySelector('.coverage-list-head');
  const labelTitle = document.querySelector('#globe-region-name');
  const labelCount = document.querySelector('#globe-region-count');
  const labelKicker = document.querySelector('#globe-region-kicker');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const forceReduced = new URLSearchParams(window.location?.search || '').get('motion') === 'reduce';
  const motionReduced = () => reduceMotion.matches || forceReduced;
  const defaultRotation = [-20, -15, 0];
  const state = {
    data: null, countries: [], countryByNumeric: new Map(), regionByNumeric: new Map(), regionById: new Map(),
    dataset: 'all', selected: null, hovered: null, rotation: [...defaultRotation],
    spinning: !motionReduced() && visualReady, dragging: false, down: null, touchRotate: false,
    flight: null, pulseUntil: 0, maxRegionCount: 1, datasetIndex: new Map(),
    width: 0, height: 0, radius: 0, projection: null, path: null,
    lastFrame: 0, visible: true, dirty: true
  };
  let listedDataset = null;
  let listedLanguage = null;
  const listedButtons = new Map();
  let coverageMap = null;
  let coverageMapTitle = null;
  let coverageMapSvg = null;
  let coverageMapPaths = [];
  let coverageMapMarkers = [];
  let viewportObserver = null;
  let resizeObserver = null;
  let externallyPaused = false;
  let disposed = false;

  const validCount = value => Number.isInteger(value) && value >= 0;
  const sampleFor = (region, dataset = state.dataset) => store.sampleFor(region, dataset);
  const countFor = region => sampleFor(region).count;
  const visibleRegions = () => state.data.regions.filter(region => countFor(region) > 0);
  const selectedDataset = () => state.data.datasets.find(item => item.id === state.dataset);
  const selectedTotal = () => state.dataset === 'all' ? state.data.totalRespondents : selectedDataset()?.respondents;
  const numericKey = value => String(Number(value));
  // Map presentation can link survey regions while their respondent counts remain separate.
  const highlightGroup = region => region?.highlightGroup || region?.id;
  const sharesHighlight = (region, active) => Boolean(region && active && highlightGroup(region) === highlightGroup(active));
  const markerRadius = count => validCount(count) && count > 0
    ? 2 + 3 * Math.sqrt(count / state.maxRegionCount) : 0;
  const sampleLabel = sample => sample.status === 'none' ? translate('noRespondents')
    : sample.status === 'unknown' ? translate('unknownCount')
    : translate('respondentCount', { count: formatNumber(sample.count) });

  function syncDataset(value) { onCoverageAction?.(); store.setDataset(value); }
  function selectRegion(id) { onCoverageAction?.(); store.setRegion(id); }
  function applySelection(selection, { intent } = {}) {
    if (!state.data) return;
    const oldDataset = state.dataset;
    const oldRegion = state.selected?.id || '';
    state.dataset = selection.dataset;
    state.selected = store.getRegion(selection.selectedRegion);
    selects.forEach(select => { if (select) select.value = state.dataset; });
    regionSelect.value = state.selected?.id || '';
    if (heroRegionSelect) heroRegionSelect.value = state.selected?.id || '';
    state.hovered = null;
    tooltip.hidden = true;
    if (overlapPicker) overlapPicker.hidden = true;
    if (oldRegion !== selection.selectedRegion && state.selected) {
      state.spinning = false;
      state.pulseUntil = motionReduced() ? 0 : clockNow() + 900;
      focusRegion(state.selected);
    } else if (oldRegion !== selection.selectedRegion && !state.selected) {
      state.flight = null;
      state.pulseUntil = 0;
      updateMotion();
    } else if (oldDataset !== state.dataset) {
      if (state.selected && sampleFor(state.selected).status === 'covered') focusRegion(state.selected);
      else focusDataset();
    }
    updatePanels();
    draw();
  }

  function clearSelection() { selectRegion(''); }

  function resetView() {
    state.spinning = false;
    state.hovered = null;
    tooltip.hidden = true;
    if (overlapPicker) overlapPicker.hidden = true;
    flyTo(defaultRotation);
    updatePanels();
    onResetView?.();
  }

  function toggleRotation() {
    state.flight = null;
    state.spinning = motionReduced() ? false : !state.spinning;
    state.pulseUntil = 0;
    updateControls();
    updateMotion();
    draw();
    onRotationChange?.(state.spinning);
  }

  function updateControls() {
    if (rotationControl) {
      const key = state.spinning ? 'pause' : 'resume';
      rotationControl.setAttribute('aria-label', translate(state.spinning ? 'pauseRotation' : 'resumeRotation'));
      rotationControl.setAttribute('aria-pressed', String(state.spinning));
      rotationControl.disabled = motionReduced() || !visualReady;
      const label = rotationControl.querySelector('[data-globe-label]');
      if (label) label.textContent = translate(key);
      else rotationControl.textContent = translate(key);
    }
    if (resetControl) {
      resetControl.setAttribute('aria-label', translate('resetView'));
      const label = resetControl.querySelector('[data-globe-label]');
      if (label) label.textContent = translate('resetView');
      else resetControl.textContent = translate('resetView');
    }
    if (clearControl) {
      clearControl.disabled = !state.selected;
      clearControl.setAttribute('aria-label', translate('clearSelection'));
      const label = clearControl.querySelector('[data-globe-label]');
      if (label) label.textContent = translate('clearSelection');
      else clearControl.textContent = translate('clearSelection');
    }
    if (interactionControl) {
      const key = state.touchRotate ? 'touchScroll' : 'touchRotate';
      interactionControl.setAttribute('aria-label', translate(key));
      interactionControl.setAttribute('aria-pressed', String(state.touchRotate));
      interactionControl.disabled = !visualReady;
      const label = interactionControl.querySelector('[data-globe-label]');
      if (label) label.textContent = translate(key);
      else interactionControl.textContent = translate(key);
    }
    hero.classList.toggle('is-touch-rotate', state.touchRotate);
  }

  function updateControlCopy() {
    hero.querySelector('.globe-controls')?.setAttribute('aria-label', translate('controls'));
    if (viewDataLink) {
      viewDataLink.setAttribute('aria-label', translate('viewData'));
      const label = viewDataLink.querySelector('[data-globe-label]');
      if (label) label.textContent = translate('viewData');
      else if (viewDataLink.firstChild?.nodeType === 3) viewDataLink.firstChild.textContent = `${translate('viewData')} `;
    }
    if (distribution) distribution.setAttribute('aria-label', translate('distribution'));
    if (heroRegionSelect) {
      heroRegionSelect.setAttribute('aria-label', translate('allRegionOptions'));
      const label = hero.querySelector('label[for="globe-region-select"]');
      if (label) label.textContent = translate('regionFilter');
    }
    hero.querySelectorAll('[data-globe-label]').forEach(label => {
      const key = label.dataset.globeLabel;
      if (!['pause', 'resume', 'touchRotate', 'touchScroll'].includes(key)) label.textContent = translate(key);
    });
  }

  function updateDistribution() {
    if (!distribution || !state.data) return;
    distribution.hidden = !state.selected;
    distribution.replaceChildren();
    if (!state.selected) return;
    state.data.datasets.forEach(dataset => {
      const sample = sampleFor(state.selected, dataset.id);
      const row = document.createElement('li');
      row.className = `globe-distribution-row is-${sample.status}`;
      const name = document.createElement('span');
      name.textContent = dataset.label;
      const count = document.createElement('strong');
      count.textContent = sample.status === 'covered' ? formatNumber(sample.count)
        : sample.status === 'none' ? '0' : translate('unknownCount');
      row.append(name, count);
      distribution.append(row);
    });
  }

  function updatePanels() {
    if (!state.data) return;
    const regions = visibleRegions();
    const total = selectedTotal();
    const datasetText = state.dataset === 'all' ? translate('allDatasets') : state.dataset;
    labelKicker.textContent = `${datasetText} / ${translate(state.selected ? 'selectedRegion' : 'coverage')}`;
    labelTitle.textContent = state.selected ? regionName(state.selected) : translate('worldCoverage');
    const selectedSample = state.selected ? sampleFor(state.selected) : null;
    labelCount.textContent = state.selected
      ? sampleLabel(selectedSample)
      : `${translate('respondentCount', { count: validCount(total) ? formatNumber(total) : translate('unknownCount') })} · ${formatNumber(regions.length)} ${translate(regions.length === 1 ? 'regionSingle' : 'regionPlural')}`;
    document.querySelector('#coverage-total').textContent = validCount(total) ? formatNumber(total) : translate('unknownCount');
    document.querySelector('#coverage-regions').textContent = formatNumber(regions.length);
    document.querySelector('#coverage-selected').textContent = state.selected
      ? `${regionName(state.selected)} · ${selectedSample.status === 'covered' ? formatNumber(selectedSample.count) : sampleLabel(selectedSample)}` : translate('allRegions');
    if (inspector) {
      inspector.classList.toggle('is-selected', Boolean(state.selected));
      inspector.classList.toggle('is-no-sample', selectedSample?.status === 'none');
      inspector.classList.toggle('is-unknown', selectedSample?.status === 'unknown');
    }
    if (viewDataLink) viewDataLink.hidden = !state.selected;
    updateDistribution();
    updateControls();
    updateControlCopy();
    if (listedDataset !== state.dataset || listedLanguage !== language()) rebuildRegionList(regions);
    for (const [id, button] of listedButtons) {
      const selected = id === state.selected?.id;
      button.className = 'coverage-row' + (selected ? ' is-selected' : '');
      button.setAttribute('aria-pressed', String(selected));
    }
    updateCoverageMap();
  }

  function rebuildRegionList(regions) {
    const focusedRegion = [...listedButtons].find(([, button]) => button === document.activeElement)?.[0];
    chartList.replaceChildren();
    listedButtons.clear();
    regions.sort((a, b) => countFor(b) - countFor(a) || regionName(a).localeCompare(regionName(b), language())).slice(0, 12).forEach(region => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'coverage-row';
      button.setAttribute('data-region-id', region.id);
      button.setAttribute('aria-pressed', 'false');
      const name = document.createElement('span');
      name.textContent = regionName(region);
      const count = document.createElement('strong');
      count.textContent = formatNumber(countFor(region));
      button.append(name, count);
      on(button, 'click', () => selectRegion(region.id));
      listedButtons.set(region.id, button);
      li.append(button);
      chartList.append(li);
    });
    if (regions.length > 12) {
      const more = document.createElement('li');
      more.className = 'coverage-more';
      more.textContent = translate('moreRegions', { count: formatNumber(regions.length - 12) });
      chartList.append(more);
    }
    if (!regions.length) {
      const li = document.createElement('li'); li.className = 'coverage-loading';
      li.textContent = translate('noRecords'); chartList.append(li);
    }
    listedDataset = state.dataset;
    listedLanguage = language();
    if (focusedRegion) {
      const replacement = listedButtons.get(focusedRegion);
      (replacement || regionSelect).focus({ preventScroll: true });
    }
  }

  // A static projection gives the Data filters immediate, local geographic feedback.
  // Its country fills use the same surveyed-region and linked-highlight rules as the globe.
  function buildCoverageMap() {
    if (!coverageControls || coverageMap || !document.createElementNS) return;
    const svgNS = 'http://www.w3.org/2000/svg';
    coverageMap = document.createElement('div');
    coverageMap.className = 'coverage-map';
    const header = document.createElement('div');
    header.className = 'coverage-map-header';
    const heading = document.createElement('div');
    heading.className = 'coverage-map-heading';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'coverage-map-eyebrow';
    eyebrow.textContent = translate('coverage');
    coverageMapTitle = document.createElement('strong');
    heading.append(eyebrow, coverageMapTitle);
    const legend = document.createElement('div');
    legend.className = 'coverage-map-legend';
    for (const [kind, key] of [['covered', 'coverage'], ['selected', 'selectedRegion']]) {
      const item = document.createElement('span');
      const dot = document.createElement('i');
      dot.className = `coverage-map-swatch ${kind}`;
      dot.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.dataset.globeLabel = key;
      label.textContent = translate(key);
      item.append(dot, label);
      legend.append(item);
    }
    header.append(heading, legend);
    coverageMapSvg = document.createElementNS(svgNS, 'svg');
    coverageMapSvg.classList.add('coverage-map-svg');
    coverageMapSvg.setAttribute('viewBox', '0 0 1100 470');
    coverageMapSvg.setAttribute('role', 'img');
    coverageMapSvg.setAttribute('focusable', 'false');
    const projection = d3.geoEqualEarth().fitExtent([[24, 20], [1076, 448]], { type: 'Sphere' });
    const geoPath = d3.geoPath(projection);
    for (const country of state.countries) {
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', geoPath(country) || '');
      path.classList.add('coverage-map-country');
      const region = state.regionByNumeric.get(numericKey(country.id));
      if (region) path.setAttribute('data-region-id', region.id);
      coverageMapSvg.append(path);
      coverageMapPaths.push({ node: path, region });
    }
    for (const region of state.data.regions) {
      if (!Number.isFinite(region.lon) || !Number.isFinite(region.lat)) continue;
      const point = projection([region.lon, region.lat]);
      if (!point) continue;
      const marker = document.createElementNS(svgNS, 'circle');
      marker.setAttribute('cx', point[0].toFixed(2));
      marker.setAttribute('cy', point[1].toFixed(2));
      marker.setAttribute('r', '3.3');
      marker.setAttribute('data-region-id', region.id);
      marker.classList.add('coverage-map-marker');
      coverageMapSvg.append(marker);
      coverageMapMarkers.push({ node: marker, region });
    }
    coverageMap.append(header, coverageMapSvg);
    const feedback = document.createElement('div');
    feedback.className = 'coverage-feedback';
    const listPanel = document.createElement('div');
    listPanel.className = 'coverage-list-panel';
    listPanel.append(coverageListHead, chartList);
    feedback.append(coverageMap, listPanel);
    coverageSummary.after(feedback);
  }

  function updateCoverageMap() {
    if (!coverageMap) return;
    const datasetText = state.dataset === 'all' ? translate('allDatasets') : state.dataset;
    coverageMap.querySelector('.coverage-map-eyebrow').textContent = `${translate('coverage')} / ${datasetText}`;
    coverageMapTitle.textContent = state.selected ? regionName(state.selected) : translate('worldCoverage');
    coverageMap.querySelectorAll('[data-globe-label]').forEach(label => {
      label.textContent = translate(label.dataset.globeLabel);
    });
    coverageMapSvg.setAttribute('aria-label', `${datasetText}. ${state.selected
      ? `${regionName(state.selected)}. ${sampleLabel(sampleFor(state.selected))}`
      : translate('worldCoverage')}.`);
    for (const { node, region } of coverageMapPaths) {
      // Great Britain is a survey grouping, so do not color all of the UK.
      const fillRegion = region?.id === 'GBR' ? null : region;
      const sample = sampleFor(fillRegion);
      const covered = sample.status === 'covered';
      const selected = sharesHighlight(fillRegion, state.selected);
      node.classList.toggle('is-covered', covered);
      node.classList.toggle('is-selected', covered && selected);
      node.classList.toggle('is-selected-empty', selected && sample.status === 'none');
      node.classList.toggle('is-selected-unknown', selected && sample.status === 'unknown');
      node.classList.toggle('is-unknown', sample.status === 'unknown' && Boolean(fillRegion));
    }
    for (const { node, region } of coverageMapMarkers) {
      const sample = sampleFor(region);
      const covered = sample.status === 'covered';
      const highlighted = covered && sharesHighlight(region, state.selected);
      node.classList.toggle('is-covered', covered);
      node.classList.toggle('is-selected', highlighted);
      node.setAttribute('r', markerRadius(sample.count).toFixed(2));
      node.setAttribute('visibility', covered ? 'visible' : 'hidden');
    }
  }

  function flyTo(rotation) {
    if (motionReduced() || !state.visible || document.hidden) {
      state.flight = null;
      state.rotation = [...rotation];
      draw();
      updateMotion();
      return;
    }
    const deltaLon = ((rotation[0] - state.rotation[0] + 540) % 360) - 180;
    const target = [state.rotation[0] + deltaLon, rotation[1], 0];
    if (Math.abs(deltaLon) + Math.abs(target[1] - state.rotation[1]) < .2) {
      state.flight = null;
      state.rotation = target;
      draw();
      updateMotion();
      return;
    }
    state.flight = { from: [...state.rotation], to: target, start: clockNow(), duration: 650, pausedAt: 0 };
    updateMotion();
  }

  function focusRegion(region) {
    if (!Number.isFinite(region?.lon) || !Number.isFinite(region?.lat)) return;
    state.spinning = false;
    flyTo([-region.lon, Math.max(-78, Math.min(78, -region.lat)), 0]);
    updateControls();
  }

  function focusDataset() {
    if (state.dataset === 'all') return;
    const regions = visibleRegions();
    const total = selectedTotal();
    const top = [...regions].sort((a, b) => countFor(b) - countFor(a))[0];
    if (top && (regions.length === 1 || (validCount(total) && countFor(top) / total > .8))) focusRegion(top);
  }

  function sizeCanvas() {
    if (!ctx || !window.d3) return;
    const box = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    state.width = box.width;
    state.height = box.height;
    state.radius = Math.min(box.width, box.height) * .47;
    canvas.width = Math.max(1, Math.round(box.width * ratio));
    canvas.height = Math.max(1, Math.round(box.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    state.projection = d3.geoOrthographic()
      .translate([box.width / 2, box.height / 2])
      .scale(state.radius)
      .clipAngle(90)
      .precision(.4);
    state.path = d3.geoPath(state.projection, ctx);
    draw();
  }

  function onFront(region) {
    return d3.geoDistance([region.lon, region.lat], [-state.rotation[0], -state.rotation[1]]) < Math.PI / 2 - .025;
  }

  function draw() {
    if (disposed || !ctx || !state.data || !state.projection) return;
    // Retain the latest state while offscreen, then paint it once on re-entry.
    if (document.hidden || !state.visible || externallyPaused) { state.dirty = true; return; }
    const { width: w, height: h, radius: r, projection, path } = state;
    if (w < 1 || h < 1) return;
    state.dirty = false;
    projection.rotate(state.rotation);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;

    // The only atmospheric glow is the thin edge around the sphere.
    const ocean = ctx.createRadialGradient(cx - r * .38, cy - r * .5, r * .12, cx, cy, r * 1.18);
    ocean.addColorStop(0, '#204666'); ocean.addColorStop(.52, '#0d2949'); ocean.addColorStop(1, '#061225');
    ctx.fillStyle = ocean; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();

    // Latitude and longitude guides are decorative; map geometry comes from world-atlas.
    ctx.strokeStyle = 'rgba(130,187,238,.11)'; ctx.lineWidth = .55;
    ctx.beginPath(); path(d3.geoGraticule10()); ctx.stroke();

    state.countries.forEach(country => {
      // The survey label is Great Britain; a whole-UK fill would imply Northern Ireland.
      const region = state.regionByNumeric.get(numericKey(country.id));
      const fillRegion = region?.id === 'GBR' ? null : region;
      // A country outside the survey index is background geography, not a
      // survey region whose count is unavailable.
      const sample = fillRegion ? sampleFor(fillRegion) : { status: 'unmapped', count: null };
      const selected = sharesHighlight(fillRegion, state.selected);
      const hovered = sharesHighlight(fillRegion, state.hovered);
      ctx.beginPath(); path(country);
      if (sample.status === 'covered' && selected) {
        ctx.fillStyle = '#e3b48f';
      } else if (sample.status === 'covered' && hovered) {
        ctx.fillStyle = '#9bdfff';
      } else if (sample.status === 'covered') {
        const alpha = .21 + .37 * Math.sqrt(sample.count / state.maxRegionCount);
        ctx.fillStyle = `rgba(116,195,255,${alpha.toFixed(3)})`;
      } else {
        ctx.fillStyle = '#1b3452';
      }
      ctx.fill();
      ctx.lineWidth = selected ? 1.35 : hovered ? 1.1 : .6;
      ctx.strokeStyle = selected ? (sample.status === 'unknown' ? '#bdc8d4' : '#dfae87')
        : hovered ? '#9bdfff' : sample.status === 'covered'
        ? 'rgba(176,220,245,.46)' : sample.status === 'unknown'
          ? 'rgba(190,203,216,.65)' : 'rgba(153,189,225,.24)';
      if (ctx.setLineDash) ctx.setLineDash(sample.status === 'unknown' ? [2, 3]
        : (selected || hovered) && sample.status === 'none' ? [3, 3] : []);
      ctx.stroke();
      if (ctx.setLineDash) ctx.setLineDash([]);
    });
    ctx.restore();

    visibleRegions().forEach(region => {
      if (!Number.isFinite(region.lon) || !Number.isFinite(region.lat) || !onFront(region)) return;
      const point = projection([region.lon, region.lat]);
      if (!point) return;
      const count = countFor(region);
      const selected = region.id === state.selected?.id;
      const linked = sharesHighlight(region, state.selected) && !selected;
      const hovered = sharesHighlight(region, state.hovered);
      const size = markerRadius(count);
      if (hovered && !selected) {
        ctx.fillStyle = 'rgba(152,213,255,.13)';
        ctx.beginPath(); ctx.arc(point[0], point[1], size + 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = selected ? '#ffdbb5' : linked ? '#d3e8f3' : '#e6f7ff';
      ctx.beginPath(); ctx.arc(point[0], point[1], size, 0, Math.PI * 2); ctx.fill();
      if (selected) {
        const now = clockNow();
        const progress = state.pulseUntil > now
          ? 1 - (state.pulseUntil - now) / 900 : 1;
        ctx.strokeStyle = '#ffd5a8'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(point[0], point[1], size + 3 + Math.sin(Math.PI * progress) * 1.3, 0, Math.PI * 2); ctx.stroke();
      }
    });
    if (state.selected && onFront(state.selected)) {
      const point = projection([state.selected.lon, state.selected.lat]);
      if (point) {
        const sample = sampleFor(state.selected);
        const size = markerRadius(sample.count) || 4;
        if (sample.status !== 'covered') {
          ctx.strokeStyle = sample.status === 'unknown' ? '#bdc8d4' : '#e8ad7f'; ctx.lineWidth = 1.4;
          if (ctx.setLineDash) ctx.setLineDash([3, 2]);
          ctx.beginPath(); ctx.arc(point[0], point[1], size + 3, 0, Math.PI * 2); ctx.stroke();
          if (ctx.setLineDash) ctx.setLineDash([]);
        }
        const name = regionName(state.selected);
        ctx.font = '600 11px "DM Sans", sans-serif';
        const labelWidth = Math.min(ctx.measureText(name).width, Math.max(0, w - 24));
        let toRight = point[0] < cx;
        const rightX = point[0] + 35;
        const leftX = point[0] - 35 - labelWidth;
        if (toRight && rightX + labelWidth > w - 12 && leftX >= 12) toRight = false;
        else if (!toRight && leftX < 12 && rightX + labelWidth <= w - 12) toRight = true;
        const labelX = Math.max(12, Math.min(w - 12 - labelWidth, toRight ? rightX : leftX));
        const endX = labelX + (toRight ? -4 : labelWidth + 4);
        const endY = Math.max(16, Math.min(h - 16, point[1] - 18));
        ctx.strokeStyle = sample.status === 'unknown' ? '#bdc8d4' : '#edb686'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(point[0] + (toRight ? size : -size), point[1]);
        ctx.lineTo(endX, endY); ctx.stroke();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3; ctx.strokeStyle = '#071321';
        ctx.strokeText(name, labelX, endY - 5, w - 24);
        ctx.fillStyle = sample.status === 'unknown' ? '#e1e9f1' : '#fff1de';
        ctx.fillText(name, labelX, endY - 5, w - 24);
      }
    }
    const rim = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    rim.addColorStop(0, 'rgba(198,234,255,.68)'); rim.addColorStop(.45, 'rgba(92,164,232,.20)'); rim.addColorStop(1, 'rgba(126,154,231,.35)');
    ctx.shadowColor = '#7ab6ee'; ctx.shadowBlur = 7;
    ctx.strokeStyle = rim; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(cx, cy, r + .4, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function findRegions(event) {
    if (!visualReady || !state.projection) return [];
    const box = canvas.getBoundingClientRect();
    const x = event.clientX - box.left, y = event.clientY - box.top;
    if (Math.hypot(x - state.width / 2, y - state.height / 2) > state.radius) return [];
    const markers = visibleRegions().filter(onFront);
    const threshold = event.pointerType === 'touch' ? 21 : 15;
    const hits = markers.map(region => {
      const point = state.projection([region.lon, region.lat]);
      return point ? { region, distance: Math.hypot(point[0] - x, point[1] - y) } : null;
    }).filter(hit => hit && hit.distance <= threshold)
      .sort((a, b) => a.distance - b.distance || a.region.id.localeCompare(b.region.id));
    if (hits.length) return hits.map(hit => hit.region);
    const lonLat = state.projection.invert([x, y]);
    if (!lonLat) return [];
    const country = state.countries.find(item => d3.geoContains(item, lonLat));
    if (!country) return [];
    const region = state.regionByNumeric.get(numericKey(country.id));
    // Great Britain is narrower than this atlas's United Kingdom geometry.
    return region && region.id !== 'GBR' ? [region] : [];
  }

  function findRegion(event) { return findRegions(event)[0] || null; }

  function showOverlapPicker(event, regions) {
    if (!overlapPicker) return;
    const stage = hero.querySelector('.globe-stage') || hero;
    const box = stage.getBoundingClientRect();
    overlapPicker.replaceChildren();
    const title = document.createElement('strong');
    title.className = 'globe-overlap-title';
    title.textContent = translate('chooseRegion');
    overlapPicker.append(title);
    regions.forEach(region => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'globe-overlap-option';
      const label = document.createElement('span');
      label.textContent = regionName(region);
      const count = document.createElement('small');
      count.textContent = sampleLabel(sampleFor(region));
      button.append(label, count);
      on(button, 'click', () => selectRegion(region.id), { once: true });
      overlapPicker.append(button);
    });
    overlapPicker.style.left = `${Math.min(Math.max(8, event.clientX - box.left + 10), Math.max(8, box.width - 234))}px`;
    overlapPicker.style.top = `${Math.min(Math.max(8, event.clientY - box.top + 10), Math.max(8, box.height - 205))}px`;
    overlapPicker.hidden = false;
    overlapPicker.querySelector('button')?.focus({ preventScroll: true });
  }

  function showTooltip(event, region) {
    if (!region) { tooltip.hidden = true; return; }
    const box = (hero.querySelector('.globe-stage') || hero).getBoundingClientRect();
    tooltip.replaceChildren();
    const name = document.createElement('strong'); name.textContent = regionName(region);
    const count = document.createElement('span');
    count.textContent = sampleLabel(sampleFor(region));
    tooltip.append(name, count);
    tooltip.hidden = false;
    tooltip.style.left = `${Math.max(8, Math.min(box.width - 180, event.clientX - box.left + 12))}px`;
    tooltip.style.top = `${Math.max(32, Math.min(box.height - 65, event.clientY - box.top - 48))}px`;
  }

  on(canvas, 'pointerdown', event => {
    if (!state.data) return;
    if ((event.button != null && event.button !== 0) || (state.down && state.down.id !== event.pointerId)) return;
    state.flight = null;
    state.down = { x: event.clientX, y: event.clientY, rotation: [...state.rotation], moved: false, id: event.pointerId, type: event.pointerType };
    state.dragging = event.pointerType !== 'touch' || state.touchRotate;
    if (state.dragging) {
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add('is-dragging');
      state.spinning = false;
      updateControls();
      updateMotion();
    }
    if (overlapPicker) overlapPicker.hidden = true;
    tooltip.hidden = true;
  });
  on(canvas, 'pointermove', event => {
    if (!state.data) return;
    if (state.down && state.down.id === event.pointerId && !state.dragging && event.pointerType === 'touch') {
      if (Math.hypot(event.clientX - state.down.x, event.clientY - state.down.y) > 8) state.down.moved = true;
      return;
    }
    if (state.dragging && state.down?.id === event.pointerId) {
      const dx = event.clientX - state.down.x, dy = event.clientY - state.down.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) state.down.moved = true;
      state.rotation = [state.down.rotation[0] + dx * .32, Math.max(-78, Math.min(78, state.down.rotation[1] - dy * .32)), 0];
      state.spinning = false;
      draw();
      return;
    }
    if (event.pointerType === 'touch') return;
    const region = findRegion(event);
    state.hovered = region;
    canvas.style.cursor = region ? 'pointer' : 'grab';
    showTooltip(event, region);
    draw();
  });
  on(canvas, 'pointerup', event => {
    if (!state.down || state.down.id !== event.pointerId) return;
    if (!state.down?.moved) {
      const candidates = findRegions(event);
      if (candidates.length > 1) {
        state.spinning = false;
        showOverlapPicker(event, candidates);
      } else if (candidates.length === 1) selectRegion(candidates[0].id);
    }
    state.dragging = false; state.down = null;
    canvas.classList.remove('is-dragging');
    canvas.style.cursor = 'grab';
    updateControls();
    updateMotion();
  });
  on(canvas, 'pointercancel', () => { state.dragging = false; state.down = null; canvas.classList.remove('is-dragging'); updateMotion(); });
  on(canvas, 'pointerleave', () => { state.hovered = null; tooltip.hidden = true; draw(); });

  function updateOptions() {
    if (!state.data) return;
    const options = [{ id: 'all', label: translate('allDatasets') }, ...state.data.datasets];
    selects.forEach(select => {
      select.replaceChildren();
      options.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.label;
        select.append(option);
      });
      select.value = state.dataset;
      select.disabled = false;
    });
    [regionSelect, heroRegionSelect].filter(Boolean).forEach(select => {
      select.replaceChildren();
      const allOption = document.createElement('option');
      allOption.value = '';
      allOption.textContent = select === regionSelect ? translate('allRegions') : translate('chooseRegion');
      select.append(allOption);
      [...state.data.regions].sort((a, b) => regionName(a).localeCompare(regionName(b), language())).forEach(region => {
        const option = document.createElement('option');
        option.value = region.id;
        option.textContent = regionName(region);
        select.append(option);
      });
      select.value = state.selected?.id || '';
      select.disabled = false;
    });
  }

  function updateLocalizedCopy() {
    if (!state.data) return;
    state.hovered = null;
    tooltip.hidden = true;
    updateOptions();
    updatePanels();
    draw();
  }

  let loadFailed = false;
  function showLoadFailure() {
    labelTitle.textContent = translate('coverageUnavailable');
    labelCount.textContent = translate('tryAgain');
    chartList.replaceChildren();
    const li = document.createElement('li');
    li.className = 'coverage-loading';
    li.textContent = translate('indexUnavailable');
    chartList.append(li);
  }

  on(window, 'site:languagechange', () => {
    if (state.data) updateLocalizedCopy();
    else if (loadFailed) showLoadFailure();
  });

  on(selects[0], 'change', event => onHeroDataset?.(event.target.value));
  on(selects[1], 'change', event => syncDataset(event.target.value));
  on(regionSelect, 'change', event => selectRegion(event.target.value));
  on(heroRegionSelect, 'change', event => selectRegion(event.target.value));
  on(rotationControl, 'click', toggleRotation);
  on(resetControl, 'click', resetView);
  on(clearControl, 'click', clearSelection);
  on(interactionControl, 'click', () => {
    state.touchRotate = !state.touchRotate;
    state.dragging = false;
    state.down = null;
    updateControls();
    onTouchRotateChange?.(state.touchRotate);
  });
  on(viewDataLink, 'click', event => {
    onCoverageAction?.();
    event.preventDefault();
    const coverage = document.querySelector('#coverage');
    coverage?.scrollIntoView({ block: 'start', behavior: motionReduced() ? 'instant' : 'smooth' });
    regionSelect?.focus({ preventScroll: true });
  });
  on(hero, 'keydown', event => {
    if (event.key !== 'Escape') return;
    if (overlapPicker && !overlapPicker.hidden) {
      overlapPicker.hidden = true;
      heroRegionSelect?.focus({ preventScroll: true });
    }
  });

  let animationFrame = null;
  let frameScheduled = false;
  let last = 0;
  function stopMotion() {
    if (frameScheduled && animationFrame != null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(animationFrame);
    }
    animationFrame = null;
    frameScheduled = false;
    last = 0;
  }
  function updateMotion() {
    if (disposed || !visualReady || !state.data || state.dragging || !state.visible || document.hidden || externallyPaused) {
      if (state.flight && !state.flight.pausedAt) state.flight.pausedAt = clockNow();
      stopMotion();
      return;
    }
    if (state.flight?.pausedAt) {
      state.flight.start += clockNow() - state.flight.pausedAt;
      state.flight.pausedAt = 0;
    }
    if (!state.flight && (!state.spinning || motionReduced()) &&
        (motionReduced() || state.pulseUntil <= clockNow())) {
      stopMotion();
      return;
    }
    if (frameScheduled) return;
    frameScheduled = true;
    animationFrame = requestAnimationFrame(animate);
  }
  function animate(time) {
    animationFrame = null;
    frameScheduled = false;
    if (state.dragging || !state.visible || document.hidden) { updateMotion(); return; }
    if (!last || time - last >= 34) {
      const delta = Math.min(50, time - last || 34);
      last = time;
      if (state.flight) {
        const progress = Math.min(1, Math.max(0, (clockNow() - state.flight.start) / state.flight.duration));
        const ease = progress * progress * (3 - 2 * progress);
        state.rotation = state.flight.from.map((start, i) => start + (state.flight.to[i] - start) * ease);
        if (progress >= 1) state.flight = null;
      } else if (state.spinning && !motionReduced()) {
        state.rotation[0] = (state.rotation[0] + delta * .0026) % 360;
      }
      draw();
    }
    updateMotion();
  }
  if (document.addEventListener) on(document, 'visibilitychange', () => {
    if (document.hidden) updateMotion();
    else { if (state.dirty) draw(); updateMotion(); }
  });
  on(window, 'pagehide', () => { if (state.flight && !state.flight.pausedAt) state.flight.pausedAt = clockNow(); stopMotion(); });
  on(window, 'pageshow', () => { if (state.dirty) draw(); updateMotion(); });
  const motionPreferenceChanged = () => {
    if (motionReduced()) {
      state.spinning = false;
      state.pulseUntil = 0;
      if (state.flight) {
        state.rotation = [...state.flight.to];
        state.flight = null;
        draw();
      }
    }
    updateControls();
    updateMotion();
  };
  if (reduceMotion.addEventListener) on(reduceMotion, 'change', motionPreferenceChanged);
  else if (reduceMotion.addListener) reduceMotion.addListener(motionPreferenceChanged);
  if ('IntersectionObserver' in window) {
    viewportObserver = new IntersectionObserver(entries => {
    state.visible = entries[0]?.isIntersecting || false;
    if (state.visible && state.dirty) draw();
    updateMotion();
    }, { threshold: 0 });
    viewportObserver.observe(hero.querySelector('.globe-stage') || canvas);
  }

  const unsubscribe = store.subscribe(applySelection);
  function dispose() {
    if (disposed) return;
    disposed = true;
    unsubscribe();
    aborter?.abort();
    stopMotion();
    viewportObserver?.disconnect();
    resizeObserver?.disconnect();
    if (!reduceMotion.addEventListener) reduceMotion.removeListener?.(motionPreferenceChanged);
    const feedback = coverageMap?.parentElement;
    if (feedback?.classList.contains('coverage-feedback')) {
      coverageSummary.after(coverageListHead, chartList);
      feedback.remove();
    }
  }

  const ready = store.load().then(async data => {
    if (disposed) return;
    state.data = data;
    data.regions.forEach(region => state.regionById.set(region.id, region));
    state.maxRegionCount = Math.max(1, ...data.regions.map(region => validCount(region.count) ? region.count : 0));
    const selection = store.getSelection();
    state.dataset = selection.dataset;
    state.selected = store.getRegion(selection.selectedRegion);
    updateLocalizedCopy();
    sizeCanvas();
    updateMotion();
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(sizeCanvas);
      resizeObserver.observe(canvas);
    } else on(window, 'resize', sizeCanvas);
    if (!window.d3 || !window.topojson) return;
    const topology = await store.getWorldPromise();
    if (disposed) return;
    state.countries = topojson.feature(topology, topology.objects.countries).features;
    state.countries.forEach(feature => state.countryByNumeric.set(numericKey(feature.id), feature));
    data.regions.forEach(region => {
      if (region.numericId) state.regionByNumeric.set(numericKey(region.numericId), region);
    });
    buildCoverageMap();
    updateLocalizedCopy();
  }).catch(error => {
    if (error.name === 'AbortError') return;
    loadFailed = true;
    if (!state.data) showLoadFailure();
    console.warn('Geographic coverage:', error.message);
  });
  function setPaused(paused) {
    if (disposed) return;
    externallyPaused = Boolean(paused);
    if (!externallyPaused && state.dirty) draw();
    updateMotion();
  }
  return { ready, state, setPaused, setSelection: applySelection, resetView,
    setShowcase() {}, closeShowcase() {}, skip() {}, resize: sizeCanvas,
    toggleRotation, setTouchRotate(enabled) { state.touchRotate = Boolean(enabled); updateControls(); },
    dispose };
}
