#!/usr/bin/env python3
"""Publish the eight approved survey cases in Method menu order."""

import argparse
import json
from pathlib import Path


SURVEYS = ("ATP142", "ATP152", "EVS2017", "ISSP2009", "ISSP2015", "ISSP2016", "ISSP2019", "ISSP2021")


def main():
    repo = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reviewed-data", type=Path,
                        default=repo.parent / "review" / "method-cases-20261124" / "confirmed.json")
    parser.add_argument("--output", type=Path, default=repo / "assets" / "method-demo.json")
    args = parser.parse_args()
    datasets = json.loads(args.reviewed_data.read_text(encoding="utf-8"))
    if [entry["label"] for entry in datasets] != list(SURVEYS):
        parser.error("Expected one reviewed case per survey, in menu order.")
    for dataset in datasets:
        case = dataset["case"]
        if dataset.get("mode") != "single" or dataset["id"] != dataset["label"] + "-perceived":
            parser.error(f"Invalid survey case: {dataset['label']}")
        if case["options"].get(case["answerId"]) != case["answer"]:
            parser.error(f"Recorded answer is missing from the options: {dataset['label']}")
    public = {
        "version": 3,
        "source": "thinking_data_posttrain",
        "sourceGenerator": "answer-conditioned GLM rewrite",
        "expertPairingSource": "editorial illustration",
        "datasets": datasets,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(public, ensure_ascii=False, separators=(",", ":")) + "\n",
                           encoding="utf-8")
    print(f"Published {len(datasets)} local Method cases.")


if __name__ == "__main__":
    main()
