"""Recount the three public train/test ZIPs against the site's regional map index.

Usage: python3 scripts/build-behavioral-geography.py [--check]
Only aggregate participant and question-response counts are written. The existing
map anchors and the nine historical survey contributions are independent inputs.
The source's SDI country codes can differ from ISO. Legate et al., supplement
Table S1, identifies the British Virgin Islands (VIR in PSAcombineddata), Kosovo
(XKS), and separate Slovak and Slovenian PSA samples (SLO and SVN, respectively).
"""
import argparse
from collections import Counter
import json
from pathlib import Path
import re
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
GEOGRAPHY = ROOT / "assets/geography.json"
SOURCES = {
    "CPS": ("ClimateChange", "climate-change.zip"),
    "SDI": ("SocialDistance", "social-distance.zip"),
    "VAPP": ("COVID-19", "covid-19.zip"),
}
# Original main and held-out survey task inventories (manuscript Table 33 for GSS).
SURVEY_QUESTIONS = {
    "ATP142": 49, "ATP152": 57, "EVS2017": 53, "ISSP2009": 31, "ISSP2015": 25,
    "ISSP2016": 35, "ISSP2019": 27, "ISSP2021": 24, "GSS2022": 64,
}
COUNTRY = re.compile(r"\bYour country is ([^.\n]+)\.")


def count_release(dataset, name, filename, aliases):
    respondents = {}
    responses = Counter()
    train_test = {}
    questions = set()
    with ZipFile(ROOT / "downloads/behavioral" / filename) as archive:
        for split in ("train", "test"):
            count = 0
            with archive.open(f"{split}.jsonl") as lines:
                for raw in lines:
                    record = json.loads(raw)
                    if record["split"] != split or record["dataset"] != dataset:
                        raise ValueError(f"Unexpected dataset or split in {filename}/{split}.jsonl")
                    personal = record["prompt"].split("### Personal Information:\n", 1)[1].split("\n### ", 1)[0]
                    labels = COUNTRY.findall(personal)
                    if len(labels) != 1:
                        raise ValueError(f"Expected one survey country in {filename}/{split}.jsonl")
                    region = aliases[labels[0]]
                    person = record["respondent_id"]
                    if not person or respondents.setdefault(person, (region, split)) != (region, split):
                        raise ValueError(f"Conflicting respondent location or split in {filename}")
                    questions.add(record["question_id"])
                    responses[region] += 1
                    count += 1
            train_test[split] = count
    population = Counter(region for region, _ in respondents.values())
    return {
        "id": dataset, "label": f"{dataset} · {name}", "respondents": len(respondents),
        "responses": sum(responses.values()), "regions": [
            {"id": region, "count": count, "responses": responses[region]}
            for region, count in sorted(population.items(), key=lambda item: (-item[1], item[0]))
        ],
        "usCensusRegions": {}, "heldOut": True, "collection": "behavioral", "questionCount": len(questions),
        "recordsBySplit": train_test, "unmappedRespondents": 0,
    }


def build(index):
    aliases = json.loads((ROOT / "scripts/behavioral-regions.json").read_text())
    surveys = [item for item in index["datasets"] if item["id"] not in SOURCES]
    for survey in surveys:
        survey["questionCount"] = SURVEY_QUESTIONS[survey["id"]]
    regions = {row["id"]: row for row in index["regions"]}
    for region in regions.values():
        for dataset in SOURCES:
            region["byDataset"].pop(dataset, None)
    release = [count_release(key, *source, aliases) for key, source in SOURCES.items()]
    for dataset in release:
        for region in dataset["regions"]:
            regions[region["id"]]["byDataset"][dataset["id"]] = region["count"]
    for region in regions.values():
        region["count"] = sum(region["byDataset"].values())
    index["datasets"] = surveys + release
    index["regions"] = sorted(regions.values(), key=lambda r: (-r["count"], r["id"]))
    index["totalQuestions"] = sum(dataset["questionCount"] for dataset in index["datasets"])
    index["totalRegions"] = len(index["regions"])
    index["totalRespondents"] = sum(dataset["respondents"] for dataset in index["datasets"])
    index["totalResponses"] = sum(dataset["responses"] for dataset in index["datasets"])
    index["updated"] = "2026-11-23"
    index["sourceVersion"] = "Manuscript survey cohort and the November 18, 2026 behavioral data release (Prompt v3)."
    index["methodology"] = (
        "Respondents are counted once per dataset across the training and test splits. "
        "The totals combine the nine manuscript surveys with the three released behavioral datasets. "
        "Responses count individual respondent–question records. Counts are unweighted."
    )
    index["geographyNote"] = (
        "Counts retain each study’s geographic scope. Great Britain and the United Kingdom have separate survey-region entries. "
        "China (mainland) and Taiwan, China share map highlights and retain separate counts. Small regions can appear as points. "
        "Markers designate survey regions rather than individual locations."
    )
    legacy = (
        "The nine manuscript surveys retain their original cohort of 281,995 dataset-level respondents and 8,725,666 records. "
        "The September 24, 2026 cleaned cohort excluded 18 respondents and their 18 records "
        "(ISSP2015: 3; ISSP2016: 4; ISSP2019: 9; ISSP2021: 2)."
    )
    index["versionNote"] = legacy
    return index


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify the index without writing")
    args = parser.parse_args()
    original = json.loads(GEOGRAPHY.read_text())
    previous = json.dumps(original, ensure_ascii=False, indent=2) + "\n"
    updated = build(original)
    encoded = json.dumps(updated, ensure_ascii=False, indent=2) + "\n"
    if args.check and previous != encoded:
        raise SystemExit("Aggregate counts differ from the released train/test data.")
    if not args.check:
        GEOGRAPHY.write_text(encoded)
    for dataset in updated["datasets"]:
        if dataset["id"] in SOURCES:
            print(f"{dataset['id']}: {dataset['respondents']:,} respondents, "
                  f"{dataset['responses']:,} responses, {len(dataset['regions'])} survey regions")
