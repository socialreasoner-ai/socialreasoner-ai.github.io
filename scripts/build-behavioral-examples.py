"""Build six website examples from the three published test files."""

import argparse
from collections import defaultdict
import json
from pathlib import Path
import re
from zipfile import ZipFile


SITE = Path(__file__).resolve().parents[1]
OUT = SITE / "assets/behavioral-examples.json"

# Keep the regions, artwork demographics, and shared opening question in each pair.
DATASETS = [
    ("CPS", "ClimateChange", "ClimateChange", "climate-change.zip", "Policy1",
     [("Brazil", "BRA", "Female", 56), ("Sweden", "SWE", "Female", 28)]),
    ("SDI", "SocialDistance", "SocialDistancing", "social-distance.zip", "intention_1w",
     [("MYS", "MYS", "Female", 27), ("PAK", "PAK", "Male", 25)]),
    ("VAPP", "COVID-19", "CUNY2023-COVID19-perceived", "covid-19.zip", "Q5",
     [("Russia", "RUS", "Male", 45), ("Germany", "DEU", "Male", 66)]),
]
FIELDS = [
    ("age", "Age"), ("age_group", "Age group"), ("sex", "Sex"),
    ("country", "Country"), ("education_level", "Education"),
    ("household_income_position", "Income position"),
]
PERSONAL_VIEWS = [
    "Your social political orientation score",
    "Your economic political orientation score",
]


def section(prompt, heading):
    marker = f"### {heading}:\n"
    if marker not in prompt:
        raise ValueError(f"Prompt has no {heading} section")
    return prompt.split(marker, 1)[1].split("\n### ", 1)[0].strip()


def profile_view(prompt):
    personal = section(prompt, "Personal Information")
    views = []
    for label in PERSONAL_VIEWS:
        match = re.search(rf"{re.escape(label)} is (.+?)\.(?= Your |$)", personal)
        if match:
            views.append((label, match[1]))
    for line in section(prompt, "Attitudinal and Psychological Measurement Profile").splitlines():
        if line.startswith("- "):
            question, value = line[2:].rsplit(": ", 1)
            views.append((question, value))
    match = re.search(r"Your socioeconomic status is (.+?)\.(?= Your |$)", personal)
    if match:
        views.append(("Your socioeconomic status", match[1]))
    return [
        {"profileKey": f"view-{index}", "question": question, "value": value}
        for index, (question, value) in enumerate(views, 1)
    ]


def demographics(profile):
    return [
        {"key": key, "label": label, "value": str(profile[key])}
        for key, label in FIELDS if profile.get(key) is not None and str(profile[key]).strip()
    ]


def build_dataset(code, name, source_name, archive_name, first_question, cases):
    wanted_countries = {country for country, _, _, _ in cases}
    questions = set()
    candidate_questions = defaultdict(set)
    candidate_profiles = {}
    archive_path = SITE / "downloads/behavioral" / archive_name

    with ZipFile(archive_path) as package, package.open("test.jsonl") as data:
        for line in data:
            row = json.loads(line)
            if row["dataset"] != source_name:
                raise ValueError(f"Unexpected dataset in {archive_name}")
            questions.add(row["question_id"])
            country = row["profile"]["country"]
            if country not in wanted_countries:
                continue
            person = row["person_id"]
            if person in candidate_profiles and candidate_profiles[person] != row["profile"]:
                raise ValueError(f"Inconsistent profile for {person}")
            candidate_profiles[person] = row["profile"]
            if row["question_id"] in candidate_questions[person]:
                raise ValueError(f"Duplicate question for {person}")
            candidate_questions[person].add(row["question_id"])

    if first_question not in questions:
        raise ValueError(f"Missing shared question {first_question}")
    selected = {}
    for country, _, target_sex, target_age in cases:
        complete = [
            person for person, profile in candidate_profiles.items()
            if profile["country"] == country and profile.get("sex") == target_sex
            and candidate_questions[person] == questions and profile.get("age") is not None
        ]
        if not complete:
            raise ValueError(f"No complete {code} test respondent matching the {country} illustration")
        selected[country] = min(
            complete,
            key=lambda person: (abs(float(candidate_profiles[person]["age"]) - target_age), person),
        )

    rows = {person: [] for person in selected.values()}
    with ZipFile(archive_path) as package, package.open("test.jsonl") as data:
        for line in data:
            row = json.loads(line)
            if row["person_id"] in rows:
                rows[row["person_id"]].append(row)

    participants = []
    for slot, (country, region, target_sex, _) in zip("AB", cases):
        person = selected[country]
        person_rows = rows[person]
        base = next(row for row in person_rows if row["question_id"] == first_question)
        base_profile = base["profile"]
        if base_profile["country"] != country or base_profile["sex"] != target_sex:
            raise ValueError(f"Unexpected country for {person}")
        fields = demographics(base_profile)
        perceptions = profile_view(base["prompt"])
        records = []
        for row in person_rows:
            if row["profile"] != base_profile:
                raise ValueError(f"Inconsistent profile for {person}")
            if profile_view(row["prompt"]) != perceptions:
                raise ValueError(f"Inconsistent prompt profile for {person}")
            answer_id = str(row["groundtruth_id"])
            if answer_id not in row["option"] or row["option"][answer_id] != row["groundtruth"]:
                raise ValueError(f"Answer is outside the option menu for {person}")
            records.append({
                "questionId": row["question_id"], "question": row["question"],
                "options": row["option"], "answerId": answer_id, "prompt": row["prompt"],
            })
        if {record["questionId"] for record in records} != questions:
            raise ValueError(f"Incomplete question set for {person}")
        records.sort(key=lambda record: (record["questionId"] != first_question, record["questionId"]))
        participants.append({
            "displayId": f"{code}-{slot}", "regionId": region, "respondentId": person,
            "demographics": fields, "perceptions": perceptions, "records": records,
        })
    return {"datasetId": code, "name": name, "archive": archive_name, "participants": participants}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    fixture = {"schemaVersion": 1, "datasets": [build_dataset(*item) for item in DATASETS]}
    encoded = json.dumps(fixture, ensure_ascii=False, separators=(",", ":")) + "\n"
    if args.check:
        if OUT.read_text(encoding="utf-8") != encoded:
            raise SystemExit("Behavioral examples do not match the published test data")
    else:
        OUT.write_text(encoded, encoding="utf-8")
    print("Verified sample profiles from", ", ".join(group["datasetId"] for group in fixture["datasets"]))
