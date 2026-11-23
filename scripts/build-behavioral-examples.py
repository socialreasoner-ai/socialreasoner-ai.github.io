"""Build the website's six example profiles from the released test files."""
import argparse
import json
from pathlib import Path
import re
from zipfile import ZipFile

SITE = Path(__file__).resolve().parents[1]
OUT = SITE / "assets/behavioral-examples.json"

# Public pseudonyms identify the same examples when the site is rebuilt.
CASES = [
    ("CPS", "ClimateChange", "climate-change", "Policy1", [
        ("r4d8ed77f74863f7f", "Brazil", "BRA"), ("r5d0745a3fdbe49e8", "Sweden", "SWE")]),
    ("SDI", "SocialDistance", "social-distance", "intention_1w", [
        ("r84263a7ac70caf9c", "MYS", "MYS"), ("r78d36a55e601e6d6", "PAK", "PAK")]),
    ("VAPP", "COVID-19", "covid-19", "Q5", [
        ("r52ffdbb12461a48e", "Russia", "RUS"), ("rd93c3389cde4bd77", "Germany", "DEU")]),
]
FIELDS = [
    ("age", "Age", "age"), ("age_group", "Age group", "age group"), ("sex", "Sex", "sex"),
    ("country", "Country", "country"), ("education_level", "Education", "education level"),
    ("household_income_position", "Income position", "household income position"),
]


def section(prompt, heading):
    return prompt.split(f"### {heading}:\n", 1)[1].split("\n### ", 1)[0].strip()


def profile(prompt):
    information = section(prompt, "Personal Information")
    fields = []
    for key, label, source in FIELDS:
        match = re.search(rf"Your {source} is (.+?)\.(?= Your |$)", information)
        if match:
            fields.append({"key": key, "label": label, "value": match[1]})
    views = []
    for line in section(prompt, "Attitudinal and Psychological Measurement Profile").splitlines():
        if not line.startswith("- "):
            continue
        statement = line[2:]
        if ": " in statement:
            question, answer = statement.rsplit(": ", 1)
        else:
            # CPS also stores its political and socioeconomic self-ratings as statements.
            question, answer = statement.rstrip(".").split(" is ", 1)
        views.append({"profileKey": f"view-{len(views) + 1}", "question": question, "value": answer})
    return fields, views


def build_dataset(code, name, archive_name, first_question, cases):
    archive = f"{archive_name}.zip"
    rows = {person: [] for person, _, _ in cases}
    wanted_bytes = [person.encode("ascii") for person in rows]
    with ZipFile(SITE / "downloads/behavioral" / archive) as package, package.open("test.jsonl") as data:
        for line in data:
            # The full prompt can be long; skip unrelated records before parsing it.
            if not any(person in line for person in wanted_bytes):
                continue
            row = json.loads(line)
            if row["respondent_id"] in rows:
                rows[row["respondent_id"]].append(row)
    participants = []
    for slot, (person_id, country, region) in zip("AB", cases):
        person_rows = rows[person_id]
        base = next(row for row in person_rows if row["question_id"] == first_question)
        demographics, perceptions = profile(base["prompt"])
        assert next(field["value"] for field in demographics if field["key"] == "country") == country
        records = []
        for row in person_rows:
            assert row["split"] == "test" and row["groundtruth_id"] in row["option"]
            assert profile(row["prompt"]) == (demographics, perceptions)
            records.append({"questionId": row["question_id"], "question": row["question"],
                            "options": row["option"], "answerId": row["groundtruth_id"], "prompt": row["prompt"]})
        assert len({record["questionId"] for record in records}) == len(records)
        records.sort(key=lambda record: record["questionId"] != first_question)
        participants.append({"displayId": f"{code}-{slot}", "regionId": region, "respondentId": person_id,
                             "demographics": demographics, "perceptions": perceptions, "records": records})
    return {"datasetId": code, "name": name, "archive": archive, "participants": participants}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    fixture = {"schemaVersion": 1, "datasets": [build_dataset(*item) for item in CASES]}
    data = json.dumps(fixture, ensure_ascii=False, separators=(",", ":")) + "\n"
    if args.check:
        if OUT.read_text(encoding="utf-8") != data:
            raise SystemExit("Behavioral examples do not match the published test data")
    else:
        OUT.write_text(data, encoding="utf-8")
    print("Verified sample profiles from", ", ".join(group["datasetId"] for group in fixture["datasets"]))
