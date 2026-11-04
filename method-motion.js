/* Native scroll drives a single stage; the complete HTML method remains the fallback. */
(() => {
  const journey = document.querySelector('.method-journey');
  if (!journey || !window.SiteI18n) return;
  const sticky = journey.querySelector('.journey-sticky');
  const scene = journey.querySelector('.journey-scene');
  const routes = [...journey.querySelectorAll('[data-journey-link]')];
  const buttons = [...journey.querySelectorAll('.journey-step')];
  const description = journey.querySelector('[data-journey-description]');
  const indexLabel = journey.querySelector('.journey-description-index');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!sticky || !scene || buttons.length !== 5 || !description || !indexLabel || routes.length !== 14) return;

  const nodes = Object.fromEntries([...scene.querySelectorAll('[data-journey-node]')].map(node => [node.dataset.journeyNode, node]));
  const tokens = Object.fromEntries([...scene.querySelectorAll('[data-journey-token]')].map(token => [token.dataset.journeyToken, token]));
  if (Object.keys(nodes).length !== 13 || Object.keys(tokens).length !== 4) return;
  const routePhases = {
    'input-ebm': 1, 'input-lgbm': 1, 'input-mlp': 1,
    'ebm-evidence': 2, 'lgbm-evidence': 2, 'mlp-evidence': 2,
    'ebm-record': 3, 'lgbm-record': 3, 'mlp-record': 3,
    'ebm-pool': 4, 'lgbm-pool': 4, 'mlp-pool': 4,
    'pool-sft': 4, 'sft-model': 4
  };
  let current = 0;
  let progress = 0;
  let start = 0;
  let travel = 1;
  let pinned = false;
  let frame = 0;
  let motionFrame = 0;
  let measureFrame = 0;
  let observer = null;
  let listening = false;
  let failedSize = '';

  function clamp(value, minimum = 0, maximum = 1) {
    return Math.min(maximum, Math.max(minimum, value));
  }
  function coordinates(name, side) {
    const sceneRect = scene.getBoundingClientRect();
    const rect = nodes[name].getBoundingClientRect();
    const x = side === 'left' ? rect.left : side === 'right' ? rect.right : rect.left + rect.width / 2;
    const y = side === 'top' ? rect.top : side === 'bottom' ? rect.bottom : rect.top + rect.height / 2;
    return { x: x - sceneRect.left, y: y - sceneRect.top };
  }
  function routeData(name) {
    const split = name.indexOf('-');
    if (name === 'pool-sft' || name === 'sft-model') {
      const [from, to] = name.split('-');
      const a = coordinates(from, 'bottom');
      const b = coordinates(to, 'top');
      const bend = (b.y - a.y) * .55;
      return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} C${a.x.toFixed(1)} ${(a.y + bend).toFixed(1)} ${b.x.toFixed(1)} ${(b.y - bend).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
    let from;
    let to;
    if (name.startsWith('input-')) { from = 'input'; to = name.slice(6); }
    else if (name.endsWith('-evidence')) { from = name.slice(0, split); to = name; }
    else if (name.endsWith('-record')) { from = `${name.slice(0, split)}-evidence`; to = name; }
    else { from = `${name.slice(0, split)}-record`; to = 'pool'; }
    const a = coordinates(from, 'right');
    const b = coordinates(to, 'left');
    const bend = Math.max(10, (b.x - a.x) * .52);
    return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} C${(a.x + bend).toFixed(1)} ${a.y.toFixed(1)} ${(b.x - bend).toFixed(1)} ${b.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  function drawRoutes() {
    if (!journey.classList.contains('journey-visual')) return;
    const width = Math.max(1, scene.clientWidth);
    const height = Math.max(1, scene.clientHeight);
    const svg = scene.querySelector('.journey-routes');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    for (const path of routes) path.setAttribute('d', routeData(path.dataset.journeyLink));
    placeTokens(progress);
  }
  function showStage(stage) {
    const next = Math.max(0, Math.min(4, stage));
    if (current === next && journey.dataset.currentStage === String(next)) return;
    current = next;
    journey.dataset.currentStage = String(next);
    buttons.forEach((button, index) => {
      button.classList.toggle('is-active', index === next);
      if (index === next) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    indexLabel.textContent = `${String(next + 1).padStart(2, '0')} / 05`;
    description.textContent = window.SiteI18n.t(`journey.${next}.body`);
    for (const route of routes) {
      const phase = routePhases[route.dataset.journeyLink];
      route.classList.toggle('is-active', phase === next);
      route.classList.toggle('is-complete', phase < next);
    }
  }
  function between(a, b, fraction) {
    return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
  }
  function setToken(token, point, visible) {
    token.style.transform = `translate(${(point.x - token.offsetWidth / 2).toFixed(1)}px,${(point.y - token.offsetHeight / 2).toFixed(1)}px)`;
    token.style.opacity = visible ? '1' : '0';
  }
  function placeTokens(value) {
    if (!journey.classList.contains('journey-visual')) return;
    for (const expert of ['ebm', 'lgbm', 'mlp']) {
      let point;
      if (value <= .75) {
        const amount = clamp((value - .5) / .25);
        point = between(coordinates(`${expert}-evidence`, 'right'), coordinates(`${expert}-record`, 'left'), amount);
      } else {
        const amount = clamp((value - .75) / .15);
        point = between(coordinates(`${expert}-record`, 'right'), coordinates('pool', 'left'), amount);
      }
      setToken(tokens[expert], point, value > .505 && value < .9);
    }
    const unified = value <= .95
      ? between(coordinates('pool', 'bottom'), coordinates('sft', 'top'), clamp((value - .9) / .05))
      : between(coordinates('sft', 'bottom'), coordinates('model', 'top'), clamp((value - .95) / .05));
    setToken(tokens.unified, unified, value >= .9 && value < 1);
  }
  function updateFromScroll() {
    frame = 0;
    if (!pinned) return;
    progress = clamp((scrollY - start) / travel);
    journey.style.setProperty('--journey-progress', progress.toFixed(4));
    showStage(Math.round(progress * 4));
    placeTokens(progress);
  }
  function onScroll() {
    if (pinned && !frame) frame = requestAnimationFrame(updateFromScroll);
  }
  function animateCompactTo(target) {
    if (motionFrame) cancelAnimationFrame(motionFrame);
    const initial = progress;
    const delta = target - initial;
    if (Math.abs(delta) < .001) { progress = target; placeTokens(progress); return; }
    const time = performance.now();
    function tick(now) {
      const fraction = clamp((now - time) / 430);
      progress = initial + delta * (1 - Math.pow(1 - fraction, 3));
      placeTokens(progress);
      if (fraction < 1) motionFrame = requestAnimationFrame(tick);
      else motionFrame = 0;
    }
    motionFrame = requestAnimationFrame(tick);
  }
  function goTo(stage) {
    const next = Math.max(0, Math.min(4, stage));
    if (pinned) {
      showStage(next);
      window.scrollTo({ top: start + travel * next / 4, behavior: 'auto' });
    } else if (journey.classList.contains('journey-visual')) {
      showStage(next);
      animateCompactTo(next / 4);
    }
  }
  function onClick(event) { goTo(Number(event.currentTarget.dataset.journeyStage)); }
  function onKeydown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.journeyStage);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 4
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (index + 4) % 5 : (index + 1) % 5;
    goTo(next);
    buttons[next].focus();
  }
  function measure() {
    measureFrame = 0;
    if (!listening) return;
    if (innerWidth < 1100 || reduced.matches) {
      journey.classList.remove('journey-visual', 'journey-pinned', 'journey-compact');
      pinned = false;
      return;
    }
    journey.classList.add('journey-visual');
    const sizeKey = `${innerWidth}:${innerHeight}:${window.SiteI18n.language}`;
    const wantsPin = innerHeight >= 800 && failedSize !== sizeKey;
    journey.classList.toggle('journey-pinned', wantsPin);
    journey.classList.toggle('journey-compact', !wantsPin);
    const top = parseFloat(getComputedStyle(sticky).top) || 0;
    const fits = wantsPin && sticky.scrollHeight <= innerHeight - top + 2
      && scene.clientWidth >= 900;
    if (!fits) {
      if (wantsPin) failedSize = sizeKey;
      journey.classList.remove('journey-pinned');
      journey.classList.add('journey-compact');
    } else {
      failedSize = '';
      journey.classList.remove('journey-compact');
    }
    pinned = fits;
    if (pinned) {
      const rect = journey.getBoundingClientRect();
      start = rect.top + scrollY - top;
      travel = Math.max(1, rect.height - sticky.offsetHeight);
      updateFromScroll();
    } else {
      journey.style.setProperty('--journey-progress', (current / 4).toFixed(4));
      progress = current / 4;
    }
    drawRoutes();
  }
  function scheduleMeasure() {
    if (!measureFrame) measureFrame = requestAnimationFrame(measure);
  }
  function localize() {
    description.textContent = window.SiteI18n.t(`journey.${current}.body`);
    scheduleMeasure();
  }
  function begin() {
    if (listening) return;
    listening = true;
    journey.classList.add('journey-enhanced');
    buttons.forEach(button => {
      button.addEventListener('click', onClick);
      button.addEventListener('keydown', onKeydown);
    });
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', scheduleMeasure, { passive: true });
    addEventListener('site:languagechange', localize);
    reduced.addEventListener('change', scheduleMeasure);
    if ('ResizeObserver' in window) {
      observer = new ResizeObserver(scheduleMeasure);
      observer.observe(sticky);
      observer.observe(scene);
    }
    showStage(0);
    measure();
  }
  function stop() {
    if (!listening) return;
    listening = false;
    cancelAnimationFrame(frame);
    cancelAnimationFrame(motionFrame);
    cancelAnimationFrame(measureFrame);
    frame = motionFrame = measureFrame = 0;
    observer?.disconnect();
    observer = null;
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', scheduleMeasure);
    removeEventListener('site:languagechange', localize);
    reduced.removeEventListener('change', scheduleMeasure);
    buttons.forEach(button => {
      button.removeEventListener('click', onClick);
      button.removeEventListener('keydown', onKeydown);
    });
  }
  begin();
  addEventListener('pagehide', stop);
  addEventListener('pageshow', event => { if (event.persisted) begin(); });
})();
