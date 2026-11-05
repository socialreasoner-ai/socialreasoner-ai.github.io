# SocialReasoner project website

Website: https://socialreasoner-ai.github.io/

Research title: **Learning a Foundation Model of Human Social Reasoning from Heterogeneous Experts**.

This repository contains the public project website. Data, code, and model releases are forthcoming.

## Local preview

Run `python3 -m http.server 8000` in this directory and open http://localhost:8000/.
No build step is required.

## Deployment

GitHub Pages publishes the root of the `main` branch. Push website changes to that branch and wait for the Pages deployment to complete.

## Release links

Set the three entries of `RELEASE_URLS` at the top of `app.js` when ready:

- `data`: the Hugging Face dataset URL
- `code`: the GitHub code repository URL
- `model`: the Hugging Face model URL

Empty values display Coming soon. Valid URLs activate both the homepage and release section entries.

## Content

The benchmark presents accuracy (%) for eight main evaluation datasets. GSS2022 is a separate held-out transfer evaluation. The interactive globe displays survey-region aggregates for the manuscript data version. Background stars are decorative.

The project is presented as a research preview. Release URLs and final publication metadata can be added when available.

The default-visible Method diagram uses three independent expert lanes, with native HTML and locally drawn SVG model structures. Six stages trace inputs, experts, ranked cues, answer-blind filtering, separate records and SFT, then the trained model inference path. The static doctor-trust example is based on Figure 18 (manuscript p. 61); its survey items are shortened and its reasoning summary is edited, not a verbatim model transcript. It does not call a model service.

`research-data.js` preserves the manuscript experiment values and provenance. The Table 1 accuracy panel follows the backbone tabs. Below it, `population-data.js` contains the published Figure 4(a) aggregate distributions (ISSP2021, Qwen3-4B), Figure 7 question-level examples (ATP152, Qwen2.5-7B), and Figure 4(b) Base / SubPOP / SocialReasoner distributional distances (ISSP2021, Qwen3-4B; also Table 7). The two distribution experiments retain their own backbone labels. Held-out GSS2022 and expert expansion values remain in the source data. Geographic files and count logic are independent of these experimental results.

`refresh.css` contains the compact page, method diagram, example and coverage presentation; `results.css` styles the result panels. Both extend the original styles without a framework or build step. Core content is visible immediately, and motion effects respect `prefers-reduced-motion`.

The model-release presentation adds `launch.css` / `launch.js` for the three-column case and current-section navigation. `method-motion.css` / `method-motion.js` progressively enhance the Method diagram with a one-time 7.2-second demonstration, real pause/replay, six stage controls and expert detail views. A native visibility-aware animation frame loop pauses offscreen and when the page is hidden. Manual actions cancel autoplay. Narrow screens show one expert lane at a time after enhancement; without JavaScript all three lanes remain readable. Reduced-motion mode shows the complete static flow and retains immediate step/expert controls. No animation library, video, backend or new service is required.

Accuracy dataset groups persist across model changes so their column heights transition from the current state to the new values on a fixed 0–70% axis. Eight datasets run from left to right; the chart has its own horizontal scrolling area on narrow screens. The entry reveal and subtle highlight animation pause offscreen and respect reduced-motion preferences. Case evidence uses the shared semantic IDs `motives`, `competence`, `confidence` and `efficiency` in every language. It can be previewed with keyboard focus, pinned by clicking and cleared with Escape or Clear selection. Accuracy values remain in `research-data.js`; the additional distribution values and figure provenance are in `population-data.js`. Globe rotation stops drawing while offscreen, hidden or paused, and the background stars draw only on demand.


The editable model schematics are `assets/expert-ebm.svg`, `assets/expert-lightgbm.svg`, and `assets/expert-mlp.svg`, with matching inline overview graphics. They illustrate model principles, without fitted architectures, personal attributes, scores or observed answers. Expert colors remain consistent from input to each independent record. Expert details explain observed-category EBM additive terms, accepted-class raw-score TreeSHAP for LightGBM, and whole-field background-replacement marginal logits for MLP (8 backgrounds x 8 field orders in Appendix C.1). Each expert ranks its own largest positive support; scores are not compared across families. The default is Kₑ = 3 (confirmed by the project author on 2026-11-04). The interactive diagram loads a verified anonymous ATP152 contribution example from `assets/method-example.json` through `method-example.js`. It shows actual Top-3 fields and responses in each lane, plus signed contribution values in the expert detail view. Model structures, filtering decisions and record formation remain schematic; the published sample contains pre-denoising candidate evidence. The answer-blind filter only removes cues, preserving retained wording and order; the human answer enters the record after filtering. Details follow the supplied manuscript, Appendix C.1-C.2 and the filtering prompt in F.3. The doctor-trust case is a separate post-training model example, not an expert attribution sample.

The contribution example was computed on 2026-11-04 from local `ATP152-perceived/train.jsonl`, question `Q00002`, using the v7.3 audited expert implementations and the manuscript Table 8 model settings. The shared seed-42 five-fold split used fold 0 for held-out attribution; all three models predict the observed response correctly. The display example was selected for substantive AI-related cues, preserving each model's actual positive-contribution ranking. This is a paper-configuration reproduction, not an original manuscript checkpoint. The exact values, units, source setting and selection rule are retained in the JSON. The semantic denoiser was not run for this sample, so its downstream panels demonstrate the rule and record format without claiming observed keep/drop outcomes. `node scripts/check-method-example.mjs` checks the public data contract. Local reproduction code, models and independent verification are retained outside the public repository in `../review/real-contributions-20261104/`.

The Data section offers four views: native age profiles, IMF economic groups, survey sample sizes and the original geographic coverage. `data-explorer.js` / `data-explorer.css` provide the portrait views with native SVG and the existing d3 runtime. The age view preserves each survey’s actual age categories rather than estimating exact ages or imposing common boundaries. ISSP2015 keeps Denmark’s alternative age scheme separate. Shares use reported-age respondents; unavailable ages remain explicitly counted. The public `assets/demographics.json` contains only anonymous dataset/region histograms generated by `scripts/build-demographics.py`, with no respondent records. Its source covers the cleaned cohort of 281,977 people; the 18 manuscript-only historical respondents remain age-unavailable, preserving all 281,995 geographic counts.

`assets/economy-groups.json` records the IMF WEO October 2026 advanced / emerging and developing classification and the official source. It uses survey-region IDs independently: China (mainland) and Taiwan, China retain separate group membership and counts, while the geographic map keeps their linked highlighting. Great Britain retains its survey scope and refers to the United Kingdom economy classification. Survey response totals are shown only for complete datasets; no regional or economic-group response counts are inferred.

The geographic view retains the SVG Equal Earth map and region list using the same local atlas and index as the Hero globe. `window.SocialCoverage` exposes guarded dataset/region selection and localized region names; `social:coveragechange` shares selection updates with the portrait views. New view and economic-group state remain local to the Data section. Language changes preserve the selected view and filters. A failed portrait load retains the original geographic panel. `node scripts/check-data-explorer.mjs` reconciles every public age histogram and economic group against the unchanged geographic cohort.

The population charts are rendered from `population-data.js` with `population-results.js` / `population-results.css`. `node scripts/render-population-results.mjs --write` generates the complete default HTML, and its `--check` mode validates option counts, rounding totals, metric ranges, translation keys and static markup. Figure 4(a) uses five harmonized answer categories; Figure 4(b) distances are computed on original question options and must not be inferred from those aggregate donuts. Figure 7 has Human / Base / SocialReasoner shares, with no SubPOP option shares. Percentages keep the published one decimal and distances three decimals. Rounded percentages sometimes sum to 99.9 or 100.1; SVG angles normalize the rounded total without changing displayed values. Full option-share tables remain visible, and selecting an answer highlights the same option across all three donuts. No model call or service is involved.

The default accuracy summary and chart are generated from `research-data.js` by `node scripts/render-static-results.mjs --write`. Its `--check` mode verifies that the checked-in HTML matches the source and runs in the pre-commit hook. This maintenance script adds no runtime dependency.

`assets/socialreasoner-share.svg` is the editable source of the 1200 × 630 social cover. Its PNG export is used by Open Graph and Twitter metadata at the public absolute URL. No additional library, external image host or video is used.

## Introduction figure

The introduction uses an interactive SVG overview of 15 axes and fixed-scale, five-axis model views. Desktop starts in Overview; widths up to 600px start with GPT-6 Astra and offer three model buttons. Hovering or focusing a model button previews its sector; selecting a model changes the view. The module displays the chart and legend without task details, task lists or an expandable data table. The entrance sequence draws the cyan and violet paths once. Replay retains the view; interactions, backgrounding and leaving the viewport finish the animation. Language changes and resizing retain the selected model. Reduced-motion users receive the complete chart immediately.

`assets/figure1-radar-data.json` preserves all 30 source scores, task and model IDs, metrics, units, mapped radii and provenance. General benchmark metric definitions are absent from the recovered source. The 15 social scores match Accuracy (%) in manuscript Table 1. General radii are fixed at 1; social radii use `0.92 * (score / 100) ** 1.35`. The SVG description identifies the two mappings.

`node scripts/render-reasoning-radar.mjs --write` generates `radar-data.js` and the fallback `assets/reasoning-radar.svg` from that JSON; `--check` verifies both. `radar.js` owns layouts, model selection and finite animations; `radar.css` scopes presentation to this module, and `i18n.js` owns the five-language copy. The readable static SVG remains available when scripts or data cannot initialize.

## Geographic coverage

`assets/geography.json` contains anonymous survey-region totals for the manuscript data version: 281,995 survey-level respondents and 8,725,666 valid respondent-question records across 56 survey regions and nine datasets. Respondents are deduplicated within each dataset across train and test; totals are not cross-survey deduplicated. Counts are unweighted sample counts. These 56 survey regions are not a count of sovereign states.

Czech Republic/Czechia and Slovak Republic/Slovakia are consolidated. Great Britain retains its source label and uses a representative marker rather than shading the whole United Kingdom. Map markers represent regions, not individual locations.

Display names use `China (mainland)` and `Taiwan, China`. These survey regions share map shading, hover and selection highlights through `highlightGroup: "CHN"`, including when only one region has samples in a filtered dataset. Marker sizes, tooltips and respondent totals remain region-specific and are never duplicated. The geography generator keeps original source labels in the local audit mapping rather than the public map index.

The globe retains the manuscript cohort, before the 2026-09-24 removal of 18 records from 18 respondents whose profiles contained no `perceived_*` fields (ISSP2015: 3; ISSP2016: 4; ISSP2019: 9; ISSP2021: 2). The later cleaned data has 281,977 survey-level respondents and 8,725,648 records. These historical records are included in the manuscript-version geographic aggregates; this website patch does not restore or modify any respondent-level training or inference files. The geographic index contains no respondent-level records. Separately, the Method example publishes only an anonymous target response and seven AI perception fields; no identifier or full profile is published.

The 2026-11-04 manuscript-cohort revision was merged from `SocialReasoner_Manuscript_Globe_Patch_20261104`: 14 dataset/region aggregate corrections, without replacing current labels, linked map interactions or page layout. The four corrected dataset totals are ISSP2015 45,096, ISSP2016 43,439, ISSP2019 40,245 and ISSP2021 37,899. Treat the resulting JSON as a versioned manuscript snapshot; do not add the 18 historical records again or overwrite it with cleaned-data aggregates. Its provenance remains in the aggregate index as `versionNote`, with translations keyed by `versionNoteKey` in `globe-locales.js`. The website omits the coverage-methodology accordion and version-note panel.

## Keeping all five languages synchronized

The header switches between English (`en`), Simplified Chinese (`zh`), French (`fr`), German (`de`) and Korean (`ko`) without reloading. The choice is remembered on the device; a `?lang=zh` (or another supported code) link opens that language directly.

Page and method/benchmark text lives in `i18n.js`; geographic UI and region-name overrides live in `globe-locales.js`. Edit all five entries together for each content change. Shared numerical data, resource URLs and model/dataset identifiers remain a single source. The manuscript's original method figure stays in English and is identified by a translated caption.

Before publication, run `node scripts/check-locales.mjs` and `node scripts/check-geography.mjs`. The first checks matching translation keys and page bindings; the second checks geographic totals and linked map interactions. Enable the versioned commit check once per checkout with `git config core.hooksPath .githooks`; it runs these checks before each local commit. Hosted workflow automation is not enabled in this repository. `AGENTS.md` records these maintenance requirements for future edits.

## Map dependencies and attribution

- D3 v7.9.0 (ISC): https://github.com/d3/d3
- topojson-client v3.1.0 (ISC): https://github.com/topojson/topojson-client
- world-atlas v2.0.2 (ISC), Natural Earth 1:110m geometry: https://github.com/topojson/world-atlas

Bundled dependency license files are retained under `assets/`. Geographic boundaries are generalized cartographic reference geometry.
