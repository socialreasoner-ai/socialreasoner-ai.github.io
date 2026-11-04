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

The benchmark presents accuracy (%) for eight main evaluation datasets. GSS2022 is a separate held-out transfer evaluation. The interactive globe displays survey-region aggregates from the current research data release. Background stars are decorative.

The project is presented as a research preview. Release URLs and final publication metadata can be added when available.


## Geographic coverage

`assets/geography.json` contains anonymous survey-region totals only: 281,977 survey-level respondents across 56 survey regions and nine datasets. Respondents are deduplicated within each dataset across train and test; totals are not cross-survey deduplicated. Counts are unweighted sample counts. These 56 survey regions are not a count of sovereign states.

Czech Republic/Czechia and Slovak Republic/Slovakia are consolidated. Great Britain retains its source label and uses a representative marker rather than shading the whole United Kingdom. Map markers represent regions, not individual locations.

Display names use `China (mainland)` and `Taiwan, China`. These survey regions share map shading, hover and selection highlights through `highlightGroup: "CHN"`, including when only one region has samples in a filtered dataset. Marker sizes, tooltips and respondent totals remain region-specific and are never duplicated. The geography generator keeps original source labels in the local audit mapping rather than the public map index.

The current prepared data has 18 fewer respondents than the manuscript total of 281,995 (ISSP2015: 3; ISSP2016: 4; ISSP2019: 9; ISSP2021: 2). The site discloses the difference; its cause is not established. No original respondent-level survey records are included in this repository.

## Keeping all five languages synchronized

The header switches between English (`en`), Simplified Chinese (`zh`), French (`fr`), German (`de`) and Korean (`ko`) without reloading. The choice is remembered on the device; a `?lang=zh` (or another supported code) link opens that language directly.

Page and method/benchmark text lives in `i18n.js`; geographic UI and region-name overrides live in `globe-locales.js`. Edit all five entries together for each content change. Shared numerical data, resource URLs and model/dataset identifiers remain a single source. The manuscript's original method figure stays in English and is identified by a translated caption.

Before publication, run `node scripts/check-locales.mjs` and `node scripts/check-geography.mjs`. The first checks matching translation keys and page bindings; the second checks geographic totals and linked map interactions. Enable the versioned commit check once per checkout with `git config core.hooksPath .githooks`; it runs these checks before each local commit. Hosted workflow automation is not enabled in this repository. `AGENTS.md` records these maintenance requirements for future edits.

## Map dependencies and attribution

- D3 v7.9.0 (ISC): https://github.com/d3/d3
- topojson-client v3.1.0 (ISC): https://github.com/topojson/topojson-client
- world-atlas v2.0.2 (ISC), Natural Earth 1:110m geometry: https://github.com/topojson/world-atlas

Bundled dependency license files are retained under `assets/`. Geographic boundaries are generalized cartographic reference geometry.
