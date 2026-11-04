/* Method is complete HTML first. One bounded, visibility-aware timeline enhances it. */
(() => {
  window.__socialMethodCleanup?.();
  const root = document.querySelector('.method-lab');
  if (!root) return;
  const experts = ['ebm', 'lgbm', 'mlp'];
  const steps = [...root.querySelectorAll('[data-method-stage]')];
  const detail = root.querySelector('.ml-detail');
  const play = root.querySelector('[data-method-play]');
  const replay = root.querySelector('[data-method-replay]');
  if (steps.length !== 6 || !detail || !play || !replay) return;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  const on = (target, type, callback, options = {}) => target.addEventListener(type, callback, { ...options, signal: abort.signal });
  const phaseMs = 1200;
  const duration = phaseMs * steps.length;
  let elapsed = 0, frame = 0, previousTime = null;
  let visible = false, intendedPlay = false, started = false, finished = false;
  let selected = null, hover = null, focus = null, mobile = 'ebm', detailStep = 0;
  let returnFocus = null, phase = 'complete';
  const text = (key, fallback) => window.SiteI18n?.t(key) || fallback || key;
  const bindText = (node, key, fallback) => {
    if (!node) return;
    node.dataset.i18n = key;
    node.textContent = text(key, fallback);
  };
  function status() {
    const running = intendedPlay && visible && !document.hidden && !media.matches;
    root.classList.toggle('is-running', running);
    root.classList.toggle('is-reduced', media.matches);
    root.dataset.playback = media.matches ? 'static' : running ? 'playing' : finished ? 'complete' : started ? 'paused' : 'ready';
    bindText(play.querySelector('[data-method-play-label]') || play, running ? 'lab.pause' : 'lab.play', running ? 'Pause' : 'Play');
    play.setAttribute('aria-label', text(running ? 'lab.pause' : 'lab.play', running ? 'Pause' : 'Play'));
    play.setAttribute('aria-pressed', String(running));
    play.disabled = media.matches;
    bindText(root.querySelector('[data-method-status]'), `lab.status.${media.matches ? 'reduced' : running ? 'playing' : finished ? 'complete' : started ? 'paused' : 'ready'}`);
  }
  function setPhase(value) {
    phase = value;
    root.dataset.phase = String(value);
    steps.forEach(button => {
      const active = Number(button.dataset.methodStage) === value;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    bindText(root.querySelector('[data-method-description]'), value === 'complete' ? 'lab.description' : `lab.phaseBody.${value}`);
  }
  function stopFrame() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = null;
  }
  function tick(now) {
    if (!intendedPlay || !visible || document.hidden || media.matches) { stopFrame(); status(); return; }
    if (previousTime !== null) elapsed = Math.min(duration, elapsed + Math.max(0, now - previousTime));
    previousTime = now;
    const nextPhase = Math.min(5, Math.floor(elapsed / phaseMs));
    if (phase !== nextPhase) setPhase(nextPhase);
    root.style.setProperty('--method-progress', String(elapsed / duration));
    root.style.setProperty('--phase-progress', String((elapsed % phaseMs) / phaseMs));
    if (elapsed >= duration) {
      finished = true;
      intendedPlay = false;
      stopFrame();
      setPhase('complete');
      status();
      return;
    }
    frame = requestAnimationFrame(tick);
  }
  function reconcilePlayback() {
    status();
    if (intendedPlay && visible && !document.hidden && !media.matches) {
      if (!frame) frame = requestAnimationFrame(tick);
    } else stopFrame();
  }
  function manualStop() {
    started = true; // Manual interaction cancels the pending one-time autoplay as well.
    intendedPlay = false;
    stopFrame();
    status();
  }
  function start(restart = false) {
    started = true;
    if (media.matches) {
      intendedPlay = false;
      finished = true;
      setPhase('complete');
      root.style.setProperty('--method-progress', '1');
      reconcilePlayback();
      return;
    }
    if (restart || finished) {
      elapsed = 0;
      finished = false;
      setPhase(0);
    }
    intendedPlay = true;
    reconcilePlayback();
  }
  function highlight() {
    const active = hover || focus || selected;
    root.dataset.highlightExpert = active || '';
    root.querySelectorAll('.ml-lane[data-lane]').forEach(lane => {
      lane.classList.toggle('is-focused', lane.dataset.lane === active);
      lane.classList.toggle('is-muted', Boolean(active && lane.dataset.lane !== active));
    });
  }
  function setMobile(expert) {
    mobile = expert;
    root.dataset.mobileExpert = expert;
    root.querySelectorAll('[data-expert-tab]').forEach(button => {
      const active = button.dataset.expertTab === expert;
      button.setAttribute('aria-pressed', String(active));
      button.tabIndex = active ? 0 : -1;
    });
  }
  function setDetailStep(value) {
    detailStep = Math.min(4, Math.max(0, value));
    detail.dataset.detailStage = String(detailStep);
    detail.querySelectorAll('[data-detail-stage]').forEach(button => {
      const active = Number(button.dataset.detailStage) === detailStep;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', active ? 'step' : 'false');
      button.tabIndex = 0;
    });
    detail.querySelectorAll('[data-detail-panel]').forEach(panel => { panel.hidden = Number(panel.dataset.detailPanel) !== detailStep; });
    detail.querySelectorAll('[data-detail-prev]').forEach(button => { button.disabled = detailStep === 0; });
    detail.querySelectorAll('[data-detail-next]').forEach(button => { button.disabled = detailStep === 4; });
  }
  function select(expert, { restoreFocus = false } = {}) {
    manualStop();
    selected = expert;
    hover = null;
    focus = null;
    root.dataset.mode = expert ? 'explore' : 'overview';
    root.querySelectorAll('[data-method-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.methodMode === root.dataset.mode)));
    root.querySelectorAll('[data-expert]').forEach(button => {
      const active = button.dataset.expert === expert;
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-expanded', String(active));
      button.setAttribute('aria-controls', detail.id);
    });
    detail.hidden = !expert;
    detail.querySelectorAll('[data-expert-detail]').forEach(panel => { panel.hidden = panel.dataset.expertDetail !== expert; });
    if (expert) {
      setMobile(expert);
      setDetailStep(0);
      const heading = detail.querySelector('[data-detail-heading]');
      heading?.focus({ preventScroll: true });
      if (heading && (heading.getBoundingClientRect().top < 84 || heading.getBoundingClientRect().top > innerHeight * .6)) heading.scrollIntoView({ block: 'start', behavior: 'instant' });
    } else {
      elapsed = duration;
      finished = true;
      root.style.setProperty('--method-progress', '1');
      setPhase('complete');
      if (restoreFocus) {
        const target = returnFocus?.dataset.expert
          ? root.querySelector(`.ml-lane [data-expert="${mobile}"]`)
          : returnFocus?.isConnected ? returnFocus : root.querySelector('[data-method-mode="overview"]');
        target?.focus({ preventScroll: true });
      }
    }
    highlight();
    status();
  }
  root.querySelectorAll('[data-expert]').forEach(button => {
    const expert = button.dataset.expert;
    if (!experts.includes(expert)) return;
    on(button, 'click', () => {
      if (!detail.contains(button)) returnFocus = button;
      select(selected === expert ? null : expert);
    });
    on(button, 'pointerenter', event => { if (event.pointerType !== 'touch') { hover = expert; highlight(); } });
    on(button, 'pointerleave', () => { hover = null; highlight(); });
    on(button, 'focus', () => { focus = expert; highlight(); });
    on(button, 'blur', () => { focus = null; highlight(); });
  });
  root.querySelectorAll('[data-expert-tab]').forEach(button => {
    on(button, 'click', () => {
      manualStop();
      const expert = button.dataset.expertTab;
      setMobile(expert);
      if (selected) select(selected === expert ? null : expert, { restoreFocus: selected === expert });
    });
    on(button, 'keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = experts.indexOf(mobile);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
      manualStop();
      setMobile(experts[next]);
      if (selected) select(experts[next]);
      button.parentElement.querySelector(`[data-expert-tab="${experts[next]}"]`)?.focus({ preventScroll: true });
    });
  });
  root.querySelectorAll('[data-method-mode]').forEach(button => on(button, 'click', () => {
    if (button.dataset.methodMode === 'explore') returnFocus = button;
    select(button.dataset.methodMode === 'explore' ? selected || mobile : null);
  }));
  root.querySelectorAll('[data-method-overview]').forEach(button => on(button, 'click', () => select(null, { restoreFocus: true })));
  on(root, 'keydown', event => {
    if (event.key === 'Escape' && selected) { event.preventDefault(); select(null, { restoreFocus: true }); }
  });
  steps.forEach(button => on(button, 'click', () => {
    if (selected) select(null);
    manualStop();
    elapsed = Number(button.dataset.methodStage) * phaseMs;
    finished = false;
    setPhase(Number(button.dataset.methodStage));
    root.style.setProperty('--method-progress', String(elapsed / duration));
    status();
  }));
  detail.querySelectorAll('[data-detail-stage]').forEach(button => {
    on(button, 'click', () => { manualStop(); setDetailStep(Number(button.dataset.detailStage)); });
    on(button, 'keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 4 : (detailStep + (event.key === 'ArrowRight' ? 1 : 4)) % 5;
      manualStop();
      setDetailStep(next);
      const panel = button.closest('[data-expert-detail]') || detail;
      panel.querySelector(`[data-detail-stage="${next}"]`)?.focus({ preventScroll: true });
    });
  });
  detail.querySelectorAll('[data-detail-next]').forEach(button => on(button, 'click', () => { manualStop(); setDetailStep(detailStep + 1); }));
  detail.querySelectorAll('[data-detail-prev]').forEach(button => on(button, 'click', () => { manualStop(); setDetailStep(detailStep - 1); }));
  on(play, 'click', () => {
    if (intendedPlay) manualStop();
    else { if (selected) select(null); start(); }
  });
  on(replay, 'click', () => { select(null); hover = null; focus = null; highlight(); start(true); });
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    root.dataset.inView = String(visible);
    if (visible && !started && !media.matches) start(true);
    else reconcilePlayback();
  }, { threshold: 0, rootMargin: '-75px 0px -40px 0px' });
  on(document, 'visibilitychange', reconcilePlayback);
  on(window, 'pagehide', stopFrame);
  on(window, 'pageshow', reconcilePlayback);
  on(window, 'site:languagechange', () => { status(); setPhase(phase); });
  on(media, 'change', () => {
    if (media.matches) {
      intendedPlay = false;
      started = true;
      finished = true;
      elapsed = duration;
      root.style.setProperty('--method-progress', '1');
      setPhase('complete');
    }
    reconcilePlayback();
  });
  setMobile(mobile);
  setPhase('complete');
  status();
  root.classList.add('is-enhanced');
  observer.observe(root);
  window.__socialMethodCleanup = () => { stopFrame(); observer.disconnect(); abort.abort(); root.classList.remove('is-enhanced', 'is-running'); };
})();
