#!/usr/bin/env python3
"""Build the public showcase from the audited 18-person package.

Run with the extracted package directory as the only argument. The builder
does not write to or change the source package.
"""

import json
import shutil
import subprocess
import sys
from collections import defaultdict
from pathlib import Path


SITE = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]).resolve() if len(sys.argv) == 2 else None
if not SOURCE or not (SOURCE / "manifest.json").is_file():
    raise SystemExit("Usage: build-showcase.py <extracted-18-person-package>")

package = json.loads((SOURCE / "manifest.json").read_text(encoding="utf-8"))
geography = json.loads((SITE / "assets/geography.json").read_text(encoding="utf-8"))
region_by_country = {region["label"]: region["id"] for region in geography["regions"]}
chosen_questions = {
    "ATP142": "Q00004", "ATP152": "Q00004", "EVS2017": "Q00047",
    "GSS2022": "Q00020", "ISSP2009": "Q00020", "ISSP2015": "Q00025",
    "ISSP2016": "Q00007", "ISSP2019": "Q00018", "ISSP2021": "Q00020",
}
by_dataset = defaultdict(list)
for entry in package["people"]:
    by_dataset[entry["dataset"]].append(entry)

assets = SITE / "assets/avatars"
assets.mkdir(exist_ok=True)


def profile_map(dataset):
    files = list((SOURCE / "dataset_definitions" / dataset / "perceived").glob("*profile_map.json"))
    if len(files) != 1:
        raise ValueError(f"Expected one perceived profile map for {dataset}")
    return json.loads(files[0].read_text(encoding="utf-8")), files[0].relative_to(SOURCE).as_posix()


def perceived_profile(key, target_id):
    base = SOURCE / "people" / key / "data/perceived"
    rows = []
    chosen_path = None
    for path in sorted(base.glob("*.jsonl")):
        if path.stat().st_size:
            chosen_path = path
            with path.open(encoding="utf-8") as stream:
                rows = [json.loads(line) for line in stream if line.strip()]
            break
    if not rows:
        raise ValueError(f"No perceived records for {key}")
    # The perceived variant builds a target-specific profile. Select the row
    # for the exact question displayed below, rather than using another
    # question's profile and leaking its answer into the measured context.
    target_row = next((row for row in rows if row["question_id"] == target_id), None)
    if target_row is None:
        raise ValueError(f"No matching perceived target row: {key} {target_id}")
    return target_row["profile"], target_row["dataset"], chosen_path.relative_to(SOURCE).as_posix()


output = {"schemaVersion": 1, "sourceVersion": "SocialReasoner_18人完整资料包_20261105",
          "avatarBasis": "Fictional illustrations; not portraits of respondents",
          "datasets": []}
for dataset in (item["id"] for item in geography["datasets"]):
    people = by_dataset[dataset]
    if len(people) != 2:
        raise ValueError(f"Expected exactly two people in {dataset}")
    mapping, mapping_path = profile_map(dataset)
    participants = []
    for index, entry in enumerate(people):
        key = entry["key"]
        person_dir = SOURCE / "people" / key
        profile = json.loads((person_dir / "profile.json").read_text(encoding="utf-8"))
        if profile != entry["profile"]:
            raise ValueError(f"Profile mismatch: {key}")
        answers = json.loads((person_dir / "answers.json").read_text(encoding="utf-8"))
        if not all(answer["person_id"] == entry["person_id"] and answer["dataset"] == dataset
                   and all(profile.get(name) == value for name, value in answer["profile_as_used"].items())
                   for answer in answers):
            raise ValueError(f"Answers/profile mismatch: {key}")
        answer = next((row for row in answers if row["question_id"] == chosen_questions[dataset]), None)
        if answer is None:
            raise ValueError(f"Missing target question: {key}")
        if answer["profile_as_used"] != profile:
            raise ValueError(f"Target/profile mismatch: {key}")
        if answer["answer_id"] not in answer["options"] or answer["answer"] != answer["options"][answer["answer_id"]]:
            raise ValueError(f"Answer label mismatch: {key}")
        perceived, perceived_dataset, perceived_path = perceived_profile(key, chosen_questions[dataset])
        if any(perceived.get(name) != value for name, value in profile.items()):
            raise ValueError(f"Perceived record's base profile mismatch: {key}")
        answer_by_id = {row["question_id"]: row for row in answers}
        perceptions = []
        for name, value in perceived.items():
            if not name.startswith("perceived_") or value is None or str(value).strip() == "":
                continue
            rule = mapping.get(name)
            if not rule:
                raise ValueError(f"Perceived field without mapping: {dataset} {name}")
            source_qid = rule["source_question_id"]
            if source_qid == chosen_questions[dataset]:
                continue
            source_answer = answer_by_id.get(source_qid)
            perceptions.append({
                "profileKey": name,
                "sourceQuestionId": source_qid,
                "label": rule["display_name"],
                "question": source_answer["question"] if source_answer else rule["display_name"],
                "value": value,
            })
        country = profile.get("country")
        if country not in region_by_country:
            raise ValueError(f"Country not in geography: {key} {country}")
        region_id = region_by_country[country]
        src_avatar = SOURCE / entry["avatar"]
        if not src_avatar.is_file():
            raise ValueError(f"Missing avatar: {key}")
        full_avatar = assets / f"{key}.png"
        thumb_avatar = assets / f"{key}-preview.png"
        shutil.copy2(src_avatar, full_avatar)
        subprocess.run(["sips", "-Z", "320", str(src_avatar), "--out", str(thumb_avatar)],
                       check=True, stdout=subprocess.DEVNULL)
        participants.append({
            "displayId": f"{dataset}-{['A', 'B'][index]}",
            "datasetId": dataset,
            "regionId": region_id,
            "sourceRef": {
                "package": output["sourceVersion"],
                "recordKey": key,
                "sourcePersonId": entry["person_id"],
                "profilePath": entry["profile_file"],
                "answersPath": entry["answers_file"],
                "avatarPath": entry["avatar"],
                "perceivedRecordPath": perceived_path,
                "perceivedDatasetVersion": perceived_dataset,
                "perceivedMapPath": mapping_path,
                "targetQuestionId": chosen_questions[dataset],
                "targetSourceLine": answer["source_line"],
                "split": answer["split"],
            },
            "surveyTime": entry.get("survey_time", ""),
            "demographics": [{"key": name, "label": name.replace("_", " ").title(), "value": value}
                             for name, value in profile.items() if value is not None],
            "perceptions": perceptions,
            "target": {
                "questionId": answer["question_id"],
                "question": answer["question"],
                "options": [{"id": option_id, "text": text} for option_id, text in answer["options"].items()],
            },
            "observedOptionId": answer["answer_id"],
            "avatar": {"posterPath": f"assets/avatars/{key}-preview.png",
                       "fullPath": f"assets/avatars/{key}.png",
                       "modelPath": None, "assetStatus": "poster-only", "animations": {}},
            "mapAnchor": {"regionId": region_id, "displayOffset": None},
            "avatarIllustrative": True,
        })
    left, right = participants
    left_target, right_target = left["target"], right["target"]
    if (left_target["questionId"] != right_target["questionId"] or
            left_target["question"] != right_target["question"] or
            left_target["options"] != right_target["options"]):
        raise ValueError(f"Shared target differs in {dataset}")
    output["datasets"].append({"datasetId": dataset, "availability": "ready", "participants": participants})

dest = SITE / "assets/respondent-showcase.json"
dest.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"Built {len(output['datasets'])} datasets, {sum(len(d['participants']) for d in output['datasets'])} people → {dest}")
