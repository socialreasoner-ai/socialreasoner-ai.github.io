/* One audited geographic index and one selection for the globe and Data section. */
const COUNTRY_CODES = {
  USA: 'US', ZAF: 'ZA', CHE: 'CH', FRA: 'FR', DEU: 'DE', PHL: 'PH', DNK: 'DK', RUS: 'RU',
  CZE: 'CZ', NOR: 'NO', JPN: 'JP', ISL: 'IS', FIN: 'FI', HRV: 'HR', SWE: 'SE', SVN: 'SI',
  AUT: 'AT', ESP: 'ES', SVK: 'SK', AUS: 'AU', POL: 'PL', LTU: 'LT', ISR: 'IL', HUN: 'HU',
  GEO: 'GE', ITA: 'IT', BEL: 'BE', CHL: 'CL', NZL: 'NZ', IND: 'IN', LVA: 'LV', THA: 'TH',
  VEN: 'VE', SUR: 'SR', BGR: 'BG', UKR: 'UA', EST: 'EE', TUR: 'TR', KOR: 'KR', NLD: 'NL',
  MEX: 'MX', AZE: 'AZ', BIH: 'BA', ARM: 'AM', PRT: 'PT', ALB: 'AL', ROU: 'RO', BLR: 'BY',
  SRB: 'RS', ARG: 'AR', MKD: 'MK', CYP: 'CY', MNE: 'ME'
};

export const validCount = value => Number.isInteger(value) && value >= 0;
export const highlightGroup = region => region?.highlightGroup || region?.id;
export const sharesHighlight = (region, active) => Boolean(region && active && highlightGroup(region) === highlightGroup(active));

export function createCoverageState({ fetcher = globalThis.fetch, eventTarget = globalThis.window } = {}) {
  const aborter = new AbortController();
  let disposed = false;
  let data = null;
  let geographyPromise = null;
  let worldPromise = null;
  let dataset = 'all';
  let selectedRegion = '';
  const regionById = new Map();
  const regionByNumeric = new Map();
  const datasetIndex = new Map();
  const displayNames = new Map();
  const subscribers = new Set();

  function getSelection() { return { ready: Boolean(data), dataset, selectedRegion }; }
  function getData() { return data; }
  function getRegion(id) { return regionById.get(id) || null; }
  function getRegionByNumeric(id) { return regionByNumeric.get(String(Number(id))) || null; }
  function getDataset(id = dataset) { return data?.datasets.find(item => item.id === id) || null; }
  function getSelectedTotal() { return dataset === 'all' ? data?.totalRespondents : getDataset()?.respondents; }
  function regionName(id) {
    const region = typeof id === 'string' ? getRegion(id) : id;
    if (!region) return typeof id === 'string' ? id : '';
    const lang = eventTarget?.SiteI18n?.language || 'en';
    const override = eventTarget?.SOCIAL_REGION_NAMES?.[lang]?.[region.id];
    if (override) return override;
    if (lang === 'en' || !COUNTRY_CODES[region.id] || !Intl.DisplayNames) return region.label;
    if (!displayNames.has(lang)) displayNames.set(lang, new Intl.DisplayNames(lang, { type: 'region' }));
    return displayNames.get(lang).of(COUNTRY_CODES[region.id]) || region.label;
  }
  function sampleFor(region, selectedDataset = dataset) {
    if (!region) return { status: 'unknown', count: null };
    if (selectedDataset === 'all') return validCount(region.count)
      ? { status: region.count > 0 ? 'covered' : 'none', count: region.count }
      : { status: 'unknown', count: null };
    const index = datasetIndex.get(selectedDataset);
    if (!index?.complete) return { status: 'unknown', count: null };
    const explicit = region.byDataset && Object.prototype.hasOwnProperty.call(region.byDataset, selectedDataset);
    const indexed = index.counts.get(region.id);
    if (explicit) {
      const count = region.byDataset[selectedDataset];
      if (!validCount(count) || (indexed === undefined ? count !== 0 : indexed !== count)) {
        return { status: 'unknown', count: null };
      }
      return { status: count > 0 ? 'covered' : 'none', count };
    }
    if (indexed !== undefined) return { status: 'unknown', count: null };
    return { status: 'none', count: 0 };
  }
  const countFor = (region, selectedDataset = dataset) => sampleFor(region, selectedDataset).count;
  const visibleRegions = () => data ? data.regions.filter(region => countFor(region) > 0) : [];

  function notify(intent) {
    if (disposed) return;
    const selection = getSelection();
    for (const subscriber of subscribers) {
      try { subscriber(selection, { intent }); }
      catch (error) { console.warn('Coverage subscriber:', error); }
    }
    if (eventTarget?.dispatchEvent && typeof CustomEvent === 'function') {
      eventTarget.dispatchEvent(new CustomEvent('social:coveragechange', {
        detail: { dataset: selection.dataset, selectedRegion: selection.selectedRegion }
      }));
    }
  }
  function setSelection(next, intent = 'coverage') {
    if (disposed || !data) return false;
    const nextDataset = next.dataset === undefined ? dataset : next.dataset;
    const nextRegion = next.selectedRegion === undefined ? selectedRegion : next.selectedRegion;
    if (nextDataset !== 'all' && !getDataset(nextDataset)) return false;
    if (nextRegion && !getRegion(nextRegion)) return false;
    if (dataset === nextDataset && selectedRegion === nextRegion) return false;
    dataset = nextDataset;
    selectedRegion = nextRegion;
    notify(intent);
    return true;
  }
  const setDataset = id => setSelection({ dataset: id }, 'coverage');
  const setRegion = id => setSelection({ selectedRegion: id || '' }, 'coverage');
  const openDatasetShowcase = id => setSelection({ dataset: id, selectedRegion: '' }, 'showcase');
  const clearAll = () => setSelection({ dataset: 'all', selectedRegion: '' }, 'coverage');
  function subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); }

  function getGeographyPromise() {
    if (!geographyPromise) geographyPromise = Promise.resolve().then(() => fetcher('assets/geography.json?v=20261104-point-audit-r1', { credentials: 'same-origin', signal: aborter.signal }))
      .then(response => { if (!response.ok) throw new Error('Coverage data unavailable'); return response.json(); })
      .then(value => {
        if (disposed) throw new DOMException('Coverage state disposed', 'AbortError');
        if (value.schemaVersion !== 1 || !Array.isArray(value.regions) || !Array.isArray(value.datasets)) throw new Error('Unexpected coverage format');
        data = value;
        for (const region of value.regions) {
          regionById.set(region.id, region);
          if (region.numericId) regionByNumeric.set(String(Number(region.numericId)), region);
        }
        for (const item of value.datasets) {
          const counts = new Map();
          let complete = Array.isArray(item.regions);
          for (const region of Array.isArray(item.regions) ? item.regions : []) {
            if (!regionById.has(region.id) || !validCount(region.count) || counts.has(region.id)) complete = false;
            else counts.set(region.id, region.count);
          }
          if (!validCount(item.respondents) || [...counts.values()].reduce((sum, n) => sum + n, 0) !== item.respondents) complete = false;
          datasetIndex.set(item.id, { counts, complete });
        }
        notify('load');
        return data;
      });
    return geographyPromise;
  }
  function getWorldPromise() {
    if (!worldPromise) worldPromise = Promise.resolve().then(() => fetcher('assets/world-110m.json?v=20261104-regions', { credentials: 'same-origin', signal: aborter.signal }))
      .then(response => { if (!response.ok) throw new Error('World geometry unavailable'); return response.json(); })
      .then(value => { if (!value.objects?.countries) throw new Error('Unexpected world geometry'); return value; });
    return worldPromise;
  }
  function dispose() { if (disposed) return; disposed = true; subscribers.clear(); aborter.abort(); }
  return Object.freeze({ load: getGeographyPromise, getGeographyPromise, getWorldPromise, getData, getSelection,
    getRegion, getRegionByNumeric, getDataset, getSelectedTotal, sampleFor, countFor, visibleRegions,
    regionName, setSelection, setDataset, setRegion, openDatasetShowcase, clearAll, subscribe, dispose });
}
