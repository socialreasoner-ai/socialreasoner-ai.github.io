/* Figure 4 and Figure 7 presentation. The published percentages stay untouched;
   only SVG arc lengths are normalized when rounded shares do not total 100. */
(function () {
  "use strict";

  const SERIES = [
    { id: "human", key: "population.human" },
    { id: "base", key: "population.base" },
    { id: "ours", key: "population.ours" }
  ];

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function safeColor(value) {
    return /^#[0-9a-f]{3,8}$/i.test(String(value)) ? value : "#8bd8ff";
  }

  function fixed(number, value, digits) {
    return escapeHtml(number(Number(value), digits));
  }

  function polar(angle, radius) {
    return [90 + Math.cos(angle) * radius, 90 + Math.sin(angle) * radius];
  }

  function arcPath(start, end) {
    const outer = 76;
    const inner = 40;
    const [x1, y1] = polar(start, outer);
    const [x2, y2] = polar(end, outer);
    const [x3, y3] = polar(end, inner);
    const [x4, y4] = polar(start, inner);
    const large = end - start > Math.PI ? 1 : 0;
    return `M ${x1.toFixed(3)} ${y1.toFixed(3)} A ${outer} ${outer} 0 ${large} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} L ${x3.toFixed(3)} ${y3.toFixed(3)} A ${inner} ${inner} 0 ${large} 0 ${x4.toFixed(3)} ${y4.toFixed(3)} Z`;
  }

  function renderDonut(item, series, t, number) {
    const shares = item.shares[series.id] || [];
    const total = shares.reduce((sum, share) => sum + Math.max(0, Number(share) || 0), 0);
    let angle = -Math.PI / 2;
    const arcs = item.options.map((option, index) => {
      const value = Math.max(0, Number(shares[index]) || 0);
      if (value <= 0 || total <= 0) return "";
      const span = value / total * Math.PI * 2;
      // A tiny gap keeps neighboring categories distinguishable without
      // changing the data values shown in the adjacent table.
      const gap = Math.min(0.009, span / 7);
      const start = angle + gap;
      const end = angle + span - gap;
      angle += span;
      const mid = (start + end) / 2;
      const [labelX, labelY] = polar(mid, 58);
      const label = value >= 10 ? `<text class="population-arc-value" x="${labelX.toFixed(2)}" y="${labelY.toFixed(2)}">${fixed(number, shares[index], 1)}%</text>` : "";
      return `<g class="population-segment" data-option-index="${index}"><path class="population-arc" d="${arcPath(start, end)}" fill="${safeColor(option.color)}"></path>${label}</g>`;
    }).join("");
    const aria = `${t(series.key)}: ${item.options.map((option, index) => `${t(option.labelKey)} ${number(shares[index], 1)}%`).join(", ")}`;
    const tvd = item.tvd && series.id !== "human" && Number.isFinite(item.tvd[series.id])
      ? `<span class="population-donut-distance">${escapeHtml(t("population.tvd"))} <strong>${fixed(number, item.tvd[series.id], 3)}</strong></span>`
      : "";
    return `<div class="population-donut-column population-donut-${series.id}">
      <h5>${escapeHtml(t(series.key))}</h5>
      <svg class="population-donut" viewBox="0 0 180 180" role="img" aria-label="${escapeHtml(aria)}">
        <circle class="population-donut-bed" cx="90" cy="90" r="76"></circle>${arcs}
        <circle class="population-donut-core" cx="90" cy="90" r="35"></circle>
      </svg>${tvd}
    </div>`;
  }

  function renderTable(item, t, number) {
    const headers = SERIES.map(series => {
      const label = escapeHtml(t(series.key));
      // Let the brand break at its natural word boundary in narrow tables.
      return `<span role="columnheader">${series.id === "ours" ? label.replace("SocialReasoner", "Social<wbr>Reasoner") : label}</span>`;
    }).join("");
    const rows = item.options.map((option, index) => {
      const label = t(option.labelKey);
      const cells = SERIES.map(series => `<span class="population-share-value" role="cell">${fixed(number, item.shares[series.id][index], 1)}%</span>`).join("");
      return `<div class="population-share-row" role="row" data-option-index="${index}"><div role="rowheader"><button type="button" class="population-option-button" data-option-index="${index}" aria-pressed="false" aria-label="${escapeHtml(t("population.highlightOption"))}: ${escapeHtml(label)}"><span class="population-option-dot" style="--option-color:${safeColor(option.color)}" aria-hidden="true"></span><span>${escapeHtml(label)}</span></button></div>${cells}</div>`;
    }).join("");
    return `<div class="population-table-wrap"><p class="population-table-caption">${escapeHtml(t("population.share"))}</p><div class="population-share-table" role="table" aria-label="${escapeHtml(t("population.share"))}"><div class="population-table-head" role="row"><span role="columnheader">${escapeHtml(t("population.option"))}</span>${headers}</div><div role="rowgroup">${rows}</div></div></div>`;
  }

  function renderCase(item, t, number, aggregate) {
    const title = t(item.titleKey);
    const note = aggregate ? t("population.harmonized") : t(item.questionKey);
    return `<article class="population-case${aggregate ? " population-case-aggregate" : ""}" data-population-case="${escapeHtml(item.id)}" aria-label="${escapeHtml(title)}">
      <header class="population-case-head"><div class="population-case-copy"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(note)}</p></div><div class="population-source">${escapeHtml(item.source)}<span aria-hidden="true">·</span>${escapeHtml(item.dataset)}<span aria-hidden="true">·</span>${escapeHtml(item.backbone)}</div></header>
      <div class="population-case-body"><div class="population-donut-grid">${SERIES.map(series => renderDonut(item, series, t, number)).join("")}</div>${renderTable(item, t, number)}</div>
    </article>`;
  }

  function renderMetric(metric, t, number) {
    const methods = [
      { id: "base", key: "population.base" },
      { id: "subpop", key: "population.subpop" },
      { id: "ours", key: "population.ours" }
    ];
    const max = Math.max(0.001, Number(metric.axisMax) || 1);
    const precision = Math.max(0, Math.min(6, Number(metric.precision) || 0));
    const bars = methods.map(method => {
      const value = Math.max(0, Number(metric.values[method.id]) || 0);
      const height = Math.max(0, Math.min(100, value / max * 100));
      return `<div class="population-metric-item population-method-${method.id}" style="--bar-height:${height.toFixed(3)}%"><strong class="population-metric-value">${fixed(number, metric.values[method.id], precision)}</strong><span class="population-metric-bar" aria-hidden="true"></span><span class="population-metric-method">${escapeHtml(t(method.key))}</span></div>`;
    }).join("");
    const accessible = `${metric.label}: ${methods.map(method => `${t(method.key)} ${number(metric.values[method.id], precision)}`).join(", ")}`;
    return `<article class="population-metric-card" aria-label="${escapeHtml(accessible)}"><header><span class="population-metric-acronym">${escapeHtml(metric.label)}</span><h5>${escapeHtml(t(metric.nameKey))}</h5></header><div class="population-metric-plot"><div class="population-metric-scale" aria-hidden="true"><span>${fixed(number, max, precision)}</span><span>0</span></div><div class="population-metric-bars">${bars}</div></div></article>`;
  }

  function renderMarkup(data, t, number) {
    if (!data || !data.aggregate || !Array.isArray(data.cases) || !data.comparison) return "";
    const translate = typeof t === "function" ? t : key => key;
    const formatNumber = typeof number === "function" ? number : (value, digits) => Number(value).toFixed(digits);
    const comparison = data.comparison;
    return `<div class="population-results">
      <div class="population-results-head"><p class="population-overline">${escapeHtml(translate("population.kicker"))}</p><h3>${escapeHtml(translate("population.heading"))}</h3></div>
      ${renderCase(data.aggregate, translate, formatNumber, true)}
      <div class="population-group-head"><h3>${escapeHtml(translate("population.examplesTitle"))}</h3><span>${escapeHtml(data.cases[0]?.source || "")}</span></div>
      <div class="population-case-list">${data.cases.map(item => renderCase(item, translate, formatNumber, false)).join("")}</div>
      <section class="population-comparison" aria-label="${escapeHtml(translate("population.comparisonTitle"))}"><header class="population-comparison-head"><div><p class="population-overline">${escapeHtml(comparison.source)} <span aria-hidden="true">·</span> ${escapeHtml(comparison.dataset)} <span aria-hidden="true">·</span> ${escapeHtml(comparison.backbone)}</p><h3>${escapeHtml(translate("population.comparisonTitle"))}</h3></div><p>${escapeHtml(translate("population.comparisonNote"))}</p></header><div class="population-metric-grid">${comparison.metrics.map(metric => renderMetric(metric, translate, formatNumber)).join("")}</div></section>
    </div>`;
  }

  window.SocialPopulation = { renderMarkup };
  if (typeof document === "undefined") return;

  const selectedByCase = new Map();
  let mount = null;

  function applyHighlight(caseNode, index) {
    if (!caseNode) return;
    const active = Number.isInteger(index) ? index : -1;
    caseNode.dataset.activeOption = String(active);
    caseNode.querySelectorAll(".population-segment, .population-share-row").forEach(node => {
      const match = Number(node.dataset.optionIndex) === active;
      node.classList.toggle("is-highlighted", active >= 0 && match);
      node.classList.toggle("is-muted", active >= 0 && !match);
    });
    caseNode.querySelectorAll(".population-option-button").forEach(button => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.optionIndex) === selectedByCase.get(caseNode.dataset.populationCase)));
    });
  }

  function restore(caseNode) {
    applyHighlight(caseNode, selectedByCase.get(caseNode.dataset.populationCase));
  }

  function formatSiteNumber(value, digits) {
    return window.SiteI18n.number(value, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function renderClient() {
    if (!mount || !window.SiteI18n || !window.SOCIAL_POPULATION_RESULTS) return;
    mount.innerHTML = renderMarkup(window.SOCIAL_POPULATION_RESULTS, window.SiteI18n.t, formatSiteNumber);
    mount.querySelectorAll("[data-population-case]").forEach(restore);
  }

  function init() {
    mount = document.getElementById("population-results");
    if (!mount) return;
    // Keep complete generated English markup in place before enhancement.
    if (window.SiteI18n && window.SOCIAL_POPULATION_RESULTS && (window.SiteI18n.language !== "en" || !mount.textContent.trim())) renderClient();
    mount.addEventListener("click", event => {
      const button = event.target.closest(".population-option-button");
      if (!button || !mount.contains(button)) return;
      const caseNode = button.closest("[data-population-case]");
      const key = caseNode.dataset.populationCase;
      const index = Number(button.dataset.optionIndex);
      if (selectedByCase.get(key) === index) selectedByCase.delete(key);
      else selectedByCase.set(key, index);
      restore(caseNode);
    });
    mount.addEventListener("focusin", event => {
      const button = event.target.closest(".population-option-button");
      if (button) applyHighlight(button.closest("[data-population-case]"), Number(button.dataset.optionIndex));
    });
    mount.addEventListener("focusout", event => {
      const caseNode = event.target.closest("[data-population-case]");
      if (caseNode) requestAnimationFrame(() => {
        const focused = document.activeElement?.closest?.(".population-option-button");
        if (focused && focused.closest("[data-population-case]") === caseNode) applyHighlight(caseNode, Number(focused.dataset.optionIndex));
        else restore(caseNode);
      });
    });
    mount.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      const caseNode = event.target.closest("[data-population-case]");
      if (!caseNode) return;
      selectedByCase.delete(caseNode.dataset.populationCase);
      restore(caseNode);
    });
    window.addEventListener("site:languagechange", renderClient);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
