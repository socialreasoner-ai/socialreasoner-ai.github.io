/* One controller owns the geographic selection, the scene and renderer lifecycle. */
(() => {
  window.__globeCleanup?.();
  const host = document.querySelector('.globe-hero');
  const experience = document.querySelector('.globe-experience');
  const stage = host?.querySelector('.globe-stage');
  const originalCanvas = document.querySelector('#globe-canvas');
  if (!host || !stage || !originalCanvas) return;

  const controller = new AbortController();
  let disposed = false;
  let store = null;
  let publicApi = null;
  let fallbackRenderer = null;
  let activeRenderer = null;
  let reader = null;
  let activePersonId = '';
  let scene = 'overview';
  let showcaseDataset = '';
  let requestNumber = 0;
  let skippedRequest = 0;
  let shown = { renderer: null, dataset: '', count: -1 };
  let webglCanvas = null;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    new URLSearchParams(window.location?.search || '').get('motion') === 'reduce';
  const fallbackPeople = document.createElement('div');
  fallbackPeople.className = 'globe-fallback-people';
  fallbackPeople.hidden = true;
  stage.append(fallbackPeople);

  const bind = (element, type, fn) => element?.addEventListener(type, fn, { signal: controller.signal });
  function refreshAvatarControls() {
    const controls = document.querySelector('#avatar-controls');
    if (!controls) return;
    controls.hidden = !['entering', 'reading'].includes(scene) || activeRenderer === fallbackRenderer;
    const people = reader?.getParticipants(showcaseDataset) || [];
    if (!people.some(person => person.displayId === activePersonId)) activePersonId = people[0]?.displayId || '';
    controls.querySelectorAll('[data-avatar-person]').forEach(button => {
      const person = people[Number(button.dataset.avatarPerson)];
      button.disabled = !person;
      button.setAttribute('aria-pressed', String(person?.displayId === activePersonId));
    });
    const modeled = Boolean(people.find(person => person.displayId === activePersonId)?.avatar?.modelPath);
    const motionControls = controls.querySelector('.avatar-motion-switch');
    if (motionControls) motionControls.hidden = !modeled;
    const status = activeRenderer?.getCharacterStatus?.(activePersonId) || 'loading';
    controls.querySelectorAll('[data-avatar-action]').forEach(button => { button.disabled = status !== 'ready' || scene !== 'reading'; });
    const label = controls.querySelector('.avatar-model-status');
    if (label) {
      label.textContent = status === 'ready' ? '' : window.SiteI18n?.t?.(`respondent.${status === 'fallback' ? 'modelUnavailable' : 'modelLoading'}`) || '';
      label.hidden = !modeled || status === 'ready';
    }
  }
  function activatePerson(id) {
    activePersonId = id;
    activeRenderer?.setActivePerson?.(id);
    refreshAvatarControls();
  }
  function setScene(next) {
    scene = next;
    host.dataset.scene = next;
    if (experience) experience.dataset.scene = next;
    const reading = ['focusing', 'entering', 'reading'].includes(next);
    reader?.setVisible(reading);
    fallbackPeople.hidden = !reading || activeRenderer !== fallbackRenderer;
    const open = document.querySelector('#showcase-open');
    const back = document.querySelector('#showcase-back');
    const skip = document.querySelector('#showcase-skip');
    if (open) {
      const selected = store?.getSelection().dataset;
      const available = selected && selected !== 'all' && reader?.hasReadyPair(selected);
      open.hidden = reading || !available;
      open.disabled = !store?.getSelection().ready || !available;
    }
    if (back) back.hidden = !reading;
    if (skip) skip.hidden = !['focusing', 'entering'].includes(next);
    refreshAvatarControls();
  }
  setScene('overview');

  function paintFallbackPeople(participants) {
    fallbackPeople.replaceChildren();
    participants.forEach((person, index) => {
      const figure = document.createElement('figure');
      figure.className = 'globe-fallback-person';
      const image = document.createElement('img');
      image.alt = '';
      image.loading = 'lazy';
      image.src = person.avatar?.posterPath || '';
      const label = document.createElement('figcaption');
      label.textContent = `${index ? 'B' : 'A'} · ${person.displayId || ''}`;
      figure.append(image, label);
      fallbackPeople.append(figure);
    });
  }
  function allParticipants() {
    return store?.getData()?.datasets.flatMap(item => reader?.getParticipants(item.id) || []) || [];
  }
  function showOnRenderer(dataset, participants) {
    const renderer = activeRenderer;
    if (!renderer || renderer === fallbackRenderer) return;
    if (shown.renderer === renderer && shown.dataset === dataset && shown.count === participants.length) return;
    try { renderer.setShowcase(dataset, participants); }
    catch (error) { useFallback(error); return; }
    shown = { renderer, dataset, count: participants.length };
  }

  function enterShowcase(dataset) {
    if (disposed || !store?.getData() || dataset === 'all' || !store.getDataset(dataset)
      || !reader?.hasReadyPair(dataset)) return;
    if (showcaseDataset === dataset && ['focusing', 'entering', 'reading'].includes(scene)) return;
    showcaseDataset = dataset;
    requestNumber += 1;
    skippedRequest = 0;
    const request = requestNumber;
    reader?.setDataset(dataset);
    const participants = reader?.getParticipants(dataset) || [];
    activePersonId = reader?.getActivePerson?.() || participants[0]?.displayId || '';
    paintFallbackPeople(participants);
    setScene(reducedMotion() ? 'reading' : 'focusing');
    if (activeRenderer === fallbackRenderer) {
      fallbackRenderer?.setPaused(false);
      setScene('reading');
    } else {
      showOnRenderer(dataset, participants);
    }
    reader?.ready?.then(() => {
      if (disposed || request !== requestNumber || showcaseDataset !== dataset) return;
      const readyParticipants = reader.getParticipants(dataset) || [];
      if (!readyParticipants.some(person => person.displayId === activePersonId)) activePersonId = reader?.getActivePerson?.() || readyParticipants[0]?.displayId || '';
      paintFallbackPeople(readyParticipants);
      activeRenderer?.setParticipants?.(allParticipants());
      if (activeRenderer !== fallbackRenderer) {
        showOnRenderer(dataset, readyParticipants);
        activeRenderer?.setActivePerson?.(activePersonId);
        if (skippedRequest === request) activeRenderer?.skip?.();
      }
      refreshAvatarControls();
    }).catch(error => console.warn('Respondent display unavailable:', error));
  }

  function closeShowcase() {
    if (!showcaseDataset && scene === 'overview') return;
    requestNumber += 1;
    showcaseDataset = '';
    shown = { renderer: null, dataset: '', count: -1 };
    reader?.setVisible(false);
    activeRenderer?.closeShowcase?.();
    setScene('overview');
  }

  function openDatasetShowcase(dataset) {
    if (!store?.getData()) return;
    if (dataset === 'all') {
      closeShowcase();
      store.clearAll();
      return;
    }
    if (!reader?.hasReadyPair(dataset)) {
      closeShowcase();
      store.setDataset(dataset);
      return;
    }
    const changed = store.openDatasetShowcase(dataset);
    if (!changed) enterShowcase(dataset);
  }

  function selectPerson(id, person) {
    if (!person?.datasetId || !id || store?.getSelection().selectedRegion) return;
    if (scene === 'overview') openDatasetShowcase(person.datasetId);
    if (showcaseDataset !== person.datasetId) return;
    reader?.setActivePerson(id);
    const request = requestNumber;
    reader?.ready?.then(() => {
      if (!disposed && request === requestNumber && showcaseDataset === person.datasetId) reader.setActivePerson(id);
    }).catch(() => {});
  }

  function onSelection(selection, { intent } = {}) {
    if (disposed) return;
    if (intent === 'showcase' && selection.dataset !== 'all' && reader?.hasReadyPair(selection.dataset)) {
      enterShowcase(selection.dataset);
    } else if (showcaseDataset) {
      closeShowcase();
    }
    try { activeRenderer?.setSelection?.(selection, { intent }); }
    catch (error) { useFallback(error); }
    setScene(scene);
  }

  function wireControls() {
    bind(stage, 'avatar:statuschange', refreshAvatarControls);
    bind(window, 'site:languagechange', refreshAvatarControls);
    bind(document.querySelector('#avatar-controls'), 'click', event => {
      const personButton = event.target.closest?.('[data-avatar-person]');
      if (personButton) {
        const person = reader?.getParticipants(showcaseDataset)?.[Number(personButton.dataset.avatarPerson)];
        if (person) { reader?.setActivePerson(person.displayId); activatePerson(person.displayId); }
      }
      const actionButton = event.target.closest?.('[data-avatar-action]');
      if (actionButton && !actionButton.disabled) activeRenderer?.playAction?.(actionButton.dataset.avatarAction, activePersonId);
    });
    bind(document.querySelector('#showcase-open'), 'click', () => openDatasetShowcase(store?.getSelection().dataset));
    bind(document.querySelector('#showcase-back'), 'click', closeShowcase);
    bind(document.querySelector('#showcase-skip'), 'click', () => {
      skippedRequest = requestNumber;
      activeRenderer?.skip?.();
      setScene('reading');
    });
    bind(document.querySelector('#showcase-all'), 'click', () => {
      closeShowcase();
      store?.clearAll();
    });
  }

  function useFallback(error) {
    if (disposed) return;
    if (activeRenderer === fallbackRenderer && !webglCanvas) return;
    const failedRenderer = activeRenderer && activeRenderer !== fallbackRenderer ? activeRenderer : null;
    activeRenderer = fallbackRenderer;
    shown = { renderer: null, dataset: '', count: -1 };
    try { failedRenderer?.dispose?.(); }
    catch (disposeError) { console.warn('3D cleanup:', disposeError); }
    webglCanvas?.remove();
    webglCanvas = null;
    stage.dataset.renderer = '2d';
    originalCanvas.hidden = false;
    fallbackRenderer?.resize?.();
    fallbackRenderer?.setPaused(false);
    setScene(showcaseDataset ? 'reading' : 'overview');
    console.warn('3D globe unavailable; showing map:', error);
  }

  async function initialize() {
    const [{ createCoverageState }, { createGlobeRenderer2d }] = await Promise.all([
      import('./coverage-state.js'), import('./globe-renderer-2d.js')
    ]);
    if (disposed) return;
    store = createCoverageState();
    publicApi = Object.freeze({
      getSelection: store.getSelection,
      setDataset: store.setDataset,
      setRegion: store.setRegion,
      setSelection: store.setSelection,
      regionName: store.regionName,
      getGeographyPromise: store.getGeographyPromise,
      openDatasetShowcase,
      enterCoverage: closeShowcase
    });
    window.SocialCoverage = publicApi;
    store.subscribe(onSelection);
    wireControls();
    reader = window.createRespondentExplorer?.({
      host: document.querySelector('#respondent-explorer'), store,
      onActivePersonChange: activatePerson
    }) || null;
    reader?.ready?.then(() => { if (!disposed) setScene(scene); })
      .catch(error => console.warn('Respondent display unavailable:', error));
    fallbackRenderer = createGlobeRenderer2d({
      canvas: originalCanvas, host, store, onHeroDataset: openDatasetShowcase,
      onCoverageAction: closeShowcase,
      onResetView: () => { if (activeRenderer !== fallbackRenderer) activeRenderer?.resetView?.(); },
      onRotationChange: spinning => { if (activeRenderer !== fallbackRenderer) activeRenderer?.setPaused?.(!spinning); },
      onTouchRotateChange: enabled => { if (activeRenderer !== fallbackRenderer) activeRenderer?.setTouchRotate?.(enabled); }
    });
    activeRenderer = fallbackRenderer;
    stage.dataset.renderer = '2d';
    setScene('overview');
    await store.load();
    if (disposed) return;
    if (new URLSearchParams(window.location?.search || '').get('renderer') === '2d') return;
    try {
      const { createGlobeRenderer } = await import('./globe-renderer-3d.js?v=20261105-glb-r2');
      if (disposed) return;
      const frame = host.querySelector('.globe-frame');
      webglCanvas = document.createElement('canvas');
      webglCanvas.id = 'globe-canvas-3d';
      webglCanvas.className = 'globe-webgl-canvas';
      webglCanvas.setAttribute('aria-label', originalCanvas.getAttribute('aria-label') || 'Interactive globe');
      frame.append(webglCanvas);
      let rendererInstance = null;
      let failedDuringCreation = false;
      const renderer = await createGlobeRenderer({
        canvas: webglCanvas, host: stage, store,
        onRegionSelect: id => { closeShowcase(); store.setRegion(id); },
        onPersonSelect: selectPerson,
        onSceneChange: next => {
          if (!showcaseDataset || disposed || activeRenderer !== rendererInstance) return;
          const value = typeof next === 'string' ? next : next?.scene;
          if (['focusing', 'entering', 'reading'].includes(value)) setScene(value);
        },
        onFailure: error => { failedDuringCreation = true; useFallback(error); }
      });
      rendererInstance = renderer;
      if (disposed || failedDuringCreation) {
        renderer.dispose();
        if (failedDuringCreation && !disposed) stage.dataset.renderer = '2d';
        return;
      }
      activeRenderer = renderer;
      fallbackRenderer.setPaused(true);
      originalCanvas.hidden = true;
      renderer.setSelection(store.getSelection(), { intent: 'load' });
      reader?.ready?.then(() => {
        if (disposed || activeRenderer !== renderer) return;
        renderer.setParticipants?.(allParticipants());
        if (showcaseDataset) {
          showOnRenderer(showcaseDataset, reader.getParticipants(showcaseDataset) || []);
          if (skippedRequest === requestNumber) renderer.skip?.();
        }
      }).catch(error => console.warn('Respondent display unavailable:', error));
      setScene(scene);
    } catch (error) { useFallback(error); }
  }

  window.__globeCleanup = () => {
    if (disposed) return;
    disposed = true;
    requestNumber += 1;
    controller.abort();
    const safelyDispose = resource => {
      try { resource?.dispose?.(); }
      catch (error) { console.warn('Globe cleanup:', error); }
    };
    if (activeRenderer && activeRenderer !== fallbackRenderer) safelyDispose(activeRenderer);
    safelyDispose(fallbackRenderer);
    safelyDispose(reader);
    safelyDispose(store);
    if (window.SocialCoverage === publicApi) delete window.SocialCoverage;
    fallbackPeople.remove();
    webglCanvas?.remove();
    originalCanvas.hidden = false;
    delete stage.dataset.renderer;
  };
  initialize().catch(error => {
    if (!disposed) console.warn('Geographic coverage unavailable:', error);
  });
})();
