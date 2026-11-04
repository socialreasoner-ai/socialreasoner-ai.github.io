/* Geographic coverage uses only the audited, precomputed counts in assets/geography.json. */
(() => {
  const language = () => window.SiteI18n?.language || 'en';
  const translate = (key, params = {}) => {
    if (window.SiteI18n?.t) return window.SiteI18n.t(`globe.${key}`, params);
    const copy = window.SOCIAL_GLOBE_MESSAGES?.[language()]?.[key]
      || window.SOCIAL_GLOBE_MESSAGES?.en?.[key] || key;
    return copy.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`);
  };
  const formatNumber = value => window.SiteI18n?.number
    ? window.SiteI18n.number(value) : new Intl.NumberFormat(language()).format(value);
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
  function regionName(region) {
    const lang = language();
    const override = window.SOCIAL_REGION_NAMES?.[lang]?.[region.id];
    if (override) return override;
    if (lang === 'en' || !countryCodes[region.id] || !Intl.DisplayNames) return region.label;
    if (!displayNames.has(lang)) displayNames.set(lang, new Intl.DisplayNames(lang, { type: 'region' }));
    return displayNames.get(lang).of(countryCodes[region.id]) || region.label;
  }

  const canvas = document.querySelector('#globe-canvas');
  const hero = document.querySelector('.globe-hero');
  if (!canvas || !hero) return;
  const ctx = canvas.getContext('2d');
  if (!ctx || !window.d3 || !window.topojson) {
    document.querySelector('#globe-region-name').textContent = translate('mapUnavailable');
    window.addEventListener('site:languagechange', () => {
      document.querySelector('#globe-region-name').textContent = translate('mapUnavailable');
    });
    return;
  }

  const selects = [document.querySelector('#hero-dataset'), document.querySelector('#coverage-dataset')];
  const regionSelect = document.querySelector('#coverage-region');
  const tooltip = document.querySelector('#globe-tooltip');
  const chartList = document.querySelector('#coverage-list');
  const coverageControls = document.querySelector('.coverage-controls');
  const coverageSummary = document.querySelector('.coverage-summary');
  const coverageListHead = document.querySelector('.coverage-list-head');
  const labelTitle = document.querySelector('#globe-region-name');
  const labelCount = document.querySelector('#globe-region-count');
  const labelKicker = document.querySelector('#globe-region-kicker');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = {
    data: null, countries: [], countryByNumeric: new Map(), regionByNumeric: new Map(), regionById: new Map(),
    dataset: 'all', selected: null, hovered: null, rotation: [-20, -15, 0],
    spinning: !reduceMotion.matches, dragging: false, down: null,
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

  const countFor = region => state.dataset === 'all' ? region.count : (region.byDataset?.[state.dataset] || 0);
  const visibleRegions = () => state.data.regions.filter(region => countFor(region) > 0);
  const selectedDataset = () => state.data.datasets.find(item => item.id === state.dataset);
  const selectedTotal = () => state.dataset === 'all' ? state.data.totalRespondents : selectedDataset()?.respondents || 0;
  const numericKey = value => String(Number(value));
  // Map presentation can link survey regions while their respondent counts remain separate.
  const highlightGroup = region => region?.highlightGroup || region?.id;
  const sharesHighlight = (region, active) => Boolean(region && active && highlightGroup(region) === highlightGroup(active));
  const mapCountFor = region => state.data.regions
    .filter(item => sharesHighlight(item, region))
    .reduce((sum, item) => sum + countFor(item), 0);

  function syncDataset(value) {
    if (value !== 'all' && !state.data.datasets.some(dataset => dataset.id === value)) return;
    state.dataset = value;
    selects.forEach(select => { select.value = value; });
    if (state.selected && mapCountFor(state.selected) === 0) {
      state.selected = null;
      regionSelect.value = '';
    }
    state.hovered = null;
    tooltip.hidden = true;
    updatePanels();
    draw();
  }

  function selectRegion(id) {
    state.selected = id ? state.regionById.get(id) || null : null;
    state.hovered = null;
    tooltip.hidden = true;
    regionSelect.value = state.selected?.id || '';
    if (state.selected) {
      const { lon, lat } = state.selected;
      if (Number.isFinite(lon) && Number.isFinite(lat)) state.rotation = [-lon, -lat, 0];
      state.spinning = false;
      updateMotion();
    }
    updatePanels();
    draw();
  }

  function updatePanels() {
    if (!state.data) return;
    const regions = visibleRegions();
    const total = selectedTotal();
    const datasetText = state.dataset === 'all' ? translate('allDatasets') : state.dataset;
    labelKicker.textContent = `${datasetText} / ${translate(state.selected ? 'selectedRegion' : 'coverage')}`;
    labelTitle.textContent = state.selected ? regionName(state.selected) : translate('worldCoverage');
    labelCount.textContent = state.selected
      ? translate('respondentCount', { count: formatNumber(countFor(state.selected)) })
      : `${translate('respondentCount', { count: formatNumber(total) })} · ${formatNumber(regions.length)} ${translate(regions.length === 1 ? 'regionSingle' : 'regionPlural')}`;
    document.querySelector('#coverage-total').textContent = formatNumber(total);
    document.querySelector('#coverage-regions').textContent = formatNumber(regions.length);
    document.querySelector('#coverage-selected').textContent = state.selected
      ? `${regionName(state.selected)} · ${formatNumber(countFor(state.selected))}` : translate('allRegions');
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
      button.addEventListener('click', () => selectRegion(region.id));
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
      ? `${regionName(state.selected)}. ${translate('respondentCount', { count: formatNumber(countFor(state.selected)) })}`
      : translate('worldCoverage')}.`);
    for (const { node, region } of coverageMapPaths) {
      // Great Britain is a survey grouping, so do not color all of the UK.
      const fillRegion = region?.id === 'GBR' ? null : region;
      const covered = Boolean(fillRegion && mapCountFor(fillRegion) > 0);
      node.classList.toggle('is-covered', covered);
      node.classList.toggle('is-selected', covered && sharesHighlight(fillRegion, state.selected));
    }
    for (const { node, region } of coverageMapMarkers) {
      const covered = countFor(region) > 0;
      const highlighted = covered && sharesHighlight(region, state.selected);
      node.classList.toggle('is-covered', covered);
      node.classList.toggle('is-selected', highlighted);
      node.setAttribute('r', highlighted ? '7.5' : '4.2');
      node.setAttribute('visibility', covered ? 'visible' : 'hidden');
    }
  }

  function sizeCanvas() {
    const box = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    state.width = box.width;
    state.height = box.height;
    state.radius = Math.min(box.width, box.height) * .38;
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
    if (!state.data || !state.projection) return;
    // Retain the latest state while offscreen, then paint it once on re-entry.
    if (document.hidden || !state.visible) { state.dirty = true; return; }
    const { width: w, height: h, radius: r, projection, path } = state;
    if (w < 1 || h < 1) return;
    state.dirty = false;
    projection.rotate(state.rotation);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;

    // Outer atmospheric glow and the ocean's dimensional gradient.
    const aura = ctx.createRadialGradient(cx, cy, r * .68, cx, cy, r * 1.26);
    aura.addColorStop(0, 'rgba(79,157,239,0)');
    aura.addColorStop(.76, 'rgba(88,167,255,.08)');
    aura.addColorStop(1, 'rgba(91,98,225,0)');
    ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(cx, cy, r * 1.28, 0, Math.PI * 2); ctx.fill();
    const ocean = ctx.createRadialGradient(cx - r * .38, cy - r * .5, r * .12, cx, cy, r * 1.18);
    ocean.addColorStop(0, '#1d3e62'); ocean.addColorStop(.46, '#0d2746'); ocean.addColorStop(1, '#040d20');
    ctx.fillStyle = ocean; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();

    // Latitude and longitude guides are decorative; map geometry comes from world-atlas.
    ctx.strokeStyle = 'rgba(130,187,238,.16)'; ctx.lineWidth = .65;
    ctx.beginPath(); path(d3.geoGraticule10()); ctx.stroke();

    const mapCounts = new Map();
    state.data.regions.forEach(region => {
      const group = highlightGroup(region);
      mapCounts.set(group, (mapCounts.get(group) || 0) + countFor(region));
    });
    const maxMapCount = Math.max(1, ...mapCounts.values());
    const maxCount = Math.max(1, ...visibleRegions().map(countFor));
    state.countries.forEach(country => {
      // The survey label is Great Britain; a whole-UK fill would imply Northern Ireland.
      const region = state.regionByNumeric.get(numericKey(country.id));
      const fillRegion = region?.id === 'GBR' ? null : region;
      const count = fillRegion ? mapCounts.get(highlightGroup(fillRegion)) || 0 : 0;
      ctx.beginPath(); path(country);
      if (sharesHighlight(fillRegion, state.selected)) {
        ctx.fillStyle = '#e3b48f';
      } else if (sharesHighlight(fillRegion, state.hovered)) {
        ctx.fillStyle = '#9bdfff';
      } else if (count > 0) {
        const alpha = .22 + .42 * Math.sqrt(count / maxMapCount);
        ctx.fillStyle = `rgba(116,195,255,${alpha.toFixed(3)})`;
      } else {
        ctx.fillStyle = '#1b3452';
      }
      ctx.fill();
      ctx.lineWidth = .65;
      ctx.strokeStyle = count > 0 ? 'rgba(203,234,255,.58)' : 'rgba(153,189,225,.25)';
      ctx.stroke();
    });
    ctx.restore();

    visibleRegions().forEach(region => {
      if (!Number.isFinite(region.lon) || !Number.isFinite(region.lat) || !onFront(region)) return;
      const point = projection([region.lon, region.lat]);
      if (!point) return;
      const count = countFor(region);
      const selected = sharesHighlight(region, state.selected);
      const hovered = sharesHighlight(region, state.hovered);
      const size = (selected ? 6.5 : hovered ? 5.5 : 2.8) + Math.sqrt(count / maxCount) * 3;
      ctx.fillStyle = selected ? 'rgba(239,178,136,.22)' : 'rgba(152,213,255,.15)';
      ctx.beginPath(); ctx.arc(point[0], point[1], size * 3.1, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = selected ? '#e9b189' : '#a8dcff'; ctx.shadowBlur = selected ? 26 : 17;
      ctx.fillStyle = selected ? '#ffd9b8' : '#e8f7ff';
      ctx.beginPath(); ctx.arc(point[0], point[1], size, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    });
    const rim = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    rim.addColorStop(0, 'rgba(205,235,255,.85)'); rim.addColorStop(.45, 'rgba(96,170,236,.17)'); rim.addColorStop(1, 'rgba(143,163,243,.38)');
    ctx.strokeStyle = rim; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r + .4, 0, Math.PI * 2); ctx.stroke();
  }

  function findRegion(event) {
    const box = canvas.getBoundingClientRect();
    const x = event.clientX - box.left, y = event.clientY - box.top;
    if (Math.hypot(x - state.width / 2, y - state.height / 2) > state.radius) return null;
    const markers = visibleRegions().filter(onFront);
    for (let i = markers.length - 1; i >= 0; i--) {
      const point = state.projection([markers[i].lon, markers[i].lat]);
      if (point && Math.hypot(point[0] - x, point[1] - y) < 11) return markers[i];
    }
    const lonLat = state.projection.invert([x, y]);
    if (!lonLat) return null;
    const country = state.countries.find(item => d3.geoContains(item, lonLat));
    if (!country) return null;
    const region = state.regionByNumeric.get(numericKey(country.id));
    // Linked geometry stays interactive when only its paired survey region has samples.
    return region && region.id !== 'GBR' && mapCountFor(region) > 0 ? region : null;
  }

  function showTooltip(event, region) {
    if (!region) { tooltip.hidden = true; return; }
    const box = hero.getBoundingClientRect();
    tooltip.replaceChildren();
    const name = document.createElement('strong'); name.textContent = regionName(region);
    const count = document.createElement('span');
    count.textContent = translate('respondentCount', { count: formatNumber(countFor(region)) });
    tooltip.append(name, count);
    tooltip.hidden = false;
    tooltip.style.left = `${Math.max(8, Math.min(box.width - 180, event.clientX - box.left + 12))}px`;
    tooltip.style.top = `${Math.max(32, Math.min(box.height - 65, event.clientY - box.top - 48))}px`;
  }

  canvas.addEventListener('pointerdown', event => {
    if (!state.data) return;
    canvas.setPointerCapture(event.pointerId);
    state.down = { x: event.clientX, y: event.clientY, rotation: [...state.rotation], moved: false };
    state.dragging = true;
    updateMotion();
    canvas.classList.add('is-dragging');
    tooltip.hidden = true;
  });
  canvas.addEventListener('pointermove', event => {
    if (!state.data) return;
    if (state.dragging && state.down) {
      const dx = event.clientX - state.down.x, dy = event.clientY - state.down.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) state.down.moved = true;
      state.rotation = [state.down.rotation[0] + dx * .32, Math.max(-78, Math.min(78, state.down.rotation[1] - dy * .32)), 0];
      state.spinning = false;
      updateMotion();
      draw();
      return;
    }
    const region = findRegion(event);
    state.hovered = region;
    canvas.style.cursor = region ? 'pointer' : 'grab';
    showTooltip(event, region);
    draw();
  });
  canvas.addEventListener('pointerup', event => {
    if (!state.dragging) return;
    if (!state.down?.moved) {
      const region = findRegion(event);
      if (region) selectRegion(region.id);
    }
    state.dragging = false; state.down = null;
    canvas.classList.remove('is-dragging');
    canvas.style.cursor = 'grab';
    updateMotion();
  });
  canvas.addEventListener('pointercancel', () => { state.dragging = false; state.down = null; canvas.classList.remove('is-dragging'); updateMotion(); });
  canvas.addEventListener('pointerleave', () => { state.hovered = null; tooltip.hidden = true; draw(); });

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
    regionSelect.replaceChildren();
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = translate('allRegions');
    regionSelect.append(allOption);
    [...state.data.regions].sort((a, b) => regionName(a).localeCompare(regionName(b), language())).forEach(region => {
      const option = document.createElement('option');
      option.value = region.id;
      option.textContent = regionName(region);
      regionSelect.append(option);
    });
    regionSelect.value = state.selected?.id || '';
    regionSelect.disabled = false;
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

  window.addEventListener('site:languagechange', () => {
    if (state.data) updateLocalizedCopy();
    else if (loadFailed) showLoadFailure();
  });

  selects.forEach(select => select.addEventListener('change', event => syncDataset(event.target.value)));
  regionSelect.addEventListener('change', event => selectRegion(event.target.value));

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
    if (!state.data || !state.spinning || state.dragging || !state.visible || document.hidden) {
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
    if (!state.spinning || state.dragging || !state.visible || document.hidden) { stopMotion(); return; }
    if (!last || time - last >= 34) {
      const delta = Math.min(50, time - last || 34);
      last = time;
      state.rotation[0] = (state.rotation[0] + delta * .0036) % 360;
      draw();
    }
    updateMotion();
  }
  if (document.addEventListener) document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopMotion();
    else { if (state.dirty) draw(); updateMotion(); }
  });
  window.addEventListener('pagehide', stopMotion);
  window.addEventListener('pageshow', () => { if (state.dirty) draw(); updateMotion(); });
  const motionPreferenceChanged = () => {
    if (reduceMotion.matches) state.spinning = false;
    updateMotion();
  };
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', motionPreferenceChanged);
  else if (reduceMotion.addListener) reduceMotion.addListener(motionPreferenceChanged);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    state.visible = entries[0]?.isIntersecting || false;
    if (state.visible && state.dirty) draw();
    updateMotion();
  }, { threshold: 0 }).observe(hero);

  Promise.all([
    fetch('assets/world-110m.json?v=20261104-regions').then(response => { if (!response.ok) throw new Error('World geometry unavailable'); return response.json(); }),
    fetch('assets/geography.json?v=20261104-paper-cohort-r1').then(response => { if (!response.ok) throw new Error('Coverage data unavailable'); return response.json(); })
  ]).then(([topology, data]) => {
    if (data.schemaVersion !== 1 || !Array.isArray(data.regions) || !Array.isArray(data.datasets) || !topology.objects?.countries) throw new Error('Unexpected coverage format');
    state.data = data;
    state.countries = topojson.feature(topology, topology.objects.countries).features;
    state.countries.forEach(feature => state.countryByNumeric.set(numericKey(feature.id), feature));
    data.regions.forEach(region => {
      state.regionById.set(region.id, region);
      if (region.numericId) state.regionByNumeric.set(numericKey(region.numericId), region);
    });
    buildCoverageMap();
    updateLocalizedCopy();
    sizeCanvas();
    updateMotion();
    if ('ResizeObserver' in window) new ResizeObserver(sizeCanvas).observe(canvas);
    else window.addEventListener('resize', sizeCanvas);
  }).catch(error => {
    loadFailed = true;
    showLoadFailure();
    console.warn('Geographic coverage:', error.message);
  });
})();
