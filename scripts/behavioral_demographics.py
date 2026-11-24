"""Aggregate release-specific age histograms directly from the three published ZIPs."""
from collections import Counter, defaultdict
import json
from zipfile import ZipFile


ARCHIVES = {"CPS": "climate-change.zip", "VAPP": "covid-19.zip", "SDI": "social-distance.zip"}
AGE_RANGES = ((18, 29), (30, 39), (40, 49), (50, 59), (60, 69), (70, None))
BINS = [
    {
        "id": f"age_{lo}_{hi if hi is not None else 'plus'}",
        "label": f"{lo}-{hi}" if hi is not None else f"{lo}+",
        "lower": lo, "upper": hi,
    }
    for lo, hi in AGE_RANGES
]


def release_age(dataset, profile):
    if dataset == "VAPP":
        group = profile.get("age_group")
        if group is None or group == "":
            return None, "sourceMissingAge"
        return [item["label"] for item in BINS].index(group), None
    value = profile.get("age")
    if value is None or value == "":
        return None, "sourceMissingAge"
    years = float(value)
    # Legate et al., PNAS 2022, page 8: the analyzed sample was aged 18–89.
    if dataset == "SDI" and not 18 <= years <= 89:
        return None, "sourceAgeOutsideStudyRange"
    for i, (lo, hi) in enumerate(AGE_RANGES):
        if lo <= years and (hi is None or years < hi + 1):
            return i, None
    raise ValueError(f"{dataset}: age outside the display bands: {years}")


def release_histogram(dataset, path, country_ids, geo_dataset):
    people = {}
    rows = 0
    with ZipFile(path) as archive:
        for split in ("train", "test"):
            with archive.open(split + ".jsonl") as data:
                for line in data:
                    row = json.loads(line)
                    rows += 1
                    profile = row["profile"]
                    country = profile["country"]
                    if country not in country_ids:
                        raise ValueError(f"{dataset}: unmapped country in profile")
                    age, missing = release_age(dataset, profile)
                    person = (country_ids[country], age, missing, split)
                    if people.setdefault(row["person_id"], person) != person:
                        raise ValueError(f"{dataset}: respondent has inconsistent region, age, or split")
    if (rows, len(people)) != (geo_dataset["responses"], geo_dataset["respondents"]):
        raise ValueError(f"{dataset}: download and geography do not match")

    counts, audit = defaultdict(Counter), defaultdict(Counter)
    for region_id, age, reason, _ in people.values():
        if reason:
            audit[region_id][reason] += 1
        else:
            counts[region_id][age] += 1
    if set(counts) | set(audit) != {r["id"] for r in geo_dataset["regions"]}:
        raise ValueError(f"{dataset}: geography contains different release regions")
    regions, totals = [], Counter()
    for region in sorted(geo_dataset["regions"], key=lambda r: r["id"]):
        region_id = region["id"]
        histogram = [counts[region_id][i] for i in range(len(BINS))]
        known = sum(histogram)
        reasons = {
            key: audit[region_id][key]
            for key in ("sourceMissingAge", "sourceAgeOutsideStudyRange")
        }
        unknown = sum(reasons.values())
        if known + unknown != region["count"]:
            raise ValueError(f"{dataset}/{region_id}: ages and geographic total differ")
        regions.append({
            "regionId": region_id, "schemeId": "native" if dataset == "VAPP" else "from_years",
            "counts": histogram, "known": known, "unknown": unknown,
            "sourceRespondents": known + unknown, "releaseRespondents": known + unknown, "audit": reasons,
        })
        totals.update(known=known, unknown=unknown, sourceRespondents=known + unknown,
                      releaseRespondents=known + unknown, **reasons)

    scheme = {
        "id": "native" if dataset == "VAPP" else "from_years",
        "regionIds": [r["regionId"] for r in regions], "binIds": [b["id"] for b in BINS],
    }
    return {"id": dataset, "bins": BINS, "nativeSchemes": [scheme], "regions": regions,
            "totals": dict(totals), "sourceRows": rows}


def append_behavioral_portraits(result, geography_path, release_dir, region_mapping):
    geography = json.loads(geography_path.read_text())
    country_ids = json.loads(region_mapping.read_text())
    geo_by_id = {d["id"]: d for d in geography["datasets"]}
    original = [d for d in result["datasets"] if d["id"] not in ARCHIVES]
    additions = [release_histogram(dataset, release_dir / archive, country_ids, geo_by_id[dataset])
                 for dataset, archive in ARCHIVES.items()]
    result["datasets"] = original + additions
    result["source"]["scope"] = ("The nine original surveys retain their reported age groups. "
                                 "Age sources for the three behavioral downloads are documented below.")
    result["source"]["behavioralRelease"] = {
        "respondentKey": "person_id within each dataset across train.jsonl and test.jsonl",
        "ageField": "profile.age for CPS and SDI; profile.age_group for VAPP",
        "CPS": "Age in years, displayed in six age bands.",
        "SDI": "Age in years, displayed in six age bands. Ages outside the published sample range of 18–89 are unavailable in the histogram.",
        "SDIStudy": "https://doi.org/10.1073/pnas.2111091119",
        "VAPP": "Six age groups provided in the survey data.",
    }
    total = Counter()
    for dataset in result["datasets"]:
        total.update(dataset["totals"])
        total["sourceRows"] += dataset["sourceRows"]
    total["coverageRespondents"] = total["manuscriptRespondents"] + total["releaseRespondents"]
    if total["known"] + total["unknown"] != geography["totalRespondents"]:
        raise ValueError("Age profiles do not reconcile to the geographic index")
    result["audit"] = dict(total)
    return result
