/* When resources are published, replace the empty strings with their final URLs. */
const RELEASE_URLS = {
  data: '',  // Hugging Face dataset
  code: '',  // GitHub repository
  model: ''  // Hugging Face model
};

document.documentElement.classList.add('has-js');
const siteText = (key, params) => window.SiteI18n.t(key, params);

const researchResults = window.SOCIAL_RESEARCH_RESULTS;
const datasets = researchResults.datasets;
const results = researchResults.models;
const siteNumber = (value, digits) => window.SiteI18n.number(value, { minimumFractionDigits: digits, maximumFractionDigits: digits });
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function activateTab(button, buttons, callback) {
  buttons.forEach(item => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
  });
  callback(button);
}

function bindTabs(selector, callback) {
  const buttons = [...document.querySelectorAll(selector)];
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => activateTab(button, buttons, callback));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
      activateTab(buttons[next], buttons, callback);
      buttons[next].focus();
    });
  });
  return buttons;
}

function renderStage(button) {
  if (!button) return;
  const index = Number(button.dataset.stage);
  const panel = document.querySelector('#stage-panel');
  if (!panel) return;
  panel.setAttribute('aria-labelledby', button.id);
  panel.querySelector('.panel-index').textContent = siteText('stage.step', { current: String(index + 1).padStart(2, '0'), total: '04' });
  panel.querySelector('#stage-panel-title').textContent = siteText(`stage.${index}.heading`);
  panel.querySelector('#stage-panel-body').textContent = siteText(`stage.${index}.body`);
  panel.querySelector('#stage-input').textContent = siteText(`stage.${index}.input`);
  panel.querySelector('#stage-output').textContent = siteText(`stage.${index}.output`);
  const flow = document.querySelector('.method-flow');
  if (flow) flow.dataset.activeStage = String(index);
}

bindTabs('.stage', renderStage);
renderStage(document.querySelector('.stage.active'));

function makeChartBar(className, value) {
  const bar = document.createElement('div');
  bar.className = `chart-bar ${className}`;
  // All models share a zero-based 0–70% accuracy axis.
  bar.style.height = `${value / 70 * 100}%`;
  const label = document.createElement('span');
  label.textContent = siteNumber(value, 2);
  bar.append(label);
  return bar;
}

// Keep all eight dataset groups mounted so bar heights can interpolate from
// their current position when a model is selected mid-transition.
function buildResultRows() {
  const chart = document.querySelector('#benchmark-chart');
  const existing = [...chart.querySelectorAll(':scope > .chart-row')];
  // The default model is rendered in HTML from research-data.js so the chart is
  // readable before this script runs. Reuse those nodes for animated updates.
  if (existing.length === datasets.length && existing.every((row, index) =>
    row.dataset.dataset === datasets[index] &&
    row.querySelector('.chart-bar.base > span') && row.querySelector('.chart-bar.ours > span'))) return;
  chart.replaceChildren(...datasets.map((name, index) => {
    const row = document.createElement('div');
    row.className = 'chart-row';
    row.dataset.dataset = name;
    const label = document.createElement('span');
    label.className = 'chart-label';
    label.textContent = name;
    const bars = document.createElement('div');
    bars.className = 'chart-bars';
    bars.setAttribute('aria-hidden', 'true');
    bars.append(makeChartBar('base', results.qwen3.base[index]),
      makeChartBar('ours', results.qwen3.ours[index]));
    row.append(label, bars);
    return row;
  }));
}

function renderResults(key) {
  const model = results[key];
  const chart = document.querySelector('#benchmark-chart');
  document.querySelector('#relative-gain').textContent = `+${model.reportedRelativeGain}`;
  chart.setAttribute('aria-label', siteText('evidence.chartAria', { model: model.label }));
  [...chart.querySelectorAll('.chart-row')].forEach((row, i) => {
    const name = datasets[i];
    row.setAttribute('aria-label', siteText('evidence.rowAria', {
      dataset: name, base: siteNumber(model.base[i], 2), ours: siteNumber(model.ours[i], 2)
    }));
    for (const [kind, value] of [['base', model.base[i]], ['ours', model.ours[i]]]) {
      const bar = row.querySelector(`.chart-bar.${kind}`);
      bar.style.height = `${value / 70 * 100}%`;
      bar.firstElementChild.textContent = siteNumber(value, 2);
    }
  });
  chart.dataset.model = key;
}

function setupResultMotion() {
  const chart = document.querySelector('#benchmark-chart');
  if (!chart || !('IntersectionObserver' in window)) return;
  const rows = [...chart.querySelectorAll('.chart-row')];
  let pageActive = true;

  function syncMotion() {
    const enabled = !reducedMotion.matches;
    const active = enabled && pageActive && !document.hidden;
    chart.classList.toggle('has-chart-motion', enabled);
    chart.classList.toggle('is-motion-active', active);
    rows.forEach(row => {
      // Reveal each row once, including rows reached later on a small screen.
      // A preference change must never hide results that were already readable.
      if (!enabled) {
        row.classList.add('is-revealed');
        row.classList.remove('is-entering');
      } else if (active && row.classList.contains('is-in-view') && !row.classList.contains('is-revealed')) {
        row.classList.add('is-revealed', 'is-entering');
      }
    });
  }

  chart.addEventListener('animationend', event => {
    if (event.animationName === 'accuracy-reveal' && event.target.matches('.chart-bar.ours')) {
      event.target.closest('.chart-row').classList.remove('is-entering');
    }
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('is-in-view', entry.isIntersecting));
    syncMotion();
  }, { threshold: 0.12, rootMargin: '0px 0px -20px 0px' });
  syncMotion();
  rows.forEach(row => observer.observe(row));
  document.addEventListener('visibilitychange', syncMotion);
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', syncMotion);
  else reducedMotion.addListener?.(syncMotion);
  window.addEventListener('pagehide', () => { pageActive = false; syncMotion(); });
  window.addEventListener('pageshow', () => { pageActive = true; syncMotion(); });
}

function setupChartValueVisibility() {
  const viewport = document.querySelector('.benchmark-scroll');
  if (!viewport || !('IntersectionObserver' in window)) return;
  // Hide a whole value when it crosses the viewport edge or the sticky axis,
  // so a clipped leading digit can never read as a different accuracy.
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('is-clipped', entry.intersectionRatio < 1));
  }, { root: viewport, rootMargin: '0px 0px 0px -48px', threshold: 1 });
  viewport.querySelectorAll('.chart-bar > span').forEach(label => observer.observe(label));
}

buildResultRows();
bindTabs('.model-tab', button => renderResults(button.dataset.model));
renderResults('qwen3');
setupResultMotion();
setupChartValueVisibility();

let activeEvidence = null;
let previewEvidence = null;
let suppressEvidencePreview = false;
const evidenceButtons = [...document.querySelectorAll('.profile-evidence [data-evidence]')];
const evidenceIds = new Set(['motives', 'competence', 'confidence', 'efficiency']);
function renderEvidenceSelection() {
  const shown = suppressEvidencePreview ? activeEvidence : previewEvidence || activeEvidence;
  const example = document.querySelector('.worked-example');
  example.dataset.evidenceActive = shown || '-1';
  evidenceButtons.forEach(button => {
    const id = button.dataset.evidence;
    button.classList.toggle('is-highlighted', id === shown);
    button.setAttribute('aria-pressed', String(id === activeEvidence));
  });
  document.querySelectorAll('#reasoning-summary [data-reasoning]').forEach(part => {
    part.classList.toggle('is-highlighted', !!shown && part.dataset.reasoning === shown);
  });
}
evidenceButtons.forEach(button => {
  const id = button.dataset.evidence;
  if (!evidenceIds.has(id)) return;
  button.addEventListener('click', () => {
    const clear = activeEvidence === id;
    activeEvidence = clear ? null : id;
    previewEvidence = clear ? null : id;
    suppressEvidencePreview = clear;
    renderEvidenceSelection();
  });
  button.addEventListener('focus', () => {
    previewEvidence = id;
    suppressEvidencePreview = false;
    renderEvidenceSelection();
  });
  button.addEventListener('blur', () => {
    previewEvidence = null;
    suppressEvidencePreview = false;
    renderEvidenceSelection();
  });
  button.addEventListener('pointerenter', () => {
    previewEvidence = id;
    suppressEvidencePreview = false;
    renderEvidenceSelection();
  });
  button.addEventListener('pointerleave', () => {
    previewEvidence = button === document.activeElement ? id : null;
    renderEvidenceSelection();
  });
  button.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    activeEvidence = null;
    previewEvidence = null;
    suppressEvidencePreview = true;
    renderEvidenceSelection();
  });
});
document.querySelector('[data-clear-evidence]')?.addEventListener('click', () => {
  activeEvidence = null;
  previewEvidence = null;
  suppressEvidencePreview = true;
  renderEvidenceSelection();
});
renderEvidenceSelection();

const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
function renderMenuLabel() {
  menuToggle.setAttribute('aria-label', siteText(menuToggle.getAttribute('aria-expanded') === 'true' ? 'nav.closeMenu' : 'nav.openMenu'));
}
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  renderMenuLabel();
  mobileNav.hidden = !open;
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  mobileNav.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  renderMenuLabel();
}));
menuToggle.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  mobileNav.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  renderMenuLabel();
});
mobileNav.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  mobileNav.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  renderMenuLabel();
  menuToggle.focus();
});

// Anchored sections are immediately readable, including after direct #hash navigation.
document.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));

function safeReleaseUrl(key, raw) {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    const expected = key === 'code' ? 'github.com' : 'huggingface.co';
    if (host !== expected) return null;
    return url.href;
  } catch { return null; }
}

Object.entries(RELEASE_URLS).forEach(([key, raw]) => {
  const href = safeReleaseUrl(key, raw);
  if (!href) return;
  const original = document.querySelector(`[data-release="${key}"]`);
  const link = document.createElement('a');
  link.className = original.className + ' live';
  link.setAttribute('data-release', key);
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.innerHTML = original.innerHTML;
  link.querySelector('.coming').setAttribute('data-i18n', 'resource.open');
  link.querySelector('.coming').textContent = siteText('resource.open');
  original.replaceWith(link);
  const heroItem = document.querySelector(`[data-release-mini="${key}"]`);
  if (heroItem) {
    const heroLink = document.createElement('a');
    heroLink.setAttribute('data-release-mini', key);
    heroLink.href = href;
    heroLink.target = '_blank';
    heroLink.rel = 'noopener noreferrer';
    heroLink.innerHTML = heroItem.innerHTML;
    heroLink.querySelector('em').textContent = key === 'code' ? 'GitHub ↗' : 'Hugging Face ↗';
    heroItem.replaceWith(heroLink);
  }
});

window.addEventListener('site:languagechange', () => {
  renderStage(document.querySelector('.stage.active'));
  renderResults(document.querySelector('.model-tab.active').dataset.model);
  renderMenuLabel();
});

function setupCanvas(canvas, makePoints, draw) {
  if (!canvas || !canvas.getContext) return () => {};
  const context = canvas.getContext('2d');
  if (!context) return () => {};
  let width = 0, height = 0, points = [], raf = null;
  const paint = () => {
    raf = null;
    if (document.hidden) return;
    draw(context, points, width, height, 0);
  };
  const requestPaint = () => {
    if (!document.hidden && raf === null) raf = requestAnimationFrame(paint);
  };
  const resize = () => {
    const box = canvas.getBoundingClientRect();
    width = box.width; height = box.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    points = makePoints(width, height);
    requestPaint();
  };
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && raf !== null) { cancelAnimationFrame(raf); raf = null; }
    if (!document.hidden) requestPaint();
  });
  reducedMotion.addEventListener?.('change', requestPaint);
  return requestPaint;
}

let scrollRatio = 0;
let requestAmbientPaint = () => {};
window.addEventListener('scroll', () => {
  const next = reducedMotion.matches ? 0 : Math.min(1, window.scrollY / Math.max(1, window.innerHeight * 2));
  if (next === scrollRatio) return;
  scrollRatio = next;
  requestAmbientPaint();
}, { passive: true });
requestAmbientPaint = setupCanvas(document.querySelector('#ambient-canvas'), (width, height) => {
  const count = width < 600 ? 28 : 58;
  return Array.from({ length: count }, (_, i) => ({ x: (i * .61803398875 % 1) * width, y: (i * .754877666 % 1) * height, size: .5 + i % 3 * .35, phase: i * .7 }));
}, (ctx, points, width, height, t) => {
  ctx.clearRect(0,0,width,height);
  points.forEach((p,i) => {
    const side = i % 2 ? -1 : 1;
    const x = p.x + side * scrollRatio * Math.min(width * .22, 150) + Math.sin(t * 2 + p.phase) * 6;
    const y = (p.y + Math.cos(t + p.phase) * 4 + height) % height;
    ctx.fillStyle = i % 7 === 0 ? 'rgba(255,245,232,.42)' : 'rgba(157,203,242,.28)';
    ctx.beginPath();ctx.arc(x,y,p.size,0,Math.PI*2);ctx.fill();
  });
});
