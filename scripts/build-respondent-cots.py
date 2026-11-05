#!/usr/bin/env python3
"""Build exact stored CoT overrides for the respondent showcase.

The showcase artwork remains illustrative. This builder replaces a displayed
person only when the existing person lacks a CoT for the shared target. It
copies survey values and CoT text from the selected post-training JSONL rows.
No model is run and the source files are never modified.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import zipfile
from collections import defaultdict
from pathlib import Path


SOURCE_BASENAME = "multisurvey_target_positive_semantic_denoiser_cot_merged_rewritten_v4.jsonl"
TARGET_QUESTIONS = {
    "ATP142": "Q00004",  # U.S. health care relative to other wealthy countries
    "ATP152": "Q00004",  # control over AI use
    "EVS2017": "Q00006",  # importance of God
    "ISSP2009": "Q00007",  # political connections and social mobility
    "ISSP2015": "Q00005",  # independence at work
    "ISSP2016": "Q00005",  # justice errors
    "ISSP2019": "Q00006",  # bribery and social mobility
    "ISSP2021": "Q00006",  # taxes for health care
}
PERSON_MARKER = b'"person_id":"'
QUESTION_MARKER = b'"question_id":"'
SIMILARITY_WEIGHTS = {
    "country": 50,
    "sex": 30,
    "age_group": 25,
    "education_level": 10,
    "region": 8,
    "party_summary": 4,
    "ideology": 4,
    "household_income_position": 2,
}


def field_after(line: bytes, marker: bytes) -> str:
    start = line.find(marker)
    if start < 0:
        return ""
    start += len(marker)
    end = line.find(b'"', start)
    return line[start:end].decode("ascii", "replace")


def clean_row(row: dict) -> bool:
    audit = row.get("cot_rewrite_audit", {}).get("result", {})
    answer = str(row.get("groundtruth_id", ""))
    return (
        row.get("split") == "train"
        and not row.get("fallback")
        and answer in row.get("option", {})
        and answer == str(row.get("pred_option", ""))
        and bool(row.get("cot", "").strip())
        and audit.get("status") == "ok"
        and not audit.get("audit_warnings")
        and not audit.get("unmatched_supplemental_evidence")
    )


def row_quality(row: dict, source_line: int) -> tuple[int, int, int]:
    audit = row["cot_rewrite_audit"]["result"]
    return (len(audit.get("retained_cue_ids", [])),
            -abs(len(row["cot"]) - 650), -source_line)


def source_file(root: Path, dataset: str) -> Path:
    path = root / (dataset + "-perceived") / "target_positive" / SOURCE_BASENAME
    if not path.is_file():
        raise FileNotFoundError(path)
    return path


def scan_target(path: Path, dataset: str, question: str):
    """Keep one clean, exact source offset per respondent for the target."""
    selected = {}
    target_rows = 0
    clean_rows = 0
    with path.open("rb") as stream:
        source_line = 0
        while True:
            offset = stream.tell()
            line = stream.readline()
            if not line:
                break
            source_line += 1
            if field_after(line, QUESTION_MARKER) != question:
                continue
            target_rows += 1
            row = json.loads(line)
            if not row.get("dataset", "").startswith(dataset + "-perceived"):
                raise ValueError("dataset mismatch at %s line %d" % (path, source_line))
            if not clean_row(row):
                continue
            clean_rows += 1
            person = row["person_id"]
            candidate = {
                "offset": offset,
                "sourceLine": source_line,
                "quality": row_quality(row, source_line),
                "answerId": str(row["groundtruth_id"]),
                "profile": row["profile"],
            }
            if person not in selected or candidate["quality"] > selected[person]["quality"]:
                selected[person] = candidate
    if not selected:
        raise ValueError("no clean CoTs for %s %s" % (dataset, question))
    return selected, {"targetRows": target_rows, "cleanRows": clean_rows,
                      "cleanPeople": len(selected)}


def read_selected(path: Path, person: str, question: str, candidate: dict):
    with path.open("rb") as stream:
        stream.seek(candidate["offset"])
        raw_line = stream.readline()
    row = json.loads(raw_line)
    if (row["person_id"] != person or row["question_id"] != question
            or not clean_row(row)):
        raise ValueError("selected source row changed: %s %s %s" % (path, person, question))
    return row, raw_line


def similarity(candidate: dict, original: dict, contrast_answer: str | None) -> int:
    profile = candidate["profile"]
    original_fields = {item["key"]: item["value"] for item in original["demographics"]}
    score = sum(weight for key, weight in SIMILARITY_WEIGHTS.items()
                if original_fields.get(key) is not None
                and profile.get(key) == original_fields[key])
    if contrast_answer is not None and candidate["answerId"] != contrast_answer:
        score += 20
    for key in ("country", "sex", "age_group", "education_level"):
        if profile.get(key) in (None, "", "—"):
            score -= 30
    return score


def choose_replacement(candidates: dict, original: dict, excluded: set[str],
                       region_by_country: dict, contrast_answer: str | None):
    ranked = []
    for person, candidate in candidates.items():
        if person in excluded:
            continue
        if candidate["profile"].get("country") not in region_by_country:
            continue
        ranked.append((similarity(candidate, original, contrast_answer),
                       candidate["quality"], person))
    if not ranked:
        raise ValueError("no replacement respondent for %s" % original["displayId"])
    ranked.sort(key=lambda item: (-item[0], tuple(-x for x in item[1]), item[2]))
    return ranked[0][2]


def load_profile_maps(package_path: Path) -> dict:
    maps = {}
    with zipfile.ZipFile(package_path) as package:
        names = package.namelist()
        for dataset in TARGET_QUESTIONS:
            matches = [name for name in names if
                       ("/dataset_definitions/%s/perceived/" % dataset) in name
                       and name.endswith("profile_map.json")]
            if len(matches) != 1:
                raise ValueError("expected one profile map for %s" % dataset)
            maps[dataset] = json.loads(package.read(matches[0]))
        # Numeric middle responses are scores, not missing categorical labels.
        # Copy their scale endpoints from the packaged survey options verbatim.
        for name in names:
            if "/people/" not in name or "/data/no-perception/" not in name or not name.endswith(".jsonl"):
                continue
            dataset = name.split("/people/", 1)[1].split("_", 1)[0]
            if dataset not in maps:
                continue
            for line in package.read(name).splitlines():
                row = json.loads(line)
                options = row.get("option", {})
                if not options or not all(str(key).isdigit() for key in options):
                    continue
                scores = sorted(map(int, options))
                low, high = scores[0], scores[-1]
                if (high - low < 3 or scores != list(range(low, high + 1))
                        or any(options[str(score)] != str(score) for score in scores[1:-1])
                        or str(options[str(low)]).isdigit() or str(options[str(high)]).isdigit()):
                    continue
                scale = {"min": low, "max": high,
                         "minLabel": options[str(low)], "maxLabel": options[str(high)]}
                for rule in maps[dataset].values():
                    if rule.get("source_question_id") == row.get("question_id"):
                        if rule.get("response_scale", scale) != scale:
                            raise ValueError("inconsistent response scale: %s %s" % (dataset, row["question_id"]))
                        rule["response_scale"] = scale
    return maps


def public_demographics(profile: dict) -> list[dict]:
    return [{"key": key, "label": key.replace("_", " ").title(), "value": value}
            for key, value in profile.items()
            if not key.startswith("perceived_") and value is not None]


def public_perceptions(profile: dict, mapping: dict, target_question: str) -> list[dict]:
    items = []
    for key, value in profile.items():
        if not key.startswith("perceived_") or value is None or str(value).strip() == "":
            continue
        rule = mapping.get(key)
        if not rule:
            raise ValueError("perceived field has no source map: %s" % key)
        source_question = rule.get("source_question_id")
        if source_question == target_question:
            continue
        label = rule["display_name"]
        item = {"profileKey": key, "sourceQuestionId": source_question,
                "label": label, "question": label, "value": value}
        scale = rule.get("response_scale")
        if scale and str(value).isdigit() and scale["min"] <= int(value) <= scale["max"]:
            item["responseScale"] = scale.copy()
        items.append(item)
    if not items:
        raise ValueError("selected source profile has no non-target perceptions")
    return items


def public_participant(original: dict, row: dict, mapping: dict,
                       region_by_country: dict) -> dict:
    dataset = original["datasetId"]
    country = row["profile"].get("country")
    if country not in region_by_country:
        raise ValueError("country is missing from geography: %s %s" % (dataset, country))
    region = region_by_country[country]
    target = row["question_id"]
    answer = str(row["groundtruth_id"])
    if row["option"][answer] != row["groundtruth"]:
        raise ValueError("source answer label mismatch: %s %s" % (dataset, row["person_id"]))
    return {
        "displayId": original["displayId"],
        "datasetId": dataset,
        "regionId": region,
        "mapAnchor": {"regionId": region},
        "demographics": public_demographics(row["profile"]),
        "perceptions": public_perceptions(row["profile"], mapping, target),
        "target": {"questionId": target, "question": row["question"],
                   "options": [{"id": key, "text": value}
                               for key, value in row["option"].items()]},
        "observedOptionId": answer,
        "cot": row["cot"],
        "sourceRef": {"sourcePersonId": row["person_id"],
                      "targetQuestionId": target,
                      "split": row["split"],
                      "source": "thinking_data_posttrain",
                      "sourceDataset": row["dataset"]},
    }


def build(args):
    showcase = json.loads(args.showcase.read_text(encoding="utf-8"))
    geography = json.loads(args.geography.read_text(encoding="utf-8"))
    region_by_country = {region["label"]: region["id"]
                         for region in geography["regions"]}
    profile_maps = load_profile_maps(args.profile_maps_package)
    public = {"schemaVersion": 1, "source": "thinking_data_posttrain", "datasets": []}
    audit = {"source": "thinking_data_posttrain", "datasets": []}
    for entry in showcase["datasets"]:
        dataset = entry["datasetId"]
        if dataset == "GSS2022":
            public["datasets"].append({"datasetId": dataset,
                                       "availability": "pending", "participants": []})
            audit["datasets"].append({"datasetId": dataset,
                                      "availability": "pending", "reason": "no GSS posttrain CoT"})
            continue
        question = TARGET_QUESTIONS[dataset]
        path = source_file(args.source_root, dataset)
        candidates, counts = scan_target(path, dataset, question)
        originals = entry["participants"]
        if len(originals) != 2:
            raise ValueError("expected two original showcase people for %s" % dataset)
        chosen = [None, None]
        for index, original in enumerate(originals):
            person = original["sourceRef"]["sourcePersonId"]
            if person in candidates:
                chosen[index] = person
        for index, original in enumerate(originals):
            if chosen[index] is not None:
                continue
            other = chosen[1 - index]
            contrast = candidates[other]["answerId"] if other is not None else None
            chosen[index] = choose_replacement(candidates, original, set(chosen),
                                               region_by_country, contrast)
        if chosen[0] == chosen[1]:
            raise ValueError("same source respondent selected twice for %s" % dataset)
        participants = []
        audit_people = []
        for original, person in zip(originals, chosen):
            candidate = candidates[person]
            row, raw_line = read_selected(path, person, question, candidate)
            participant = public_participant(original, row, profile_maps[dataset],
                                             region_by_country)
            participants.append(participant)
            audit_people.append({
                "displayId": original["displayId"],
                "originalPersonId": original["sourceRef"]["sourcePersonId"],
                "selectedPersonId": person,
                "replaced": person != original["sourceRef"]["sourcePersonId"],
                "originalQuestionId": original["target"]["questionId"],
                "selectedQuestionId": question,
                "sourceLine": candidate["sourceLine"],
                "byteOffset": candidate["offset"],
                "rowSha256": hashlib.sha256(raw_line).hexdigest(),
                "cotSha256": hashlib.sha256(row["cot"].encode("utf-8")).hexdigest(),
            })
        if (participants[0]["target"] != participants[1]["target"]):
            raise ValueError("paired target question/options differ for %s" % dataset)
        public["datasets"].append({"datasetId": dataset,
                                   "availability": "ready", "participants": participants})
        audit["datasets"].append({"datasetId": dataset,
                                  "sourceFile": str(path), "targetQuestionId": question,
                                  "sourceCounts": counts, "participants": audit_people})
        print("%s %s | %s %s | %s %s" %
              (dataset, question,
               participants[0]["displayId"], chosen[0],
               participants[1]["displayId"], chosen[1]), flush=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.audit_output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(public, ensure_ascii=False, separators=(",", ":")) + "\n",
                           encoding="utf-8")
    args.audit_output.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n",
                                 encoding="utf-8")
    return public, audit


def main():
    site = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path,
                        default=Path("/Users/jaylen/Desktop/AAAI2027/thinking_data_posttrain"))
    parser.add_argument("--profile-maps-package", type=Path,
                        default=Path("/Users/jaylen/Documents/New project/output/SocialReasoner_18人完整资料包_20261105.zip"))
    parser.add_argument("--showcase", type=Path,
                        default=site / "assets" / "respondent-showcase.json")
    parser.add_argument("--geography", type=Path,
                        default=site / "assets" / "geography.json")
    parser.add_argument("--output", type=Path,
                        default=site / "assets" / "respondent-cots.json")
    parser.add_argument("--audit-output", type=Path,
                        default=Path("/Users/jaylen/Documents/New project/socialreasoner-site/review/respondent-cot-20261105/source-mapping.json"))
    args = parser.parse_args()
    public, _ = build(args)
    ready = sum(item["availability"] == "ready" for item in public["datasets"])
    people = sum(len(item["participants"]) for item in public["datasets"])
    print("Built %d ready datasets, %d respondents → %s" %
          (ready, people, args.output))


if __name__ == "__main__":
    main()
