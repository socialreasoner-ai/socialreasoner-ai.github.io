/* Figure 1: one data source, two SVG layouts, and a readable static fallback. */
(() => {
  const data = window.SOCIAL_RADAR_DATA;
  const section = document.querySelector('.reasoning-gap');
  if (!section || !data || !window.SiteI18n) return;
  const svg = section.querySelector('#reasoning-radar');
  const interactive = section.querySelector('.radar-interactive');
  const fallback = section.querySelector('.radar-fallback');
  const controls = section.querySelector('.radar-controls');
  const enhancement = [...section.querySelectorAll('[data-radar-enhancement]')];
  const replay = section.querySelector('[data-radar-replay]');
  const modelTitle = section.querySelector('[data-radar-detail-model]');
  const detailContent = section.querySelector('[data-radar-detail-content]');
  const taskList = section.querySelector('.radar-task-list');
  const announcement = section.querySelector('.radar-announcement');
  const status = section.querySelector('[data-radar-status]');
  const heading = section.querySelector('#radar-title');
  if (![svg, interactive, fallback, controls, replay, modelTitle, detailContent, taskList, announcement].every(Boolean) || enhancement.length !== 2) return;
  const definitions = data.modelDefinitions;
  const rows = data.rows;
  if (!Array.isArray(definitions) || definitions.length !== 3 || !Array.isArray(rows) || rows.length !== 15 ||
      rows.some((row, i) => row.model_id !== definitions[Math.floor(i / 5)].id || row.axis_index !== i % 5 ||
        !Number.isFinite(row.general?.plotted) || !Number.isFinite(row.social?.plotted) ||
        !Number.isFinite(row.general?.raw) || !Number.isFinite(row.social?.raw))) return;

  const t = (key, params) => window.SiteI18n.t(`radar.${key}`, params);
  const NS = 'http://www.w3.org/2000/svg';
  const isMobile = () => window.matchMedia('(max-width: 600px)').matches;
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const point = (cx, cy, radius, radians, value = 1) => [cx + radius * value * Math.cos(radians), cy - radius * value * Math.sin(radians)];
  const path = points => `M ${points.map(p => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L ')} Z`;
  const fmt = value => new Intl.NumberFormat(window.SiteI18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  function el(tag, attrs = {}, content) {
    const node = document.createElementNS(NS, tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
    if (content !== undefined) node.textContent = content;
    return node;
  }
  const add = (parent, tag, attrs = {}, content) => {
    const node = el(tag, attrs, content); parent.append(node); return node;
  };
  const rowKey = row => `${row.model_id}:${row.task_id}`;
  const modelName = id => definitions.find(model => model.id === id)?.name || '';
  const defaultModel = definitions[0].id;
  const state = { view: isMobile() ? defaultModel : 'overview', selected: null, hover: null, preview: null,
    autoConsumed: false, userInteracted: false, playing: false, animations: [], activeMask: null, lastWidth: 0 };
  let controller = null;
  let resizeObserver = null;
  let entranceObserver = null;
  let animationToken = 0;
  function syncLifecycle() {
    section.dataset.radarEntryPlayed = String(state.autoConsumed);
    section.dataset.radarAnimating = String(state.playing);
  }
  function adaptViewForViewport() {
    if (!isMobile() || state.view !== 'overview') return;
    const selectedRow = rows.find(row => rowKey(row) === state.selected);
    state.view = selectedRow?.model_id || defaultModel;
    if (!selectedRow) state.selected = null;
    state.hover = null;
    state.preview = null;
  }
  function formatHeading() {
    if (!heading || !document.documentElement.lang.startsWith('zh')) return;
    const title = t('heading');
    const comma = title.indexOf('，');
    if (comma < 0) return;
    heading.replaceChildren(document.createTextNode(title.slice(0, comma + 1)),
      document.createElement('br'), document.createTextNode(title.slice(comma + 1)));
  }

  function rowsInView() { return state.view === 'overview' ? rows : rows.filter(row => row.model_id === state.view); }
  function shownRow() { return rows.find(row => rowKey(row) === (state.hover || state.selected)); }
  function metric(task) {
    const label = task.metric === 'accuracy' ? t('metricAccuracy') : t('metricSourceScore');
    const value = Number.isFinite(task.raw) ? `${fmt(task.raw)}${task.unit === 'percent' ? t('unitPercent') : ''}` : '—';
    return { label, value };
  }
  function drawDetail() {
    const row = shownRow();
    detailContent.replaceChildren();
    if (!row) {
      modelTitle.textContent = state.view === 'overview' ? t('overview') : modelName(state.view);
      const note = document.createElement('p'); note.className = 'radar-detail-empty'; note.textContent = t('selectTask');
      detailContent.append(note);
    } else {
      modelTitle.textContent = modelName(row.model_id);
      for (const [key, task] of [['general', row.general], ['social', row.social]]) {
        const item = document.createElement('div'); item.className = `radar-detail-task radar-detail-${key}`;
        const title = document.createElement('span'); title.className = 'radar-detail-category'; title.textContent = t(key);
        const name = document.createElement('strong'); name.textContent = task.name;
        const measure = document.createElement('span'); measure.className = 'radar-detail-measure';
        const display = metric(task); measure.textContent = `${display.label} · ${display.value}`;
        item.append(title, name, measure); detailContent.append(item);
      }
    }
    section.querySelectorAll('[data-radar-task]').forEach(node => {
      const active = node.getAttribute('data-radar-task') === (state.hover || state.selected);
      node.classList.toggle('is-task-active', active);
      if (node.matches('button')) node.setAttribute('aria-pressed', String(node.getAttribute('data-radar-task') === state.selected));
    });
    section.querySelectorAll('[data-radar-axis]').forEach(node => {
      node.classList.toggle('is-task-active', node.getAttribute('data-radar-axis') === (state.hover || state.selected));
    });
  }
  function updateControls() {
    section.dataset.radarView = state.view;
    syncLifecycle();
    section.dataset.radarPreview = state.view === 'overview' ? state.preview || '' : '';
    controls.querySelectorAll('[data-radar-model]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.radarModel === state.view));
      button.classList.toggle('is-preview', state.view === 'overview' && button.dataset.radarModel === state.preview);
    });
    svg.querySelectorAll('[data-radar-group]').forEach(node => {
      node.classList.toggle('is-preview', !!state.preview && state.view === 'overview' && node.getAttribute('data-radar-group') === state.preview);
      node.classList.toggle('is-muted', !!state.preview && state.view === 'overview' && node.getAttribute('data-radar-group') !== state.preview);
    });
    if (status) status.textContent = state.view === 'overview' ? t('overview') : modelName(state.view);
  }
  function renderTaskList() {
    taskList.replaceChildren();
    definitions.filter(model => state.view === 'overview' || model.id === state.view).forEach(model => {
      const group = document.createElement('div'); group.className = 'radar-task-group';
      group.setAttribute('role', 'group');
      const heading = document.createElement('h4'); heading.className = 'radar-task-model';
      heading.id = `radar-task-model-${model.id}`; heading.textContent = model.name;
      group.setAttribute('aria-labelledby', heading.id); group.append(heading);
      rows.filter(row => row.model_id === model.id).forEach(row => {
        const button = document.createElement('button'); button.type = 'button';
        button.className = 'radar-task-button'; button.dataset.radarTask = rowKey(row);
        button.setAttribute('aria-pressed', String(rowKey(row) === state.selected));
        button.setAttribute('aria-label', `${modelName(row.model_id)}: ${row.general.name} / ${row.social.name}`);
        const ordinal = document.createElement('span'); ordinal.className = 'radar-task-index';
        ordinal.textContent = String(row.axis_index + 1).padStart(2, '0');
        const names = document.createElement('span'); names.className = 'radar-task-names';
        const general = document.createElement('span'); general.textContent = row.general.name;
        const social = document.createElement('small'); social.textContent = row.social.name;
        names.append(general, social); button.append(ordinal, names);
        group.append(button);
      });
      taskList.append(group);
    });
    drawDetail();
  }
  function geometry() {
    const width = Math.max(280, Math.round(svg.getBoundingClientRect().width || svg.parentElement.getBoundingClientRect().width));
    const compact = width < 570;
    const height = state.view === 'overview' ? Math.max(390, Math.min(690, width * .78)) :
      compact ? Math.max(320, Math.min(405, width * 1.1)) : Math.max(390, Math.min(690, width * .78));
    const cx = width / 2, cy = state.view === 'overview' ? height * .53 : height * .49;
    const radius = state.view === 'overview' ? Math.min(width * .325, height * .36) :
      compact ? Math.min(width * .29, height * .32) : Math.min(width * .29, height * .31);
    return { width, height, cx, cy, radius, compact };
  }
  function finishAnimation() {
    animationToken++;
    for (const animation of state.animations) animation.cancel();
    state.animations = [];
    state.playing = false;
    syncLifecycle();
    svg.querySelectorAll('[data-radar-animated]').forEach(node => {
      node.removeAttribute('mask'); node.style.opacity = '';
    });
    svg.querySelectorAll('.radar-mask-trace').forEach(node => {
      node.style.strokeDasharray = '';
      node.style.strokeDashoffset = '';
    });
  }
  function draw() {
    finishAnimation();
    const { width, height, cx, cy, radius, compact } = geometry();
    state.lastWidth = width;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('height', String(Math.round(height)));
    svg.setAttribute('aria-label', t('chartAria'));
    svg.replaceChildren();
    add(svg, 'title', { id:'radar-svg-title' }, t('chartAria'));
    add(svg, 'desc', { id:'radar-svg-description' }, t('chartDescription'));
    const defs = add(svg, 'defs');
    for (const category of ['general', 'social']) {
      const mask = add(defs, 'mask', { id: `radar-${category}-trace-mask`, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width, height });
      add(mask, 'path', { class: `radar-mask-trace radar-mask-${category}`, fill: 'none', stroke: 'white', 'stroke-width': 12, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    }
    const grid = add(svg, 'g', { class: 'radar-grid', 'aria-hidden': 'true' });
    for (const fraction of [.25, .5, .75, 1]) add(grid, 'circle', { cx, cy, r: radius * fraction });
    const axes = add(svg, 'g', { class: 'radar-axes', 'aria-hidden': 'true' });
    const plottedRows = rowsInView();
    const angles = plottedRows.map((_, i) => state.view === 'overview' ? (data.angleStartDegrees - i * 24) * Math.PI / 180 : (-90 + i * 72) * Math.PI / 180);
    plottedRows.forEach((row, i) => {
      const [x, y] = point(cx, cy, radius, angles[i]);
      add(axes, 'line', { x1: cx, y1: cy, x2: x, y2: y, 'data-radar-axis': rowKey(row), 'data-radar-group': row.model_id });
    });
    const generalPoints = plottedRows.map((row, i) => point(cx, cy, radius, angles[i], row.general.plotted));
    const socialPoints = plottedRows.map((row, i) => point(cx, cy, radius, angles[i], row.social.plotted));
    const generalPath = path(generalPoints), socialPath = path(socialPoints);
    const fillGroup = add(svg, 'g', { class: 'radar-fills', 'aria-hidden': 'true' });
    add(fillGroup, 'path', { class: 'radar-fill-general', d: generalPath, 'data-radar-animated': 'general-fill' });
    add(fillGroup, 'path', { class: 'radar-fill-social', d: socialPath, 'data-radar-animated': 'social-fill' });
    const outlineGroup = add(svg, 'g', { class: 'radar-outlines', 'aria-hidden': 'true' });
    add(outlineGroup, 'path', { class: 'radar-outline-general', d: generalPath, 'data-radar-animated': 'general-line' });
    add(outlineGroup, 'path', { class: 'radar-outline-social', d: socialPath, 'data-radar-animated': 'social-line' });
    for (const category of ['general', 'social']) {
      defs.querySelector(`.radar-mask-${category}`).setAttribute('d', category === 'general' ? generalPath : socialPath);
    }
    if (state.view === 'overview') {
      const groups = add(svg, 'g', { class: 'radar-groups', 'aria-hidden': 'true' });
      definitions.forEach((model, modelIndex) => {
        const arc = add(groups, 'g', { class: 'radar-model-group', 'data-radar-group': model.id });
        const segment = Array.from({length: 22}, (_, n) => {
          const a = (data.angleStartDegrees - modelIndex * 120 + 8 - n * (112 / 21)) * Math.PI / 180;
          return point(cx, cy, radius * 1.125, a);
        });
        add(arc, 'path', { class: 'radar-group-arc', d: `M ${segment.map(p => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L ')}` });
        for (const category of ['general', 'social']) {
          const points = (category === 'general' ? generalPoints : socialPoints).slice(modelIndex * 5, modelIndex * 5 + 5);
          add(arc, 'path', { class: `radar-group-outline-${category}`, d: `M ${points.map(p => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L ')}` });
        }
        const centerAngle = (90 - modelIndex * 120) * Math.PI / 180;
        const [labelX, labelY] = point(cx, cy, radius * (compact ? 1.24 : 1.31), centerAngle);
        add(arc, 'text', { class: 'radar-model-name', x: labelX - (model.id === 'opus' ? (compact ? 14 : 24) : 0), y: labelY, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, model.name);
      });
      for (let i = 0; i < 3; i++) {
        const angle = (30 - i * 120) * Math.PI / 180;
        const start = point(cx, cy, radius * .55, angle), end = point(cx, cy, radius * 1.16, angle);
        add(groups, 'line', { class: 'radar-boundary', x1: start[0], y1: start[1], x2: end[0], y2: end[1] });
      }
    } else {
      const labels = add(svg, 'g', { class: 'radar-single-labels', 'aria-hidden': 'true' });
      plottedRows.forEach((row, i) => {
        const [x, y] = point(cx, cy, radius * (compact ? 1.25 : 1.28), angles[i]);
        const short = compact ? {math:'Math',gpqa:'GPQA-D',arc:'ARC-AGI-1',weirdml:'WeirdML',vibecode:'VibeCode'}[row.task_id] : row.general.name;
        const text = add(labels, 'text', {x, y, 'text-anchor': Math.abs(x-cx) < radius*.3 ? 'middle' : x>cx?'start':'end'}, short);
        if (!compact) add(text, 'tspan', { x, dy: 18, class: 'radar-single-survey' }, row.social.name);
      });
    }
    const marks = add(svg, 'g', { class: 'radar-marks' });
    plottedRows.forEach((row, i) => {
      const pair = add(marks, 'g', { class: 'radar-pair', 'data-radar-group': row.model_id, 'data-radar-task': rowKey(row) });
      const [gx,gy] = generalPoints[i], [sx,sy] = socialPoints[i];
      add(pair, 'circle', { class: 'radar-node-halo', cx: gx, cy: gy, r: 13 });
      add(pair, 'circle', { class: 'radar-general-dot', cx: gx, cy: gy, r: 4.5, 'data-radar-animated': 'general-node' });
      add(pair, 'rect', { class: 'radar-social-dot', x: sx-4, y: sy-4, width: 8, height: 8, 'data-radar-animated': 'social-node' });
      for (const [category,x,y] of [['general',gx,gy],['social',sx,sy]]) {
        add(pair, 'circle', {class:'radar-node-hit', cx:x, cy:y, r: state.view === 'overview' ? (category === 'social' ? 12 : 21) : 22,
          'data-radar-task':rowKey(row), 'data-radar-category':category});
      }
    });
    updateControls(); drawDetail();
  }
  function updateSelection(key, lock) {
    if (lock) { state.selected = state.selected === key ? null : key; state.hover = null; }
    else state.hover = key;
    drawDetail();
    if (lock) {
      const row = rows.find(item => rowKey(item) === state.selected);
      announcement.textContent = row ? t('selected', {model:modelName(row.model_id),task:`${row.general.name} / ${row.social.name}`}) : t('clearSelection');
    }
  }
  function switchModel(id) {
    if (id === 'overview' && isMobile()) return;
    interact();
    if (id === state.view) return;
    state.view = id; state.preview = null; state.hover = null;
    if (!rowsInView().some(row => rowKey(row) === state.selected)) state.selected = null;
    draw(); renderTaskList();
    announcement.textContent = id === 'overview' ? t('overview') : modelName(id);
    if (!reduceMotion()) {
      const animation = svg.animate([{opacity:.7},{opacity:1}], {duration:240,easing:'ease-out'});
      state.animations = [animation]; animation.finished.catch(()=>{}).then(() => { if (!state.playing) state.animations=[]; });
    }
  }
  function interact() { state.userInteracted = true; state.autoConsumed = true; finishAnimation(); syncLifecycle(); }
  function play() {
    finishAnimation();
    if (reduceMotion() || document.hidden) return;
    const token = ++animationToken;
    state.playing = true;
    syncLifecycle();
    const general = svg.querySelector('.radar-outline-general');
    const social = svg.querySelector('.radar-outline-social');
    for (const [key, outline, delay, duration] of [['general',general,0,850],['social',social,850,650]]) {
      const trace = svg.querySelector(`.radar-mask-${key}`);
      const length = Math.ceil(trace.getTotalLength() + 8);
      trace.style.strokeDasharray = String(length);
      trace.style.strokeDashoffset = String(length);
      outline.setAttribute('mask', `url(#radar-${key}-trace-mask)`);
      state.animations.push(trace.animate([{strokeDashoffset:length},{strokeDashoffset:0}],
        {duration,delay,easing:'ease-in-out',fill:'both'}));
    }
    const timed = [
      ['.radar-fill-general',520,330],['.radar-fill-social',1430,320],
      ['.radar-general-dot',730,240],['.radar-social-dot',1440,240]
    ];
    for (const [selector,delay,duration] of timed) {
      svg.querySelectorAll(selector).forEach(node => {
        node.style.opacity = '0';
        state.animations.push(node.animate([{opacity:0},{opacity:1}],{duration,delay,easing:'ease-out',fill:'both'}));
      });
    }
    Promise.allSettled(state.animations.map(animation => animation.finished)).then(() => {
      if (token !== animationToken) return;
      finishAnimation();
    });
  }
  function setPreview(id) {
    if (state.view !== 'overview') return;
    state.preview = id;
    updateControls();
  }
  function bind() {
    controller = new AbortController();
    const signal = controller.signal;
    controls.addEventListener('click', event => {
      const button = event.target.closest('[data-radar-model]');
      if (button) switchModel(button.dataset.radarModel);
    }, {signal});
    controls.addEventListener('pointerover', event => {
      const button = event.target.closest('[data-radar-model]');
      if (button && button.dataset.radarModel !== 'overview') setPreview(button.dataset.radarModel);
    }, {signal});
    controls.addEventListener('pointerout', event => {
      const button = event.target.closest('[data-radar-model]');
      if (button && !button.contains(event.relatedTarget)) setPreview(null);
    }, {signal});
    controls.addEventListener('focusin', event => {
      const button = event.target.closest('[data-radar-model]');
      if (button && button.dataset.radarModel !== 'overview') setPreview(button.dataset.radarModel);
    }, {signal});
    controls.addEventListener('focusout', event => {
      const button = event.target.closest('[data-radar-model]');
      if (button && !button.contains(event.relatedTarget)) setPreview(null);
    }, {signal});
    replay.addEventListener('click', () => { interact(); play(); }, {signal});
    const taskClick = event => {
      const target = event.target.closest('[data-radar-task]');
      if (!target) return;
      interact(); updateSelection(target.dataset.radarTask, true);
    };
    svg.addEventListener('click', taskClick, {signal}); taskList.addEventListener('click', taskClick, {signal});
    for (const target of [svg,taskList]) {
      target.addEventListener('pointerover', event => {
        const item = event.target.closest('[data-radar-task]');
        if (item) updateSelection(item.dataset.radarTask,false);
      }, {signal});
      target.addEventListener('pointerout', event => {
        const item = event.target.closest('[data-radar-task]');
        const next = event.relatedTarget?.closest?.('[data-radar-task]');
        if (item && next?.dataset.radarTask !== item.dataset.radarTask) updateSelection(null,false);
      }, {signal});
    }
    taskList.addEventListener('focusin', event => {
      const item = event.target.closest('[data-radar-task]'); if (item) updateSelection(item.dataset.radarTask,false);
    }, {signal});
    taskList.addEventListener('focusout', event => {
      const item = event.target.closest('[data-radar-task]'); if (item && !item.contains(event.relatedTarget)) updateSelection(null,false);
    }, {signal});
    section.addEventListener('keydown', event => {
      if (event.key === 'Escape' && state.selected) { interact(); state.selected=null; state.hover=null; drawDetail(); announcement.textContent=t('clearSelection'); }
    }, {signal});
    document.addEventListener('visibilitychange', () => { if (document.hidden) finishAnimation(); }, {signal});
    window.addEventListener('site:languagechange', () => { formatHeading(); draw(); renderTaskList(); }, {signal});
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(() => {
        const width = Math.round(svg.getBoundingClientRect().width);
        if (width !== state.lastWidth) {
          adaptViewForViewport();
          draw(); renderTaskList();
        }
      });
      resizeObserver.observe(interactive);
    } else window.addEventListener('resize', () => { adaptViewForViewport(); draw(); renderTaskList(); }, {signal,passive:true});
    if (typeof IntersectionObserver === 'function') {
      entranceObserver = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) { if (state.playing) finishAnimation(); return; }
        if (!state.autoConsumed) {
          state.autoConsumed=true;
          syncLifecycle();
          if (!state.userInteracted) play();
        }
      }, {threshold:.12});
      entranceObserver.observe(interactive);
    } else { state.autoConsumed=true; syncLifecycle(); if (!state.userInteracted) play(); }
  }
  function init() {
    if (controller) return;
    try {
      adaptViewForViewport();
      enhancement.forEach(node => {node.hidden=false;}); interactive.hidden=false; fallback.hidden=true;
      formatHeading(); draw(); renderTaskList(); bind();
    } catch (error) {
      console.error('Radar enhancement unavailable:', error);
      finishAnimation(); controller?.abort(); controller=null;
      entranceObserver?.disconnect(); resizeObserver?.disconnect();
      enhancement.forEach(node => {node.hidden=true;}); interactive.hidden=true; fallback.hidden=false;
    }
  }
  function destroy() {
    finishAnimation(); controller?.abort(); controller=null;
    entranceObserver?.disconnect(); entranceObserver=null;
    resizeObserver?.disconnect(); resizeObserver=null;
  }
  window.addEventListener('pagehide', destroy);
  window.addEventListener('pageshow', event => { if (event.persisted) init(); });
  init();
})();
