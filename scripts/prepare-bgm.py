"""Build the selected CC0 score for audition and the WeChat game.

Requires Python 3 and ffmpeg/ffprobe. Downloads are cached under ignored output/.
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import urllib.request
import wave
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "output" / "bgm-sources"
REFERENCE_DEST = ROOT / "docs" / "audio" / "bgm-reference"
REFERENCE_MANIFEST = ROOT / "docs" / "audio" / "bgm-reference-manifest.json"
SHIP_DEST = ROOT / "ports" / "wechat" / "assets" / "music"
SHIP_MANIFEST = ROOT / "docs" / "audio" / "bgm-manifest.json"
SR = 44100
CROSSFADE_MS = 350
SOURCE_PAGE = "https://opengameart.org/content/empacotatron"
AUTHOR = "Fupi"
TRACKS = [
    ("home", "empacotatron_menu.ogg", 2.5, "首页、帮助、设置和结算界面", 11707),
    ("game", "empacotatron_loop.ogg", .7, "局内限时挑战与升级选择", 80000),
]


def probe(path: Path) -> dict:
    return json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration,bit_rate",
        "-of", "json", str(path),
    ], text=True))["format"]


def volume_stats(path: Path) -> tuple[float, float]:
    result = subprocess.run([
        "ffmpeg", "-hide_banner", "-i", str(path), "-af", "volumedetect",
        "-f", "null", "NUL",
    ], capture_output=True, text=True, check=False)
    mean = re.search(r"mean_volume: ([-\d.]+) dB", result.stderr)
    peak = re.search(r"max_volume: ([-\d.]+) dB", result.stderr)
    if not mean or not peak:
        raise RuntimeError(f"Could not measure {path}: {result.stderr[-1000:]}")
    return float(mean.group(1)), float(peak.group(1))


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    REFERENCE_DEST.mkdir(parents=True, exist_ok=True)
    SHIP_DEST.mkdir(parents=True, exist_ok=True)
    reference_entries = []
    ship_entries = []
    for cue_id, filename, gain, intended_use, loop_end_ms in TRACKS:
        source = CACHE / filename
        source_url = f"https://opengameart.org/sites/default/files/{filename}"
        if not source.exists():
            urllib.request.urlretrieve(source_url, source)
        output = REFERENCE_DEST / f"{cue_id}.m4a"
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
            "-af", f"volume={gain}", "-ar", "44100", "-ac", "1",
            "-c:a", "aac", "-profile:a", "aac_low", "-b:a", "80k",
            "-movflags", "+faststart", str(output),
        ], check=True)
        source_data = probe(source)
        output_data = probe(output)
        mean, peak = volume_stats(output)
        reference_entry = {
            "cueId": f"music_{cue_id}",
            "filename": output.name,
            "sourcePage": SOURCE_PAGE,
            "sourceUrl": source_url,
            "sourceFile": filename,
            "creator": AUTHOR,
            "license": "Creative Commons CC0 1.0",
            "attributionRequired": False,
            "accessedOn": date.today().isoformat(),
            "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
            "intendedUse": intended_use,
            "sourceDurationMs": round(float(source_data["duration"]) * 1000),
            "durationMs": round(float(output_data["duration"]) * 1000),
            "loopStartMs": 0,
            "loopEndMs": loop_end_ms,
            "crossfadeMs": CROSSFADE_MS,
            "codec": "AAC-LC / M4A, mono 44.1 kHz, target 80 kb/s",
            "gainFactor": gain,
            "meanDbfs": mean,
            "peakDbfs": peak,
            "bytes": output.stat().st_size,
            "secrecyRisk": "none: no gameplay hints or vocal content",
        }
        reference_entries.append(reference_entry)

        # Preserve the reviewed recording and gain. A copy of its first 350 ms
        # after the true loop point gives the outgoing decoder time to fade while
        # the next instance starts on the original beat, without shortening it.
        raw = subprocess.check_output([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(source),
            # Raw PCM downmix is 3 dB lower than the direct AAC encode used for
            # the audition copy, so restore that gain to match what was heard.
            "-af", f"volume={gain * 2 ** .5}", "-ar", str(SR), "-ac", "1",
            "-f", "s16le", "pipe:1",
        ])
        loop_samples = len(raw) // 2
        if abs(loop_samples / SR * 1000 - loop_end_ms) > 2:
            raise RuntimeError(f"Unexpected source loop duration: {filename}")
        tail = raw[:round(CROSSFADE_MS * SR / 1000) * 2]
        master = CACHE / f"{cue_id}-with-loop-tail.wav"
        with wave.open(str(master), "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(SR)
            wav.writeframes(raw + tail)
        shipped = SHIP_DEST / f"{cue_id}.m4a"
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(master),
            "-ar", str(SR), "-ac", "1", "-c:a", "aac", "-profile:a", "aac_low",
            "-b:a", "72k", "-movflags", "+faststart", str(shipped),
        ], check=True)
        ship_mean, ship_peak = volume_stats(shipped)
        ship_entries.append({
            **{key: value for key, value in reference_entry.items()
               if key not in ("sha256", "durationMs", "meanDbfs", "peakDbfs", "bytes", "gainFactor")},
            "selection": "user-selected CC0 score",
            "codec": "AAC-LC / M4A, mono 44.1 kHz, target 72 kb/s",
            "referenceGainFactor": gain,
            "pcmRenderGainFactor": round(gain * 2 ** .5, 6),
            "pcmLoopSamples": loop_samples,
            "loopEndMs": round(loop_samples / SR * 1000),
            "encodedDurationMs": round(float(probe(shipped)["duration"]) * 1000),
            "sha256": hashlib.sha256(shipped.read_bytes()).hexdigest(),
            "meanDbfs": ship_mean,
            "peakDbfs": ship_peak,
            "bytes": shipped.stat().st_size,
        })
    REFERENCE_MANIFEST.write_text(json.dumps({
        "schema": "thatbutton.bgmManifest.v1",
        "version": "2026-09-30",
        "files": reference_entries,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    SHIP_MANIFEST.write_text(json.dumps({
        "schema": "thatbutton.cc0BgmManifest.v1",
        "version": date.today().isoformat(),
        "loopMethod": "At the original loop point, start the next instance and crossfade over an appended 350 ms copy of the opening.",
        "files": ship_entries,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared {len(ship_entries)} CC0 music tracks in {SHIP_DEST}")


if __name__ == "__main__":
    main()
