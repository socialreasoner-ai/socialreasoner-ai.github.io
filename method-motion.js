/* One native-scroll timeline for the existing method, with static HTML fallback. */
(() => {
  const journey = document.querySelector('.method-journey');
  if (!journey || !window.SiteI18n) return;
  const sticky = journey.querySelector('.journey-sticky');
  const buttons = [...journey.querySelectorAll('.journey-step')];
  const description = journey.querySelector('[data-journey-description]');
  const indexLabel = journey.querySelector('.journey-description-index');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (buttons.length !== 5 || !sticky || !description || !indexLabel) return;

  let current = 0;
  let start = 0;
  let travel = 1;
  let desktop = false;
  let frame = 0;
  let observing = null;
  let listening = false;
  let failedSize = '';

  function showStage(stage) {
    const next = Math.max(0, Math.min(4, stage));
    if (next === current && journey.dataset.currentStage === String(next)) return;
    current = next;
    journey.dataset.currentStage = String(next);
    buttons.forEach((button, index) => {
      button.classList.toggle('is-active', index === next);
      if (index === next) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    indexLabel.textContent = `${String(next + 1).padStart(2, '0')} / 05`;
    description.textContent = window.SiteI18n.t(`journey.${next}.body`);
  }

  function measure() {
    const candidate = innerWidth >= 1100 && innerHeight >= 800 && !reduced.matches;
    const sizeKey = `${innerWidth}:${innerHeight}:${window.SiteI18n.language}`;
    if (!candidate || (failedSize === sizeKey && !journey.classList.contains('journey-pinned'))) {
      journey.classList.remove('journey-pinned');
      desktop = false;
      return;
    }
    journey.classList.add('journey-pinned');
    const style = getComputedStyle(sticky);
    const top = parseFloat(style.top) || 0;
    const fits = sticky.scrollHeight <= innerHeight - top + 2
      && sticky.getBoundingClientRect().width >= 1080;
    if (!fits) {
      failedSize = sizeKey;
      journey.classList.remove('journey-pinned');
      desktop = false;
      return;
    }
    failedSize = '';
    desktop = true;
    const rect = journey.getBoundingClientRect();
    start = rect.top + scrollY - top;
    travel = Math.max(1, rect.height - sticky.offsetHeight);
    updateFromScroll();
  }

  function updateFromScroll() {
    frame = 0;
    if (!desktop) return;
    const progress = Math.max(0, Math.min(1, (scrollY - start) / travel));
    journey.style.setProperty('--journey-progress', progress.toFixed(4));
    showStage(Math.round(progress * 4));
  }

  function onScroll() {
    if (!frame) frame = requestAnimationFrame(updateFromScroll);
  }

  function goTo(stage) {
    if (!desktop) return;
    const next = Math.max(0, Math.min(4, stage));
    showStage(next);
    window.scrollTo({ top: start + travel * next / 4, behavior: 'auto' });
  }

  function onClick(event) {
    goTo(Number(event.currentTarget.dataset.journeyStage));
  }

  function onKeydown(event) {
    const index = Number(event.currentTarget.dataset.journeyStage);
    const key = event.key;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    const next = key === 'Home' ? 0 : key === 'End' ? 4
      : key === 'ArrowLeft' || key === 'ArrowUp' ? (index + 4) % 5 : (index + 1) % 5;
    goTo(next);
    buttons[next].focus();
  }

  function begin() {
    if (listening) return;
    listening = true;
    journey.classList.add('journey-enhanced');
    buttons.forEach(button => {
      button.addEventListener('click', onClick);
      button.addEventListener('keydown', onKeydown);
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('site:languagechange', localize);
    reduced.addEventListener('change', measure);
    if ('ResizeObserver' in window) {
      observing = new ResizeObserver(measure);
      observing.observe(sticky);
    }
    showStage(0);
    measure();
  }

  function localize() {
    description.textContent = window.SiteI18n.t(`journey.${current}.body`);
    measure();
  }

  function stop() {
    if (!listening) return;
    listening = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    observing?.disconnect();
    observing = null;
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', measure);
    window.removeEventListener('site:languagechange', localize);
    reduced.removeEventListener('change', measure);
    buttons.forEach(button => {
      button.removeEventListener('click', onClick);
      button.removeEventListener('keydown', onKeydown);
    });
  }

  begin();
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', event => { if (event.persisted) begin(); });
})();
