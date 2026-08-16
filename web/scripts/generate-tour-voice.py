#!/usr/bin/env python3
"""Generate neural TTS clips for the product tour (Microsoft neural voice)."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "src" / "lib" / "tourNarration.json"
OUT = ROOT / "public" / "tour" / "voice"
VOICE = "en-US-AndrewMultilingualNeural"
RATE = "-10%"


async def synthesize(step_id: str, text: str) -> None:
    dest = OUT / f"{step_id}.mp3"
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    await communicate.save(str(dest))
    print(f"wrote {dest.relative_to(ROOT)} ({dest.stat().st_size} bytes)")


async def main() -> None:
    data = json.loads(SCRIPTS.read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    for step_id, text in data.items():
        await synthesize(step_id, text)


if __name__ == "__main__":
    asyncio.run(main())
