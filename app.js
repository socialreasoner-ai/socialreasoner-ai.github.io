/* When resources are published, replace the empty strings with their final URLs. */
const RELEASE_URLS = {
  data: '',  // Hugging Face dataset
  code: '',  // GitHub repository
  model: ''  // Hugging Face model
};

document.documentElement.classList.add('has-js');
const siteText = (key, params) => window.SiteI18n.t(key, params);

const stages = [
  { icon: '✳' }, { icon: '⋈' }, { icon: '⌁' }, { icon: '◎' }
];

const datasets = ['ATP142','ATP152','EVS2017','ISSP2009','ISSP2015','ISSP2016','ISSP2019','ISSP2021'];
const results = {
  qwen3: {
    label: 'Qwen3-4B-2507-Instruct', gain: '34.37%',
    base: [47.51,49.81,44.88,44.68,39.06,41.56,40.46,38.95],
    ours: [58.53,63.10,64.16,59.34,55.71,56.89,53.91,54.49]
  },
  qwen25: {
    label: 'Qwen2.5-7B-Instruct', gain: '45.22%',
    base: [47.30,45.71,44.00,42.95,33.38,35.77,39.05,33.29],
    ours: [58.27,63.22,64.12,58.19,58.18,55.80,54.39,54.63]
  },
  llama: {
    label: 'Llama-3.1-8B-Instruct', gain: '45.38%',
    base: [45.22,45.71,48.04,41.34,33.83,36.60,36.73,33.69],
    ours: [58.16,62.88,64.28,59.41,56.51,56.68,54.49,54.50]
  }
};

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
  const index = Number(button.dataset.stage);
  const stage = stages[index];
  const panel = document.querySelector('#stage-panel');
  panel.setAttribute('aria-labelledby', button.id);
  panel.querySelector('.panel-index').textContent = siteText('stage.step', { current: String(index + 1).padStart(2, '0'), total: '04' });
  panel.querySelector('.panel-icon').textContent = stage.icon;
  panel.querySelector('#stage-panel-title').textContent = siteText(`stage.${index}.heading`);
  panel.querySelector('#stage-panel-body').textContent = siteText(`stage.${index}.body`);
}

bindTabs('.stage', renderStage);
renderStage(document.querySelector('.stage.active'));

function average(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function percentMean(values) { return `${(Math.round(average(values) * 100 + 1e-8) / 100).toFixed(2)}%`; }

function renderResults(key) {
  const model = results[key];
  const chart = document.querySelector('#benchmark-chart');
  document.querySelector('#relative-gain').textContent = `+${model.gain}`;
  document.querySelector('#mean-base').textContent = percentMean(model.base);
  document.querySelector('#mean-ours').textContent = percentMean(model.ours);
  chart.setAttribute('aria-label', siteText('evidence.chartAria', { model: model.label }));
  chart.innerHTML = datasets.map((name, i) => {
    const base = model.base[i].toFixed(2);
    const ours = model.ours[i].toFixed(2);
    return `<div class="chart-row" aria-label="${siteText('evidence.rowAria', { dataset: name, base, ours })}">
      <span class="chart-label">${name}</span>
      <div class="chart-bars" aria-hidden="true">
        <div class="chart-bar base" style="width:${model.base[i] / 70 * 100}%"><span>${base}</span></div>
        <div class="chart-bar ours" style="width:${model.ours[i] / 70 * 100}%"><span>${ours}</span></div>
      </div>
    </div>`;
  }).join('');
}

bindTabs('.model-tab', button => renderResults(button.dataset.model));
renderResults('qwen3');

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

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px 40px 0px' });
  document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
} else {
  document.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));
}

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
  if (!canvas || !canvas.getContext) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  let width = 0, height = 0, points = [], raf = null, frame = 0;
  const resize = () => {
    const box = canvas.getBoundingClientRect();
    width = box.width; height = box.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    points = makePoints(width, height);
    draw(context, points, width, height, frame);
  };
  const animate = () => {
    frame += 0.008;
    draw(context, points, width, height, frame);
    raf = requestAnimationFrame(animate);
  };
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  if (!reducedMotion.matches) animate();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && raf) { cancelAnimationFrame(raf); raf = null; }
    if (!document.hidden && !reducedMotion.matches && !raf) animate();
  });
}

let scrollRatio = 0;
window.addEventListener('scroll', () => { scrollRatio = Math.min(1, window.scrollY / Math.max(1, window.innerHeight * 2)); }, { passive: true });
setupCanvas(document.querySelector('#ambient-canvas'), (width, height) => {
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
