#!/usr/bin/env python3
"""Build exact presentation labels for saved Method evidence.

This optional lookup contains only question/response pairs already present in
method-demo.json. Unmatched or ambiguous facts keep their original sentence.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class PromptFact:
    label: str
    value: str


# Canonicalization copied without changes from the source training generator:
# build_margin_contribution_mlp_autognothi_cot_v1.py, functions of the same names.
# Branch normalization is internal; matching below compares full strings exactly.
def clean_text(value: Any) -> str:
    return " ".join(str(value if value is not None else "").strip().split())


def normalize_match_text(value: Any) -> str:
    """Conservative Unicode/case/terminal-punctuation normalization."""
    text = unicodedata.normalize("NFKC", clean_text(value)).casefold()
    text = text.replace("’", "'").replace("“", '"').replace("”", '"')
    text = text.replace("–", "-").replace("—", "-").replace("−", "-")
    text = re.sub(r"[\s\u00a0]+", " ", text)
    text = re.sub(r"^[\s\"']+|[\s\"'.,;:!?]+$", "", text)
    return text


def lowercase_initial(text: str) -> str:
    text = clean_text(text)
    if not text:
        return text
    # Preserve genuine acronyms and a small class of intrinsic proper forms,
    # while still changing phrases such as "A convinced atheist" to lowercase.
    if re.match(r"^[A-Z]{2}", text) or re.match(r"^[A-Z]\.", text):
        return text
    if text == "God":
        return text
    return text[0].lower() + text[1:]


def strip_terminal_punctuation(text: str) -> str:
    return clean_text(text).rstrip(" .;:!?")


def prompt_fact_to_clause(fact: PromptFact) -> str:
    """Turn a prompt fact into a fluent, conservative evidence clause."""
    label = strip_terminal_punctuation(fact.label)
    value = strip_terminal_punctuation(fact.value)
    value_lower = lowercase_initial(value)

    normalized_label = normalize_match_text(label)
    normalized_value = normalize_match_text(value)

    if normalized_label == "religious self-identification":
        return f"the respondent identifies as {value_lower}"

    if normalized_label == "religious denomination":
        return f"the respondent reports a {value_lower} religious denomination"

    if normalized_label == "has a religious affiliation":
        if normalized_value == "yes":
            return "the respondent reports having a religious affiliation"
        if normalized_value == "no":
            return "the respondent reports having no religious affiliation"

    match = re.fullmatch(r"belief in\s+(.+)", label, flags=re.IGNORECASE)
    if match:
        object_text = lowercase_initial(match.group(1))
        if normalized_value == "yes":
            return f"the respondent reports believing in {object_text}"
        if normalized_value == "no":
            return f"the respondent reports no belief in {object_text}"
        return f"the respondent describes their belief in {object_text} as {value_lower}"

    match = re.fullmatch(r"conception of\s+(.+)", label, flags=re.IGNORECASE)
    if match:
        return f"the respondent describes their conception of {lowercase_initial(match.group(1))} as {value_lower}"

    match = re.fullmatch(r"importance of\s+(.+?)\s+in\s+(.+)", label, flags=re.IGNORECASE)
    if match:
        return (
            f"the respondent considers {lowercase_initial(match.group(1))} {value_lower} "
            f"in {lowercase_initial(match.group(2))}"
        )

    match = re.fullmatch(r"confidence in\s+(.+)", label, flags=re.IGNORECASE)
    if match:
        return f"the respondent reports {value_lower} confidence in {lowercase_initial(match.group(1))}"

    match = re.fullmatch(r"trust in\s+(.+)", label, flags=re.IGNORECASE)
    if match:
        trust_level = re.sub(r"^trust\s+", "", value_lower, flags=re.IGNORECASE)
        return f"the respondent reports trusting {lowercase_initial(match.group(1))} {trust_level}"

    if normalized_label == "generalized social trust":
        return f"the respondent believes that {value_lower}"

    match = re.fullmatch(r"interest in\s+(.+)", label, flags=re.IGNORECASE)
    if match and "interested" in normalized_value:
        return f"the respondent is {value_lower} in {lowercase_initial(match.group(1))}"

    match = re.fullmatch(r"rating of\s+(.+)", label, flags=re.IGNORECASE)
    if match:
        return f"the respondent rates {lowercase_initial(match.group(1))} at {value_lower}"

    match = re.fullmatch(r"comfort\s+(.+)", label, flags=re.IGNORECASE)
    if match and "comfortable" in value.casefold():
        return f"the respondent reports being {value_lower} {lowercase_initial(match.group(1))}"

    match = re.fullmatch(r"importance of\s+(.+?)\s+to\s+(.+)", label, flags=re.IGNORECASE)
    if match:
        return (
            f"the respondent considers {lowercase_initial(match.group(1))} "
            f"{value_lower} to {lowercase_initial(match.group(2))}"
        )

    match = re.fullmatch(r"perceived threat of\s+(.+?)\s+to\s+(.+)", label, flags=re.IGNORECASE)
    if match:
        return (
            f"the respondent views {match.group(1)} as {value_lower} "
            f"to {lowercase_initial(match.group(2))}"
        )

    match = re.fullmatch(r"perceived effect of\s+(.+?)\s+on\s+(.+)", label, flags=re.IGNORECASE)
    if match:
        return (
            f"the respondent rates the effect of {lowercase_initial(match.group(1))} "
            f"on {lowercase_initial(match.group(2))} as {value_lower}"
        )

    match = re.fullmatch(r"perceived political influence of\s+(.+)", label, flags=re.IGNORECASE)
    if match:
        subject = lowercase_initial(match.group(1))
        if normalized_value == "too much power and influence":
            return f"the respondent believes {subject} have too much power and influence"
        if normalized_value == "about the right amount":
            return f"the respondent believes {subject} have about the right amount of political influence"
        if normalized_value == "too little power and influence":
            return f"the respondent believes {subject} have too little power and influence"
        return f"the respondent describes the political influence of {subject} as {value_lower}"

    match = re.fullmatch(r"preferred level of government regulation of\s+(.+)", label, flags=re.IGNORECASE)
    if match:
        subject = lowercase_initial(match.group(1))
        if normalized_value == "more than they are now":
            return f"the respondent prefers more government regulation of {subject} than there is now"
        if normalized_value == "less than they are now":
            return f"the respondent prefers less government regulation of {subject} than there is now"
        if normalized_value == "the same as they are now":
            return f"the respondent prefers the current level of government regulation of {subject}"
        return f"the respondent prefers {value_lower} government regulation of {subject}"

    match = re.fullmatch(
        r"general view on whether\s+(.+?)\s+should credit their sources",
        label,
        flags=re.IGNORECASE,
    )
    if match:
        subject = lowercase_initial(match.group(1))
        if normalized_value in {"not sure", "unsure"}:
            return f"the respondent is not sure whether {subject} should credit their sources"
        if normalized_value.startswith("do not need to credit the sources"):
            if "widely available online" in normalized_value:
                return (
                    f"the respondent believes {subject} need not credit reviewed sources "
                    "when the information is widely available online"
                )
            return f"the respondent believes {subject} need not credit the sources they review"
        if "should have to credit" in normalized_value:
            return f"the respondent believes {subject} should be required to credit their sources"
        return f'the respondent describes their view on source crediting by {subject} as "{value}"'

    match = re.fullmatch(
        r"view on whether\s+(.+?)\s+should credit sources when using\s+(.+)",
        label,
        flags=re.IGNORECASE,
    )
    if match:
        subject = lowercase_initial(match.group(1))
        material = lowercase_initial(match.group(2))
        if normalized_value in {"not sure", "unsure"}:
            return f"the respondent is not sure whether {subject} should credit sources when using {material}"
        if "should have to credit" in normalized_value:
            return f"the respondent believes {subject} should credit sources when using {material}"
        if normalized_value.startswith("do not need to credit"):
            return f"the respondent believes {subject} need not credit sources when using {material}"
        return f'the respondent describes source-credit requirements for {subject} using {material} as "{value}"'

    match = re.fullmatch(r"(?:general\s+)?view on whether\s+(.+)", label, flags=re.IGNORECASE)
    if match and normalize_match_text(value) in {"not sure", "unsure"}:
        return f"the respondent is not sure whether {lowercase_initial(match.group(1))}"

    match = re.fullmatch(r"perceived likelihood that\s+(.+)", label, flags=re.IGNORECASE)
    if match:
        return f"the respondent judges it {value_lower} that {lowercase_initial(match.group(1))}"

    match = re.fullmatch(r"assessment of\s+(.+?)\s+relative to\s+(.+)", label, flags=re.IGNORECASE)
    if match:
        rating = re.sub(r"^(?:the\s+)?u\.s\.\s+is\s+", "", value, flags=re.IGNORECASE)
        return (
            f"the respondent rates {lowercase_initial(match.group(1))} as {lowercase_initial(rating)} "
            f"relative to {lowercase_initial(match.group(2))}"
        )

    if normalized_label == "party leaning":
        return f"the respondent leans {value} politically"

    if normalized_label == "ideology":
        return f"the respondent identifies as politically {value_lower}"

    if normalize_match_text(label) == "age":
        return f"the respondent reports an age of {value}"

    return f'the respondent reports {lowercase_initial(label)} as "{value}"'


def build_lookup(data: dict) -> tuple[dict, dict]:
    """Match whole canonical facts to unique, existing perception pairs."""
    candidates: dict[str, set[tuple[str, str]]] = defaultdict(set)
    all_pairs: dict[str, set[tuple[str, str]]] = defaultdict(set)
    ambiguous: set[str] = set()
    appearances: list[tuple[str, tuple[tuple[str, str], ...], bool]] = []

    for dataset in data["datasets"]:
        for profile in dataset["profiles"]:
            for record in profile["records"]:
                by_fact: dict[str, list[tuple[str, str]]] = defaultdict(list)
                for perception in record["perceptions"]:
                    question, response = perception["question"], perception["response"]
                    if not isinstance(question, str) or not isinstance(response, str):
                        raise ValueError("Perception question and response must be strings")
                    pair = (question, response)
                    fact = prompt_fact_to_clause(PromptFact(question, response))
                    by_fact[fact].append(pair)
                    all_pairs[fact].add(pair)

                for expert in record["experts"].values():
                    for cue in expert.get("cues", []):
                        fact = cue["fact"]
                        if not isinstance(fact, str):
                            raise ValueError("Evidence fact must be a string")
                        pairs = tuple(by_fact.get(fact, []))
                        appearances.append((fact, pairs, cue.get("retained") is True))
                        if len(pairs) > 1:
                            ambiguous.add(fact)
                        elif len(pairs) == 1:
                            candidates[fact].update(pairs)

    # A shared lookup may never choose between conflicting question/response pairs.
    entries = []
    for fact, pairs in sorted(candidates.items()):
        if len(pairs) == 1 and len(all_pairs[fact]) == 1 and fact not in ambiguous:
            question, response = next(iter(pairs))
            entries.append({"fact": fact, "question": question, "response": response})
    published = {entry["fact"]: (entry["question"], entry["response"]) for entry in entries}
    matched = [fact in published and pairs == (published[fact],)
               for fact, pairs, _ in appearances]
    summary = {
        "entries": len(entries),
        "cueAppearances": len(appearances),
        "matchedCueAppearances": sum(matched),
        "retainedCueAppearances": sum(retained for _, _, retained in appearances),
        "matchedRetainedCueAppearances": sum(
            is_match and retained
            for is_match, (_, _, retained) in zip(matched, appearances)
        ),
        "ambiguousFacts": len(ambiguous),
        "conflictingFacts": sum(len(all_pairs[fact]) > 1 for fact in candidates),
    }
    return {"version": 1, "entries": entries}, summary


def main() -> None:
    repo = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=repo / "assets" / "method-demo.json")
    parser.add_argument("--output", type=Path, default=repo / "assets" / "method-evidence-display.json")
    parser.add_argument("--check", action="store_true", help="Verify the saved lookup without writing")
    args = parser.parse_args()

    if args.input.resolve() == args.output.resolve():
        parser.error("The lookup output must differ from the input data")
    lookup, summary = build_lookup(json.loads(args.input.read_text(encoding="utf-8")))
    expected = (json.dumps(lookup, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    if args.check:
        if not args.output.is_file() or args.output.read_bytes() != expected:
            parser.exit(1, "Method evidence display lookup is missing or stale; rebuild it.\n")
        action = "Verified"
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_bytes(expected)
        action = "Wrote"
    print(f"{action} Method evidence display lookup: "
          f"version {lookup['version']}, {len(expected):,} bytes, "
          + json.dumps(summary, sort_keys=True))


if __name__ == "__main__":
    main()
