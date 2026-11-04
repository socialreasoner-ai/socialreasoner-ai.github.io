/* Native navigation and case connectors. No smooth-scroll layer or pointer parallax. */
(() => {
  const links = [...document.querySelectorAll('.desktop-nav a, .mobile-nav a')];
  const sections = ['idea','approach','evidence','coverage','release'].map(id => document.getElementById(id)).filter(Boolean);
  let frame = 0;
  function updateNavigation() {
    frame = 0;
    let current = '';
    for (const section of sections) if (section.getBoundingClientRect().top <= 180) current = section.id;
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = 'release';
    links.forEach(link => {
      if (link.hash === '#' + current) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(updateNavigation); }
  window.addEventListener('scroll', schedule, { passive:true });
  window.addEventListener('resize', schedule, { passive:true });
  window.addEventListener('pageshow', schedule);
  updateNavigation();

  const article = document.querySelector('.worked-example');
  const layout = article?.querySelector('.example-layout');
  const svg = article?.querySelector('.case-connections');
  function updateWires() {
    if (!svg || !layout || window.innerWidth <= 1150) return;
    const evidence = article.querySelector('.profile-evidence .is-highlighted');
    const summary = article.querySelector('#reasoning-summary .is-highlighted');
    if (!evidence || !summary) return;
    const box = layout.getBoundingClientRect();
    const from = evidence.getBoundingClientRect();
    const to = article.querySelector('.reasoning-card').getBoundingClientRect();
    const result = article.querySelector('.case-outcome').getBoundingClientRect();
    const y1 = from.top - box.top + from.height / 2;
    const y2 = Math.max(35, Math.min(to.height - 25, summary.getBoundingClientRect().top - to.top + 10)) + to.top - box.top;
    const x1 = from.right - box.left;
    const x2 = to.left - box.left;
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    svg.querySelector('.evidence-wire').setAttribute('d', `M${x1},${y1} C${x1+20},${y1} ${x2-20},${y2} ${x2},${y2}`);
    const x3 = to.right - box.left, x4 = result.left - box.left;
    svg.querySelector('.prediction-wire').setAttribute('d', `M${x3},${y2} C${x3+20},${y2} ${x4-20},55 ${x4},55`);
  }
  const observer = article ? new MutationObserver(updateWires) : null;
  observer?.observe(article, { attributes:true, attributeFilter:['data-evidence-active'] });
  const resize = typeof ResizeObserver === 'function' && layout ? new ResizeObserver(updateWires) : null;
  resize?.observe(layout);
  window.addEventListener('site:languagechange',updateWires);
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    observer?.disconnect(); resize?.disconnect();
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    if (article) observer?.observe(article, { attributes:true, attributeFilter:['data-evidence-active'] });
    if (layout) resize?.observe(layout);
    schedule(); updateWires();
  });
})();
