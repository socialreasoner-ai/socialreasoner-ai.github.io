# Website maintenance

- Keep English (`en`), Simplified Chinese (`zh`), French (`fr`), German (`de`) and Korean (`ko`) copy synchronized in every content change. Update the shared dictionaries, not translated copies of the HTML.
- `i18n.js` owns general page/app copy. `globe-locales.js` owns geographic UI copy and display-name overrides. Dataset and model names remain unchanged. The original manuscript figure may retain English, with a translated caption identifying it as the original figure.
- Use the established `SiteI18n` helpers and `data-i18n` bindings for new visible and accessible text. Preserve the active dataset, region and tabs when changing language.
- Keep China (mainland) and Taiwan, China in highlight group `CHN` for map shading, hover and selection. Apply equivalent regional labels in every language. Preserve survey-region sample counts independently; linked highlighting must not duplicate respondents or invent coverage markers.
- Do not modify raw surveys, answer labels or numerical results as part of presentation work. Public geographic data contains anonymous aggregates only; raw labels stay in the local audit mapping.
- Before publishing, run `node scripts/check-locales.mjs`, `node scripts/check-geography.mjs`, JavaScript syntax checks and `git diff --check`. Check mobile/desktop layouts when text length or navigation changes.
