#!/usr/bin/env python3
"""Build anonymous age-group counts from local survey JSONL files.

No person-level data is written. person_id is used in memory only to count
each respondent once per dataset across train and test.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path
import re

DATASETS = (
    "ATP142", "ATP152", "EVS2017", "ISSP2009", "ISSP2015",
    "ISSP2016", "ISSP2019", "ISSP2021", "GSS2022",
)
# Frozen counts from the clean no-perception source that generated the original
# geographic audit. The manuscript geography contains 18 additional records.
EXPECTED_SOURCE = {
    "ATP142": (330148, 9851),
    "ATP152": (244976, 5227),
    "EVS2017": (2552997, 50916),
    "ISSP2009": (1503093, 48822),
    "ISSP2015": (682112, 45093),
    "ISSP2016": (1501830, 43435),
    "ISSP2019": (1044234, 40236),
    "ISSP2021": (841609, 37897),
    "GSS2022": (24649, 500),
}
STANDARD_2015 = ("under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+")
DENMARK_2015 = ("18-25", "26-35", "36-45", "46-55", "56-65", "65+")
CONFLICT = object()


def normal(value):
    if value is None:
        return None
    if isinstance(value, str):
        return value.strip() or None
    return str(value)


def merge_value(old, new):
    if old is CONFLICT or new is None or old == new:
        return old
    if old is None:
        return new
    return CONFLICT


def age_bin(label):
    if label == "under 18":
        return {"id": "under_18", "label": label, "lower": None, "upper": 17}
    if label == "65+":
        return {"id": "age_65_plus", "label": label, "lower": 65, "upper": None}
    match = re.fullmatch(r"(\d+)-(\d+)", label)
    if not match:
        raise ValueError(f"Unrecognized source age-group label: {label!r}")
    lower, upper = map(int, match.groups())
    if lower < 0 or lower > upper or upper > 120:
        raise ValueError(f"Invalid source age-group bounds: {label!r}")
    return {"id": f"age_{lower}_{upper}", "label": label, "lower": lower, "upper": upper}


def source_people(source_root, dataset):
    people = {}
    source_rows = 0
    missing_id_rows = 0
    for split, mask in (("train", 1), ("test", 2)):
        path = source_root / f"{dataset}-no-perception" / f"{split}.jsonl"
        if not path.exists():
            if split == "train" and dataset == "GSS2022":
                continue
            raise FileNotFoundError(path)
        with path.open("r", encoding="utf-8", buffering=1024 * 1024) as stream:
            for line in stream:
                if not line.strip():
                    continue
                source_rows += 1
                record = json.loads(line)
                pid = record.get("person_id")
                if pid is None or pid == "":
                    missing_id_rows += 1
                    continue
                profile = record.get("profile") or {}
                country = normal(profile.get("country"))
                group = normal(profile.get("age_group"))
                prior = people.get(pid)
                if prior is None:
                    people[pid] = [country, group, mask]
                else:
                    prior[0] = merge_value(prior[0], country)
                    prior[1] = merge_value(prior[1], group)
                    prior[2] |= mask
    expected_rows, expected_people = EXPECTED_SOURCE[dataset]
    if (source_rows, len(people)) != (expected_rows, expected_people):
        raise ValueError(
            f"{dataset}: source rows/respondents changed: "
            f"{(source_rows, len(people))} != {(expected_rows, expected_people)}"
        )
    if missing_id_rows:
        raise ValueError(f"{dataset}: {missing_id_rows} records have no person_id")
    return people, source_rows


def schemes(dataset, regions, labels, bin_by_label):
    region_ids = sorted(regions)
    if dataset != "ISSP2015":
        ordered = sorted(labels, key=lambda label: (
            -1 if bin_by_label[label]["lower"] is None else bin_by_label[label]["lower"],
            999 if bin_by_label[label]["upper"] is None else bin_by_label[label]["upper"],
        ))
        return [{
            "id": "native",
            "regionIds": region_ids,
            "binIds": [bin_by_label[label]["id"] for label in ordered],
        }]
    if "DNK" not in regions:
        raise ValueError("ISSP2015 Denmark region is missing")
    for region_id, counts in regions.items():
        allowed = DENMARK_2015 if region_id == "DNK" else STANDARD_2015
        unexpected = set(counts) - set(allowed)
        if unexpected:
            raise ValueError(f"ISSP2015 {region_id} has unexpected age groups {unexpected}")
    return [
        {
            "id": "standard",
            "regionIds": [region_id for region_id in region_ids if region_id != "DNK"],
            "binIds": [bin_by_label[label]["id"] for label in STANDARD_2015],
        },
        {
            "id": "denmark",
            "regionIds": ["DNK"],
            "binIds": [bin_by_label[label]["id"] for label in DENMARK_2015],
        },
    ]


def build(source_root, mapping_path, geography_path):
    mapping_rows = json.loads(mapping_path.read_text(encoding="utf-8"))
    mapping = {(row["dataset"], row["sourceLabel"]): row for row in mapping_rows}
    if len(mapping) != len(mapping_rows):
        raise ValueError("Duplicate geography label mapping")
    geography = json.loads(geography_path.read_text(encoding="utf-8"))
    paper_datasets = {row["id"]: row for row in geography["datasets"]}
    if set(paper_datasets) != set(DATASETS):
        raise ValueError("Manuscript geography does not contain the expected nine datasets")

    result = {
        "schemaVersion": 1,
        "source": {
            "ageField": "profile.age_group",
            "variant": "clean no-perception survey JSONL",
            "respondentKey": "person_id within each dataset across train and test",
            "geographyCohort": "manuscript geography counts",
            "countUnit": "unweighted respondents",
            "scope": "Age labels are kept in their native survey groups. No age ranges are subdivided or estimated.",
            "cohortDifference": "The clean source has 18 fewer respondents than the manuscript geography; those ages are unknown.",
        },
        "datasets": [],
        "audit": {},
    }
    totals = Counter()
    for dataset in DATASETS:
        people, source_rows = source_people(source_root, dataset)
        paper_regions = {row["id"]: row["count"] for row in paper_datasets[dataset]["regions"]}
        raw_countries = Counter()
        source_by_region = Counter()
        labels_by_region = defaultdict(Counter)
        audit_by_region = defaultdict(Counter)
        train_test_overlap = 0
        for country, group, mask in people.values():
            if mask == 3:
                train_test_overlap += 1
            if country is CONFLICT or country is None:
                raise ValueError(f"{dataset}: conflicting or missing country for a respondent")
            raw_countries[country] += 1
            mapping_row = mapping.get((dataset, country))
            if mapping_row is None:
                raise ValueError(f"{dataset}: country label is missing from the local mapping")
            region_id = mapping_row["mapId"]
            source_by_region[region_id] += 1
            if group is CONFLICT:
                audit_by_region[region_id]["sourceAgeConflicts"] += 1
            elif group is None:
                audit_by_region[region_id]["sourceMissingAge"] += 1
            else:
                age_bin(group)  # Refuse undocumented labels rather than guessing.
                labels_by_region[region_id][group] += 1
        if train_test_overlap:
            raise ValueError(f"{dataset}: train/test respondent overlap: {train_test_overlap}")
        if set(source_by_region) != set(paper_regions):
            raise ValueError(f"{dataset}: source and manuscript regions differ")
        for country, count in raw_countries.items():
            if count != mapping[(dataset, country)]["count"]:
                raise ValueError(f"{dataset}: clean source geography differs from audited mapping")
        labels = {label for counts in labels_by_region.values() for label in counts}
        bin_by_label = {label: age_bin(label) for label in labels}
        if dataset == "ISSP2015":
            # Some source labels are absent in particular regions; keep both
            # survey-native schemes intact instead of collapsing their ranges.
            for label in set(STANDARD_2015 + DENMARK_2015):
                bin_by_label.setdefault(label, age_bin(label))
        ordered_bins = sorted(bin_by_label.values(), key=lambda row: (
            -1 if row["lower"] is None else row["lower"],
            999 if row["upper"] is None else row["upper"],
        ))
        if len({row["id"] for row in ordered_bins}) != len(ordered_bins):
            raise ValueError(f"{dataset}: duplicate age-bin IDs")
        region_age_groups = {region_id: labels_by_region[region_id] for region_id in source_by_region}
        native_schemes = schemes(dataset, region_age_groups, labels, bin_by_label)
        scheme_by_region = {
            region_id: scheme["id"] for scheme in native_schemes for region_id in scheme["regionIds"]
        }
        if set(scheme_by_region) != set(paper_regions):
            raise ValueError(f"{dataset}: native age scheme does not cover every region")
        regions = []
        dataset_total = Counter()
        for region_id in sorted(paper_regions):
            source_count = source_by_region[region_id]
            paper_count = paper_regions[region_id]
            if source_count > paper_count:
                raise ValueError(f"{dataset}/{region_id}: source exceeds manuscript respondent count")
            counts = [labels_by_region[region_id][row["label"]] for row in ordered_bins]
            known = sum(counts)
            source_missing = audit_by_region[region_id]["sourceMissingAge"]
            source_conflicts = audit_by_region[region_id]["sourceAgeConflicts"]
            if known + source_missing + source_conflicts != source_count:
                raise ValueError(f"{dataset}/{region_id}: age accounting mismatch")
            cohort_gap = paper_count - source_count
            unknown = paper_count - known
            if unknown != source_missing + source_conflicts + cohort_gap:
                raise ValueError(f"{dataset}/{region_id}: unknown-age accounting mismatch")
            row = {
                "regionId": region_id,
                "schemeId": scheme_by_region[region_id],
                "counts": counts,
                "known": known,
                "unknown": unknown,
                "sourceRespondents": source_count,
                "manuscriptRespondents": paper_count,
                "audit": {
                    "sourceMissingAge": source_missing,
                    "sourceAgeConflicts": source_conflicts,
                    "manuscriptCohortGap": cohort_gap,
                },
            }
            regions.append(row)
            dataset_total.update({
                "known": known,
                "unknown": unknown,
                "sourceRespondents": source_count,
                "manuscriptRespondents": paper_count,
                "sourceMissingAge": source_missing,
                "sourceAgeConflicts": source_conflicts,
                "manuscriptCohortGap": cohort_gap,
            })
        if dataset_total["sourceRespondents"] != len(people):
            raise ValueError(f"{dataset}: source respondent total mismatch")
        if dataset_total["manuscriptRespondents"] != paper_datasets[dataset]["respondents"]:
            raise ValueError(f"{dataset}: manuscript respondent total mismatch")
        result["datasets"].append({
            "id": dataset,
            "bins": ordered_bins,
            "nativeSchemes": native_schemes,
            "regions": regions,
            "totals": dict(dataset_total),
            "sourceRows": source_rows,
        })
        totals.update(dataset_total)
        totals["sourceRows"] += source_rows
        print(
            f"{dataset}: {len(people):,} source respondents, "
            f"{dataset_total['known']:,} known ages, "
            f"{dataset_total['unknown']:,} unknown against manuscript geography"
        )
    if totals["sourceRespondents"] != 281977 or totals["sourceRows"] != 8725648:
        raise ValueError("Clean-source totals changed")
    if totals["manuscriptRespondents"] != 281995 or totals["manuscriptCohortGap"] != 18:
        raise ValueError("Manuscript-cohort totals changed")
    if totals["known"] + totals["unknown"] != totals["manuscriptRespondents"]:
        raise ValueError("Overall age accounting mismatch")
    result["audit"] = dict(totals)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--mapping", type=Path, required=True, help="Local audited geography/label_mapping.json")
    parser.add_argument("--geography", type=Path, default=Path(__file__).resolve().parents[1] / "assets/geography.json")
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "assets/demographics.json")
    parser.add_argument("--check", action="store_true", help="Compare the aggregate with --output without writing")
    args = parser.parse_args()
    result = build(args.source_root, args.mapping, args.geography)
    serialized = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if args.output.read_text(encoding="utf-8") != serialized:
            raise ValueError("Demographics aggregate differs from the current source")
        print("Demographics aggregate matches the local source.")
    else:
        args.output.write_text(serialized, encoding="utf-8")
        print(f"Wrote anonymous demographics aggregate: {args.output}")


if __name__ == "__main__":
    main()
