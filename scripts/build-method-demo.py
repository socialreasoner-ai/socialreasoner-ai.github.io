#!/usr/bin/env python3
"""Build a small, verifiable method demo from stored post-training examples.

The three model slots are an illustrative assignment of distinct saved CoTs.
The merged source does not retain per-example expert provenance. This script
does not generate model outputs, change labels, or modify the source files.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path


SOURCE_BASENAME = "multisurvey_target_positive_semantic_denoiser_cot_merged_rewritten_v4.jsonl"
EXPERTS = ("ebm", "lgbm", "mlp")
QUESTIONS = {
    "ATP142-perceived": ("Q00007", "Q00026", "Q00039", "Q00048"),
    "ATP152-perceived": ("Q00006", "Q00008", "Q00033", "Q00035"),
    "EVS2017-perceived": ("Q00001", "Q00003", "Q00005", "Q00008"),
    "ISSP2009-perceived": ("Q00001", "Q00003", "Q00006", "Q00007"),
    "ISSP2015-perceived": ("Q00001", "Q00002", "Q00006", "Q00008"),
    "ISSP2016-perceived": ("Q00001", "Q00002", "Q00005", "Q00006"),
    "ISSP2019-perceived": ("Q00001", "Q00003", "Q00005", "Q00006"),
    "ISSP2021-perceived": ("Q00001", "Q00002", "Q00006", "Q00007"),
}
DEFAULT_DATASET = "ATP152-perceived"
PROFILE_COUNT = 4
MAX_VARIANTS_PER_PAIR = 12
FAMILIAR_COUNTRIES = {
    "United States", "China", "Germany", "France", "Great Britain",
    "United Kingdom", "Japan", "South Korea", "Australia", "Italy",
    "Spain", "Canada", "Netherlands", "Sweden",
}
STOPWORDS = set("a an and are as at be by do does for from how i if in is it of on or our that the their this to we what when which who with would you your think people respondent reports about important importance life much country extent agree disagree".split())
WORD_RE = re.compile(r"[a-z0-9]+")
PERSON_MARKER = b'"person_id":"'
QUESTION_MARKER = b'"question_id":"'


def value_after(line: bytes, marker: bytes) -> str:
    start = line.find(marker)
    if start < 0:
        return ""
    start += len(marker)
    end = line.find(b'"', start)
    return line[start:end].decode("ascii", "replace")


def tokens(text: str) -> set[str]:
    return {word for word in WORD_RE.findall(text.lower()) if word not in STOPWORDS and len(word) > 2}


def perceptions_from_prompt(row: dict, variant_rows: list[dict]) -> list[dict]:
    prompt = row["prompt"]
    anchor = "### Attitudinal and Psychological Measurement Profile:"
    if anchor not in prompt:
        raise ValueError("missing measurement section")
    section = prompt.split(anchor, 1)[1].split("### Question:", 1)[0]
    target_tokens = tokens(row["question"])
    perceptions = []
    for raw_line in section.splitlines():
        if not raw_line.startswith("- ") or ": " not in raw_line:
            continue
        label, response = raw_line[2:].rsplit(": ", 1)
        if tokens(label) == target_tokens:
            continue
        perceptions.append({
            "field": "perceived_demo_%02d" % (len(perceptions) + 1),
            "question": label.strip(),
            "response": response.strip(),
        })
    if not perceptions:
        raise ValueError("no visible perceptions")
    evidence = []
    for variant in variant_rows:
        result = variant.get("cot_rewrite_audit", {}).get("result", {})
        retained = set(result.get("retained_cue_ids", []))
        evidence.extend(cue.get("fact", "") for cue in variant.get("used_cues", [])
                        if cue.get("id") in retained)
        evidence.extend(result.get("supplemental_evidence", []))
    evidence_words = [tokens(fact) for fact in evidence]
    cot_words = tokens(" ".join(variant["cot"] for variant in variant_rows))
    def relevance(item: dict) -> int:
        words = tokens(item["question"])
        if not words:
            return 0
        return (5 * max((len(words & fact) for fact in evidence_words), default=0)
                + len(words & cot_words))
    return sorted(perceptions, key=lambda item: -relevance(item))


def clean_row(row: dict) -> bool:
    audit = row.get("cot_rewrite_audit", {}).get("result", {})
    answer = str(row.get("groundtruth_id", ""))
    return (
        row.get("split") == "train"
        and not row.get("fallback")
        and answer in row.get("option", {})
        and str(row.get("pred_option", "")) == answer
        and bool(row.get("cot", "").strip())
        and audit.get("status") == "ok"
        and not audit.get("audit_warnings")
        and not audit.get("unmatched_supplemental_evidence")
    )


def read_at(handle, offset: int) -> dict:
    handle.seek(offset)
    return json.loads(handle.readline())


def choose_variants(handle, offsets: list[tuple[int, int]], dataset: str, person: str, question: str):
    picked = []
    seen_cot = set()
    for offset, line_number in offsets:
        row = read_at(handle, offset)
        if (row.get("dataset", "").split("-perceived")[0] != dataset.split("-perceived")[0]
                or row.get("person_id") != person or row.get("question_id") != question):
            raise ValueError("source offset mismatch: %s %s %s" % (dataset, person, question))
        if not clean_row(row) or row["cot"] in seen_cot:
            continue
        if picked and (row["prompt"] != picked[0][2]["prompt"]
                       or row["groundtruth_id"] != picked[0][2]["groundtruth_id"]
                       or row["question"] != picked[0][2]["question"]):
            continue
        picked.append((offset, line_number, row))
        seen_cot.add(row["cot"])
        if len(picked) == len(EXPERTS):
            return picked
    return picked or None


def scan_source(path: Path, wanted_questions: tuple[str, ...]):
    pairs = defaultdict(list)
    counts = Counter()
    total_rows = 0
    with path.open("rb") as handle:
        while True:
            offset = handle.tell()
            line = handle.readline()
            if not line:
                break
            total_rows += 1
            question = value_after(line, QUESTION_MARKER)
            counts[question] += 1
            if question not in wanted_questions:
                continue
            person = value_after(line, PERSON_MARKER)
            key = (person, question)
            if person and len(pairs[key]) < MAX_VARIANTS_PER_PAIR:
                pairs[key].append((offset, total_rows))
    return pairs, counts, total_rows


def demographics(row: dict) -> dict:
    profile = row["profile"]
    return {
        "age": str(profile.get("age_group") or profile.get("age") or "—"),
        "gender": str(profile.get("sex") or "—"),
        "country": str(profile.get("country") or "—"),
        "education": str(profile.get("education_level") or "—"),
    }


def candidate_score(person: dict, chosen: list[dict]) -> int:
    fields = person["labelFields"]
    score = 0
    for key, weight in (("country", 20), ("age", 4), ("gender", 2), ("education", 1)):
        if fields[key] not in {item["labelFields"][key] for item in chosen}:
            score += weight
    if person["firstAnswer"] not in {item["firstAnswer"] for item in chosen}:
        score += 3
    if fields["country"] in FAMILIAR_COUNTRIES:
        score += 15
    if fields["gender"] not in ("", "—", "not answered", "not sure"):
        score += 5
    if fields["age"] in ("", "—", "not answered", "not sure"):
        score -= 25
    return score


def build_dataset(path: Path, dataset: str, wanted_questions: tuple[str, ...]):
    pairs, counts, total_rows = scan_source(path, wanted_questions)
    people = defaultdict(dict)
    for (person, question), offsets in pairs.items():
        if offsets:
            people[person][question] = offsets
    eligible = sorted(person for person, by_question in people.items()
                      if all(question in by_question for question in wanted_questions))
    if len(eligible) < PROFILE_COUNT:
        raise ValueError("only %d profiles have rows for all %d questions in %s" %
                         (len(eligible), len(wanted_questions), dataset))

    candidates = []
    with path.open("rb") as handle:
        ranked_people = sorted(eligible, key=lambda person: (
            -sum(min(len(people[person][question]), len(EXPERTS)) for question in wanted_questions),
            hashlib.sha256(person.encode("ascii")).digest(),
        ))
        for person in ranked_people[:500]:
            records = {}
            for question in wanted_questions:
                picked = choose_variants(handle, people[person][question], dataset, person, question)
                if not picked:
                    break
                records[question] = picked
            if len(records) != len(wanted_questions):
                continue
            first = records[wanted_questions[0]][0][2]
            candidates.append({
                "person": person,
                "labelFields": demographics(first),
                "firstAnswer": first["groundtruth_id"],
                "variantTotal": sum(len(records[question]) for question in wanted_questions),
                "records": records,
            })
    if len(candidates) < PROFILE_COUNT:
        raise ValueError("only %d fully clean profiles in %s" % (len(candidates), dataset))

    selected = []
    remaining = candidates[:]
    while len(selected) < PROFILE_COUNT:
        best = max(remaining, key=lambda person: (person["variantTotal"] * 10 + candidate_score(person, selected),
                                                -int(person["person"].removeprefix("P"))))
        selected.append(best)
        remaining.remove(best)

    public_profiles = []
    audit_profiles = []
    for profile_number, person in enumerate(selected, 1):
        profile_id = "profile-%02d" % profile_number
        public_records = []
        audit_records = []
        for question in wanted_questions:
            variants = person["records"][question]
            first = variants[0][2]
            record_id = "%s-%s" % (profile_id, question.lower())
            experts = {}
            variant_audit = {}
            for index, expert in enumerate(EXPERTS):
                offset, line_number, row = variants[index % len(variants)]
                answer = str(row["groundtruth_id"])
                experts[expert] = {
                    "cot": row["cot"],
                    "answerId": answer,
                    "answerLabel": row["option"][answer],
                }
                variant_audit[expert] = {
                    "byteOffset": offset,
                    "sourceLine": line_number,
                    "cotSha256": hashlib.sha256(row["cot"].encode("utf-8")).hexdigest(),
                    "answerId": answer,
                }
            public_records.append({
                "id": record_id,
                "questionId": question,
                "question": first["question"],
                "options": first["option"],
                "perceptions": perceptions_from_prompt(first, [row for _, _, row in variants]),
                "sourceVariantCount": len(variants),
                "experts": experts,
            })
            audit_records.append({"id": record_id, "questionId": question,
                                  "variants": variant_audit})
        public_profiles.append({"id": profile_id, "labelFields": person["labelFields"],
                                "records": public_records})
        audit_profiles.append({"id": profile_id, "sourcePersonId": person["person"],
                               "records": audit_records})

    summary = {
        "dataset": dataset,
        "sourceRows": total_rows,
        "sourceQuestions": len(counts),
        "candidateProfilesWithAllQuestions": len(eligible),
        "fullyCleanCandidateProfiles": len(candidates),
        "selectedProfiles": len(public_profiles),
        "selectedQuestionsPerProfile": len(wanted_questions),
        "storedCotVariants": len(public_profiles) * len(wanted_questions) * len(EXPERTS),
        "uniqueSourceVariants": sum(len(person["records"][question])
                                    for person in selected for question in wanted_questions),
    }
    public = {"id": dataset, "label": dataset, "sourceType": "posttrain",
              "profiles": public_profiles}
    audit = {"dataset": dataset, "sourceFile": str(path), "profiles": audit_profiles,
             "summary": summary}
    return public, audit


def main():
    repo = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path,
                        default=Path("/Users/jaylen/Desktop/AAAI2027/thinking_data_posttrain"))
    parser.add_argument("--output", type=Path, default=repo / "assets" / "method-demo.json")
    parser.add_argument("--audit-output", type=Path,
                        default=repo.parent / "review" / "method-demo-20261105" / "source-mapping.json")
    args = parser.parse_args()

    datasets = []
    audit_datasets = []
    dataset_order = (DEFAULT_DATASET,) + tuple(name for name in QUESTIONS if name != DEFAULT_DATASET)
    for dataset in dataset_order:
        questions = QUESTIONS[dataset]
        path = args.source_root / dataset / "target_positive" / SOURCE_BASENAME
        if not path.is_file():
            raise FileNotFoundError(path)
        public, audit = build_dataset(path, dataset, questions)
        datasets.append(public)
        audit_datasets.append(audit)
        print(json.dumps(audit["summary"], ensure_ascii=False), flush=True)

    public_data = {
        "version": 1,
        "modelAssignment": "illustrative",
        "source": "thinking_data_posttrain",
        "sourceGenerator": "answer-conditioned GLM rewrite",
        "datasets": datasets,
    }
    audit_data = {"modelAssignment": "illustrative", "datasets": audit_datasets}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.audit_output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(public_data, ensure_ascii=False, separators=(",", ":")) + "\n")
    args.audit_output.write_text(json.dumps(audit_data, ensure_ascii=False, indent=2) + "\n")
    print("Wrote %d datasets, %d public cases, %d exact CoTs" %
          (len(datasets), sum(len(p["records"]) for d in datasets for p in d["profiles"]),
           sum(len(r["experts"]) for d in datasets for p in d["profiles"] for r in p["records"])))


if __name__ == "__main__":
    main()
