/* Published Figure 4 and Figure 7 values. Keep source precision and option order. */
window.SOCIAL_POPULATION_RESULTS = Object.freeze({
  "provenance": {
    "manuscript": "Learning a Foundation Model of Human Social Reasoning from Heterogeneous Experts",
    "pdfSha256": "4a0c38c8d863474f4cc0835bfda4a15e87dfc2e0a7ba9e46d65a93906f27c124",
    "aggregate": {
      "figure": "4(a)",
      "pdfPage": 8,
      "scope": "ISSP2021 aggregate response shares, harmonized into five numbered answer categories; Qwen3-4B"
    },
    "cases": {
      "figure": "7",
      "pdfPage": 31,
      "scope": "Three ATP152 questions; Qwen2.5-7B-Instruct"
    },
    "comparison": {
      "figure": "4(b)",
      "table": "7",
      "pdfPages": [
        8,
        30
      ],
      "scope": "ISSP2021, Qwen3-4B; original answer options; per-question distances macro-averaged across questions"
    },
    "precision": "Response shares retain the published one decimal. Distances retain the published three decimals. Donut geometry normalizes rounded totals; displayed percentages are unchanged."
  },
  "aggregate": {
    "id": "issp2021",
    "titleKey": "population.aggregateTitle",
    "source": "Figure 4(a)",
    "dataset": "ISSP2021",
    "backbone": "Qwen3-4B",
    "options": [
      {
        "labelKey": "population.option1",
        "color": "#66c9ee"
      },
      {
        "labelKey": "population.option2",
        "color": "#a99bed"
      },
      {
        "labelKey": "population.option3",
        "color": "#74d2b8"
      },
      {
        "labelKey": "population.option4",
        "color": "#e3ba78"
      },
      {
        "labelKey": "population.option5",
        "color": "#d78d9e"
      }
    ],
    "shares": {
      "human": [
        15.5,
        28.8,
        22.2,
        20.7,
        12.8
      ],
      "base": [
        12.4,
        14.0,
        32.1,
        32.7,
        8.9
      ],
      "ours": [
        14.0,
        32.6,
        21.5,
        19.9,
        12.0
      ]
    }
  },
  "cases": [
    {
      "id": "truck_driver_jobs",
      "titleKey": "population.jobsTitle",
      "questionKey": "population.jobsQuestion",
      "source": "Figure 7",
      "dataset": "ATP152",
      "backbone": "Qwen2.5-7B",
      "options": [
        {
          "labelKey": "population.moreJobs",
          "color": "#66c9ee"
        },
        {
          "labelKey": "population.fewerJobs",
          "color": "#a99bed"
        },
        {
          "labelKey": "population.littleDifference",
          "color": "#74d2b8"
        },
        {
          "labelKey": "population.notSure",
          "color": "#e3ba78"
        }
      ],
      "shares": {
        "human": [
          2.3,
          32.9,
          44.8,
          19.9
        ],
        "base": [
          1.4,
          86.2,
          12.1,
          0.4
        ],
        "ours": [
          1.0,
          30.2,
          51.1,
          17.7
        ]
      },
      "tvd": {
        "base": 0.532,
        "ours": 0.062
      }
    },
    {
      "id": "environment",
      "titleKey": "population.environmentTitle",
      "questionKey": "population.environmentQuestion",
      "source": "Figure 7",
      "dataset": "ATP152",
      "backbone": "Qwen2.5-7B",
      "options": [
        {
          "labelKey": "population.veryPositive",
          "color": "#66c9ee"
        },
        {
          "labelKey": "population.somewhatPositive",
          "color": "#a99bed"
        },
        {
          "labelKey": "population.equallyPositiveNegative",
          "color": "#74d2b8"
        },
        {
          "labelKey": "population.somewhatNegative",
          "color": "#e3ba78"
        },
        {
          "labelKey": "population.veryNegative",
          "color": "#d78d9e"
        },
        {
          "labelKey": "population.notSure",
          "color": "#8d9db6"
        }
      ],
      "shares": {
        "human": [
          5.6,
          14.4,
          22.2,
          13.4,
          10.1,
          34.2
        ],
        "base": [
          0.0,
          4.1,
          19.5,
          74.9,
          0.6,
          1.0
        ],
        "ours": [
          2.7,
          20.0,
          29.2,
          7.4,
          12.3,
          28.4
        ]
      },
      "tvd": {
        "base": 0.615,
        "ours": 0.148
      }
    },
    {
      "id": "productivity",
      "titleKey": "population.productivityTitle",
      "questionKey": "population.productivityQuestion",
      "source": "Figure 7",
      "dataset": "ATP152",
      "backbone": "Qwen2.5-7B",
      "options": [
        {
          "labelKey": "population.extremelyLikely",
          "color": "#66c9ee"
        },
        {
          "labelKey": "population.veryLikely",
          "color": "#a99bed"
        },
        {
          "labelKey": "population.somewhatLikely",
          "color": "#74d2b8"
        },
        {
          "labelKey": "population.notTooLikely",
          "color": "#e3ba78"
        },
        {
          "labelKey": "population.notAtAllLikely",
          "color": "#d78d9e"
        },
        {
          "labelKey": "population.notSure",
          "color": "#8d9db6"
        }
      ],
      "shares": {
        "human": [
          4.6,
          15.4,
          25.9,
          26.9,
          15.7,
          11.5
        ],
        "base": [
          0.5,
          2.0,
          78.8,
          17.5,
          1.2,
          0.0
        ],
        "ours": [
          2.6,
          14.2,
          23.8,
          35.6,
          11.7,
          12.2
        ]
      },
      "tvd": {
        "base": 0.528,
        "ours": 0.094
      }
    }
  ],
  "comparison": {
    "source": "Figure 4(b) · Table 7",
    "dataset": "ISSP2021",
    "backbone": "Qwen3-4B",
    "metrics": [
      {
        "id": "tvd",
        "label": "TVD",
        "nameKey": "population.tvdName",
        "values": {
          "base": 0.299,
          "subpop": 0.12,
          "ours": 0.116
        },
        "axisMax": 0.35,
        "precision": 3
      },
      {
        "id": "wd",
        "label": "WD",
        "nameKey": "population.wdName",
        "values": {
          "base": 0.132,
          "subpop": 0.057,
          "ours": 0.048
        },
        "axisMax": 0.35,
        "precision": 3
      },
      {
        "id": "jsd",
        "label": "JSD",
        "nameKey": "population.jsdName",
        "values": {
          "base": 0.082,
          "subpop": 0.015,
          "ours": 0.014
        },
        "axisMax": 0.35,
        "precision": 3
      },
      {
        "id": "hd",
        "label": "HD",
        "nameKey": "population.hdName",
        "values": {
          "base": 0.272,
          "subpop": 0.122,
          "ours": 0.107
        },
        "axisMax": 0.35,
        "precision": 3
      }
    ]
  }
});
