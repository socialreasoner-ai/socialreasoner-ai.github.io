/* Display-only results transcribed from the current SocialReasoner manuscript.
 * Main accuracy: Table 1. TVD: Appendix B.1 / Table 7. GSS: Table 2(a).
 * Expert combinations: Figure 5(b). Keep reported relative gains separate
 * from averages calculated from the displayed, rounded Table 1 values. */
window.SOCIAL_RESEARCH_RESULTS = Object.freeze({
  datasets: ['ATP142', 'ATP152', 'EVS2017', 'ISSP2009', 'ISSP2015', 'ISSP2016', 'ISSP2019', 'ISSP2021'],
  models: {
    qwen3: {
      label: 'Qwen3-4B-2507-Instruct', shortLabel: 'Qwen3-4B', reportedRelativeGain: '34.37%',
      base: [47.51, 49.81, 44.88, 44.68, 39.06, 41.56, 40.46, 38.95],
      ours: [58.53, 63.10, 64.16, 59.34, 55.71, 56.89, 53.91, 54.49]
    },
    qwen25: {
      label: 'Qwen2.5-7B-Instruct', shortLabel: 'Qwen2.5-7B', reportedRelativeGain: '45.22%',
      base: [47.30, 45.71, 44.00, 42.95, 33.38, 35.77, 39.05, 33.29],
      ours: [58.27, 63.22, 64.12, 58.19, 58.18, 55.80, 54.39, 54.63]
    },
    llama: {
      label: 'Llama-3.1-8B-Instruct', shortLabel: 'Llama-3.1-8B', reportedRelativeGain: '45.38%',
      base: [45.22, 45.71, 48.04, 41.34, 33.83, 36.60, 36.73, 33.69],
      ours: [58.16, 62.88, 64.28, 59.41, 56.51, 56.68, 54.49, 54.50]
    }
  },
  distribution: { backbone: 'Qwen2.5-7B', scope: 'Mean across eight datasets', metric: 'Total variation distance', base: 0.401, ours: 0.120, source: 'Appendix B.1 / Table 7' },
  unseenSurvey: { backbone: 'Qwen2.5-7B', dataset: 'GSS2022', base: 49.85, ours: 51.68, source: 'Table 2(a)', training: '10% of instances from each of eight source datasets', targetUsedInTraining: false },
  expertExpansion: {
    backbone: 'Qwen2.5-7B', dataset: 'ATP152', source: 'Figure 5(b)',
    records: [
      { experts: 'EBM', trainingRecords: '121.7K', accuracy: 62.31 },
      { experts: 'EBM + MLP', trainingRecords: '242.4K', accuracy: 62.98 },
      { experts: 'EBM + MLP + LightGBM', trainingRecords: '364.7K', accuracy: 63.22, defaultConfiguration: true },
      { experts: 'EBM + MLP + LightGBM + FT-Transformer', trainingRecords: '484.5K', accuracy: 63.33 },
      { experts: 'EBM + MLP + LightGBM + FT-Transformer + Random Forest', trainingRecords: '606.3K', accuracy: 63.41 }
    ]
  }
});
