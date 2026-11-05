#!/usr/bin/env python3
"""Export the manuscript's vector method figure with the website palette.

Usage: python3 scripts/render-method-figure.py /path/to/SocialReasoner_evidence_flow_v72.pdf
Requires PyMuPDF. Geometry, glyphs, labels and numerical content stay unchanged.
"""

import argparse
from pathlib import Path
import re
import xml.etree.ElementTree as ET

import pymupdf


PALETTE = {
    "#ffffff": "#0b1423",  # Canvas and inner card surfaces.
    "#f7f7f7": "#101b2b",
    "#222222": "#e5eef9",
    "#6a6b67": "#a0b0c4",
    "#5a5b57": "#a0b0c4",
    "#c1c6cd": "#53667e",
    "#465c76": "#a8c9e3",
    # Additive expert: cyan.
    "#e4edf5": "#11283b",
    "#c9dbe7": "#22485e",
    "#576f8a": "#7ad8ff",
    "#4d6279": "#a0e2ff",
    "#b4c8d6": "#5595b4",
    "#d8e6f0": "#26475c",
    "#f3f7fa": "#14283b",
    # Tree expert: violet.
    "#f9e8d4": "#211e38",
    "#f4d1ab": "#3c335b",
    "#ae734a": "#aa9bff",
    "#996541": "#c1b6ff",
    "#e7c09a": "#8173b8",
    # Neural expert: mint.
    "#f1f3ec": "#112c2d",
    "#d9e8cd": "#225048",
    "#5f784a": "#6fe0c6",
    "#546a41": "#9be7d4",
    "#c3d4b5": "#4e9b88",
    "#a2b692": "#57ac98",
    "#d6e5c9": "#376e60",
    "#bfd0b1": "#2d5e52",
    "#d7e6cb": "#3a7263",
    "#d1e1c5": "#326758",
    "#6d8559": "#79c9b0",
    "#d0e0c4": "#326657",
    "#c6d6b8": "#2e5c50",
    # Negative contributions keep their distinct warm direction cue.
    "#b06a5c": "#e4a48b",
    "#d6afad": "#b77770",
    "#c38f8d": "#c8867c",
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1]
                        / "assets/method-from-manuscript-dark.svg")
    args = parser.parse_args()
    with pymupdf.open(args.source) as document:
        if len(document) != 1 or document[0].get_images():
            raise ValueError("Expected the single-page, fully vector manuscript figure")
        # Outlined glyphs retain the original typography on every device.
        svg = document[0].get_svg_image(text_as_path=True)
    source_colors = set(re.findall(r"#[0-9a-fA-F]{6}", svg))
    unknown = {color for color in source_colors if color.lower() not in PALETTE}
    if unknown:
        raise ValueError(f"Unmapped source colors: {sorted(unknown)}")
    themed = re.sub(r"#[0-9a-fA-F]{6}", lambda m: PALETTE[m.group().lower()], svg)
    # Fill the previously transparent PDF page without altering its geometry.
    themed = themed.replace("</defs>", "</defs>\n<rect width=\"100%\" height=\"100%\" fill=\"#0b1423\"/>", 1)
    original, result = ET.fromstring(svg), ET.fromstring(themed)
    original_nodes = list(original.iter())
    result_nodes = [node for node in result.iter() if node.tag.rsplit("}", 1)[-1] != "rect"]
    assert len(original_nodes) == len(result_nodes)
    for before, after in zip(original_nodes, result_nodes):
        assert before.tag == after.tag
        for key in ("d", "transform", "href", "{http://www.w3.org/1999/xlink}href"):
            assert before.get(key) == after.get(key), f"Changed geometry: {key}"
    args.output.write_text(themed, encoding="utf-8")
    print(f"Exported {args.output.name}: {len(result_nodes):,} original vector elements preserved")


if __name__ == "__main__":
    main()
