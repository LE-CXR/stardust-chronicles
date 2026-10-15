#!/usr/bin/env python3
"""Check the generated element archive before shipping."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "data" / "elements.json").read_text(encoding="utf-8"))
elements = data["elements"]
errors = []

if len(elements) != 118:
    errors.append(f"count {len(elements)}")

seen = set()
positions = set()
for el in elements:
    z = el["z"]
    if z in seen:
        errors.append(f"duplicate {z}")
    seen.add(z)
    if not el["symbol"] or not el["nameZh"] or not el["nameEn"]:
        errors.append(f"name {z}")
    if sum(el["shells"]) != z:
        errors.append(f"shells {z}")
    if el["weight"] is None and z in {1, 6, 8, 26, 79}:
        errors.append(f"missing weight {z}")
    if el["weight"] == "—" or el["weight"] == "":
        errors.append(f"blank weight {z}")
    key = (el["row"], el["col"])
    if key in positions:
        errors.append(f"position {key}")
    positions.add(key)
    for line in el["lines"]:
        if not 380 <= line["nm"] <= 780:
            errors.append(f"line {el['symbol']} {line['nm']}")
    if el["flame"] and el["z"] not in {3, 5, 11, 19, 20, 29, 37, 38, 49, 55, 56, 81}:
        errors.append(f"unexpected flame {el['symbol']}")
    blob = json.dumps(el, ensure_ascii=False)
    for bad in ("lorem", "TODO", "某某", "待补充"):
        if bad in blob:
            errors.append(f"placeholder {z} {bad}")

if seen != set(range(1, 119)):
    errors.append("missing Z")

story_text = (ROOT / "data" / "story.js").read_text(encoding="utf-8")
start = story_text.index("{")
story = json.loads(story_text[start:].rstrip().rstrip(";"))
for chapter in story["chapters"]:
    for z in chapter["elements"]:
        if z not in seen:
            errors.append(f"story z {z}")
    if len(chapter["body"]) < 20:
        errors.append("short chapter")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"ok {len(elements)} elements, {len(story['chapters'])} chapters, {len(positions)} positions")
