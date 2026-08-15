#!/usr/bin/env python3
"""Build compact, score-derived piano-roll previews for the static demo."""

from __future__ import annotations

import json
from pathlib import Path
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "muno-lm" / "artifacts" / "scores"
OUTPUT = ROOT / "public" / "data" / "piano-roll.json"

PIECES = {
    "01": "Bach/Fugue/bwv_875/cleaned_and_reorganized.xml",
    "02": "Bach/Prelude/bwv_848/cleaned_and_reorganized.xml",
    "03": "Balakirev/Islamey/cleaned_and_reorganized.xml",
    "04": "Beethoven/Piano_Sonatas/23-1/cleaned_and_reorganized.xml",
    "05": "Beethoven/Piano_Sonatas/21-1/cleaned_and_reorganized.xml",
    "06": "Chopin/Ballades/1/cleaned_and_reorganized.xml",
    "07": "Chopin/Etudes_op_10/4/cleaned_and_reorganized.xml",
    "08": "Debussy/Images_Book_1/1_Reflets_dans_lEau/cleaned_and_reorganized.xml",
    "09": "Glinka/The_Lark/cleaned_and_reorganized.xml",
    "10": "Haydn/Keyboard_Sonatas/48-2/cleaned_and_reorganized.xml",
    "11": "Liszt/Ballade_2/cleaned_and_reorganized.xml",
    "12": "Mozart/Piano_Sonatas/12-1/cleaned_and_reorganized.xml",
    "13": "Mozart/Piano_Sonatas/12-3/cleaned_and_reorganized.xml",
    "14": "Rachmaninoff/Preludes_op_23/4/cleaned_and_reorganized.xml",
    "15": "Schubert/Moment_musical_no_3/cleaned_and_reorganized.xml",
    "16": "Schumann/Arabeske/cleaned_and_reorganized.xml",
    "17": "Scriabin/Etudes_op_8/11/cleaned_and_reorganized.xml",
    "18": "Scriabin/Sonatas/5/cleaned_and_reorganized.xml",
}

PITCH_CLASS = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def text(element: ET.Element, path: str, default: str = "0") -> str:
    value = element.findtext(path)
    return value if value is not None else default


def parse_roll(path: Path) -> list[dict[str, float | int]]:
    root = ET.parse(path).getroot()
    notes: list[dict[str, float | int]] = []
    for part_index, part in enumerate(root.findall("part")):
        cursor = 0.0
        divisions = 1.0
        previous_start = 0.0
        for measure in part.findall("measure"):
            for child in measure:
                if child.tag == "attributes":
                    divisions = float(text(child, "divisions", str(divisions))) or divisions
                elif child.tag in {"backup", "forward"}:
                    delta = float(text(child, "duration")) / divisions
                    cursor += delta if child.tag == "forward" else -delta
                elif child.tag == "note":
                    duration = float(text(child, "duration")) / divisions
                    start = previous_start if child.find("chord") is not None else cursor
                    previous_start = start
                    pitch = child.find("pitch")
                    if pitch is not None and start < 96:
                        step = text(pitch, "step", "C")
                        octave = int(text(pitch, "octave", "4"))
                        alter = int(float(text(pitch, "alter", "0")))
                        midi = 12 * (octave + 1) + PITCH_CLASS[step] + alter
                        notes.append({"t": round(start, 3), "d": round(max(duration, 0.08), 3), "p": midi, "v": part_index})
                    if child.find("chord") is None:
                        cursor += duration
        if len(notes) > 1600:
            break
    return notes[:1600]


def main() -> None:
    payload = {
        piece: {
            "source": str(relative),
            "notes": parse_roll(SOURCE / relative),
        }
        for piece, relative in PIECES.items()
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
