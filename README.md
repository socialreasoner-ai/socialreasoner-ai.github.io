# SocialReasoner project website

Website: https://socialreasoner-ai.github.io/

Research title: **Learning a Foundation Model of Human Social Reasoning from Heterogeneous Experts**.

This repository contains the project website and the CPS, SDI and VAPP survey downloads in `downloads/behavioral/`. Each ZIP contains one training file, one test file and a README.

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

The Data link opens the three local downloads when no external dataset URL is configured. Code and model links show their release status.

## Content

The Results section reports the original model evaluations. The geographic and demographic explorers cover 12 datasets. The Resources section links directly to each behavioral dataset and its geographic coverage.

The project is presented as a research preview. Release URLs and final publication metadata can be added when available.

The Method section offers expert reasoning examples for the eight training surveys (32 profiles, four questions per profile and three expert choices). Selecting CPS, SDI or VAPP displays test questions and recorded human answers from the released survey files. The two example respondents per behavioral dataset contribute 38 answers in total. The source fixtures are `assets/method-demo.json` and `assets/behavioral-examples.json`.

The demo uses the eight supplied `thinking_data_posttrain` JSONL datasets. It preserves source CoT text, questions, option labels, answers and perception responses. Each profile/question offers three model choices. Distinct saved CoTs are used where available; slots reuse an unchanged source CoT when the source pair contains fewer than three variants. The model names are configured demonstration slots: the merged source does not retain per-record expert identity, so this assignment is not recovered EBM/LightGBM/MLP provenance. For the eight post-training datasets, `cot_rewrite_audit` identifies answer-conditioned GLM rewrites with the observed answer visible. The demo performs no model inference, reports no new model scores and changes no research results. Each choice carries the exact `used_cues` from its CoT source row, joined by ID to `cot_rewrite_audit.result.retained_cue_ids`. Retained facts appear before the reasoning; other candidate facts are available in a collapsed list. `supplemental_evidence` is shown separately as additional profile evidence. These fields describe the saved rewrite; they are not contribution weights or an exhaustive reconstruction of every phrase in the CoT.

`python3 scripts/build-method-demo.py` rebuilds the selected examples from local source files; `--source-root` sets their location. Selection and source verification records remain outside this public repository in `../review/method-demo-20261105/`; original participant IDs and full prompts are excluded from the public asset. `node scripts/check-method-demo.mjs` validates complete model choices, shared question menus, answer labels and perception fields, and reports both model-choice and unique-CoT counts. General and accessible UI copy uses the shared five-language dictionary; source survey text and CoT retain their original wording.

`research-data.js` preserves the manuscript experiment values and provenance. The Table 1 accuracy panel follows the backbone tabs. Below it, `population-data.js` contains the published Figure 4(a) aggregate distributions (ISSP2021, Qwen3-4B), Figure 7 question-level examples (ATP152, Qwen2.5-7B), and Figure 4(b) Base / SubPOP / SocialReasoner distributional distances (ISSP2021, Qwen3-4B; also Table 7). The two distribution experiments retain their own backbone labels. Held-out GSS2022 and expert expansion values remain in the source data. Geographic files and count logic are independent of these experimental results.

`refresh.css` contains the compact page, method diagram, example and coverage presentation; `results.css` styles the result panels. Both extend the original styles without a framework or build step. Core content is visible immediately, and motion effects respect `prefers-reduced-motion`.

The model-release presentation adds `launch.css` / `launch.js` for current-section navigation. The older `method-motion.js`, `method-example.js` and their contribution fixture remain as historical source assets and are no longer loaded by the page.

Accuracy dataset groups persist across model changes so their column heights transition from the current state to the new values on a fixed 0–70% axis. Eight datasets run from left to right; the chart has its own horizontal scrolling area on narrow screens. The entry reveal and subtle highlight animation pause offscreen and respect reduced-motion preferences. Accuracy values remain in `research-data.js`; the additional distribution values and figure provenance are in `population-data.js`. Globe rotation stops drawing while offscreen, hidden or paused, and the background stars draw only on demand.


The Data section covers all twelve datasets through age profiles, IMF economic groups, sample sizes, and geographic coverage. VAPP and the original nine surveys retain their recorded age categories, including Denmark’s separate ISSP2015 scheme. CPS and SDI report ages in years, grouped for display into 18–29, 30–39, 40–49, 50–59, 60–69 and 70+. Twenty-seven SDI participants have ages outside the source paper’s reported range of 18–89. They remain in the sample totals and are excluded from age percentages. The original nine surveys retain the 18 manuscript-only participants with unavailable ages.

`assets/demographics.json` contains dataset-by-region age histograms. Rebuild the three release profiles with `python3 scripts/build-demographics.py`, or add `--check` to compare them against the downloads without writing. The builder counts each respondent once within each dataset across training and test. Supply `--source-root` and `--mapping` to rebuild the original nine profiles from their local survey sources as well. The IMF October 2026 WEO appendix is linked in `assets/economy-groups.json`. Great Britain and the United Kingdom retain their distinct survey scopes and use the same IMF classification. The British Virgin Islands appear in a separate unclassified group.

The geographic view shares its map, region selection and language settings with the hero globe and the three data portraits. The sample-size chart shows respondents and responses by region or economy group. It uses a whole-dataset total whenever all its regions are selected. Within a partial dataset it shows answer counts only when per-region response totals are available. `node scripts/check-data-explorer.mjs` reconciles each age histogram with its geographic sample and checks economic-group coverage.

The population charts are rendered from `population-data.js` with `population-results.js` / `population-results.css`. `node scripts/render-population-results.mjs --write` generates the complete default HTML, and its `--check` mode validates option counts, rounding totals, metric ranges, translation keys and static markup. Figure 4(a) uses five harmonized answer categories; Figure 4(b) distances are computed on original question options and must not be inferred from those aggregate donuts. Figure 7 has Human / Base / SocialReasoner shares, with no SubPOP option shares. Percentages keep the published one decimal and distances three decimals. Rounded percentages sometimes sum to 99.9 or 100.1; SVG angles normalize the rounded total without changing displayed values. Full option-share tables remain visible, and selecting an answer highlights the same option across all three donuts. No model call or service is involved.

The default accuracy summary and chart are generated from `research-data.js` by `node scripts/render-static-results.mjs --write`. Its `--check` mode verifies that the checked-in HTML matches the source and runs in the pre-commit hook. This maintenance script adds no runtime dependency.

`assets/socialreasoner-share.svg` is the editable source of the 1200 × 630 social cover. Its PNG export is used by Open Graph and Twitter metadata at the public absolute URL. No additional library, external image host or video is used.

## Introduction figure

The introduction uses an interactive SVG overview of 15 axes and fixed-scale, five-axis model views. Desktop starts in Overview; widths up to 600px start with GPT-6 Astra and offer three model buttons. Hovering or focusing a model button previews its sector; selecting a model changes the view. The module displays the chart and legend without task details, task lists or an expandable data table. The entrance sequence draws the cyan and violet paths once. Replay retains the view; interactions, backgrounding and leaving the viewport finish the animation. Language changes and resizing retain the selected model. Reduced-motion users receive the complete chart immediately.

`assets/figure1-radar-data.json` preserves all 30 source scores, task and model IDs, metrics, units, mapped radii and provenance. General benchmark metric definitions are absent from the recovered source. The 15 social scores match Accuracy (%) in manuscript Table 1. General radii are fixed at 1; social radii use `0.92 * (score / 100) ** 1.35`. The SVG description identifies the two mappings.

`node scripts/render-reasoning-radar.mjs --write` generates `radar-data.js` and the fallback `assets/reasoning-radar.svg` from that JSON; `--check` verifies both. `radar.js` owns layouts, model selection and finite animations; `radar.css` scopes presentation to this module, and `i18n.js` owns the five-language copy. The readable static SVG remains available when scripts or data cannot initialize.

## Geographic coverage

`assets/geography.json` combines the original nine-survey cohort with the CPS, SDI and VAPP releases. Across 12 datasets, it counts 349,425 respondents, 9,238,546 responses, 384 target questions and 88 survey regions. Each person is counted once within their dataset across train and test. Each question is counted once per dataset. Use `python3 scripts/build-behavioral-geography.py --check` to reconcile behavioral aggregates with the downloadable records.

Czech Republic/Czechia and Slovak Republic/Slovakia are consolidated. The historical Great Britain samples and the newer United Kingdom samples retain their respective geographic scopes. Small territories can be selected by their markers and in the region list.

Display names use `China (mainland)` and `Taiwan, China`. These survey regions share map shading, hover and selection highlights through `highlightGroup: "CHN"`, including when only one region has samples in a filtered dataset. Marker sizes, tooltips and respondent totals remain region-specific and are never duplicated. The geography generator keeps original source labels in the local audit mapping rather than the public map index.

The original nine surveys retain the manuscript cohort of 281,995 respondents, 8,725,666 answers and 365 questions across 13 thematic areas. The 18 historical records excluded during later cleaning still contribute to those original geographic totals.

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

## Respondent cards

The Hero respondent explorer uses `assets/respondent-showcase.json` and `assets/respondent-cots.json` for examples from the eight training surveys. For CPS, SDI and VAPP, `assets/behavioral-examples.json` supplies anonymized profiles, survey prompts, answer options and observed responses. The globe and Method section use the same examples. Rebuild them with `python3 scripts/build-behavioral-examples.py`. GSS2022 contributes geographic aggregates.

Cards display the profile, reported views and recorded answer, followed by the shared survey question. Stored CoTs remain in the source overlay and are not rendered in these cards. Survey text retains its original English wording; headings and controls use the five shared respondent dictionaries. The Method demo retains its separate model-reasoning display. Artwork associations remain illustrative and independent of the source profiles. Numeric scale responses show their score and the original endpoint labels copied from the packaged survey options; raw profile values and CoTs are retained unchanged.

`python3 scripts/build-respondent-cots.py` rebuilds the overlay from local source records; see its arguments for source locations. Private byte offsets, source hashes and selection comparisons are retained in the local `review/respondent-cot-20261105` audit. `node scripts/check-respondent-cots.mjs` verifies complete A/B cards, shared target questions, source identities, response options, perception fields and localized headings. The raw survey and post-training files are unchanged.

## Animated globe characters

`assets/avatars/models/` contains 18 self-contained GLB 2.0 characters reconstructed from the supplied artwork. Each has a skinned volumetric mesh, 18 bones and `Idle`, `Turn`, `Walk`, `Wave` clips. The current respondent explorer displays 16 characters across eight datasets; the two GSS2022 GLBs remain available in the asset set. These are simplified illustrated reconstructions, with inferred rear surfaces, rather than verified likenesses of survey respondents.

`globe-characters.js` loads the selected pair first, clones independent skeletons and mixers, and uses PNGs as loading/error fallbacks. `Walk` is authored in place; the scene moves the character 0.7 units per cycle. Explicit animation buttons remain available when reduced motion is enabled, while automatic movement is skipped. Geometry, actions and resources are released when the renderer is disposed.

Run `blender -b --python scripts/build-avatar-models.py -- --render --all-views --save-blend` to rebuild from the per-character specifications. `node scripts/check-avatar-models.mjs` loads every shipped GLB and samples actual skinned vertices across all 72 clips. `node scripts/check-globe-3d.mjs` covers loading priority, independent skeletons, interruption, fallback and cleanup.
