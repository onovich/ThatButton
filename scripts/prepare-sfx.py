"""Rebuild the licensed SFX set from Kenney's CC0 source archives.

Requires Python 3 and ffmpeg. Source archives are cached under ignored output/.
"""

from __future__ import annotations

import array
import hashlib
import json
import math
import subprocess
import urllib.request
import wave
import zipfile
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "output" / "sfx-sources"
DEST = ROOT / "src" / "audio" / "sfx"
MANIFEST = ROOT / "docs" / "audio" / "manifest.json"
PACKS = {
    "interface": {
        "page": "https://kenney.nl/assets/interface-sounds",
        "archive": "https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip",
    },
    "digital": {
        "page": "https://kenney.nl/assets/digital-audio",
        "archive": "https://kenney.nl/media/pages/assets/digital-audio/216eac4753-1677590265/kenney_digital-audio.zip",
    },
}

# cue ID, Chinese use, source pack, source filename, runtime gain, cooldown, priority.
CUES = [
    ("ui_open", "打开帮助或设置", "interface", "open_001.ogg", .27, 90, 1),
    ("ui_back", "返回首页", "interface", "back_002.ogg", .26, 90, 1),
    ("ui_toggle", "设置开关", "interface", "toggle_004.ogg", .23, 90, 1),
    ("ui_confirm", "继续或重试", "interface", "confirmation_001.ogg", .28, 160, 1),
    ("run_start", "开始或重开一局", "digital", "powerUp5.ogg", .38, 250, 3),
    ("round_enter", "下一关棋盘入场", "interface", "open_002.ogg", .29, 200, 2),
    ("typing_tick", "规则文字逐字出现", "interface", "tick_001.ogg", .10, 85, 1),
    ("safe_press", "安全按钮落下", "interface", "pluck_001.ogg", .32, 65, 1),
    ("chain_ready", "第一枚安全按钮，连击待续", "interface", "select_003.ogg", .27, 90, 2),
    ("combo_2", "二连击", "interface", "maximize_003.ogg", .31, 120, 2),
    ("combo_high", "三连击及以上", "interface", "maximize_004.ogg", .32, 140, 2),
    ("combo_cap", "连击达到上限", "digital", "powerUp7.ogg", .34, 350, 3),
    ("wrong_press", "误按但仍可继续", "interface", "error_004.ogg", .38, 180, 3),
    ("time_warning", "本关倒计时首次低于五秒", "interface", "tick_004.ogg", .18, 900, 2),
    ("round_clear", "清空安全按钮，敌人受击", "interface", "confirmation_003.ogg", .37, 200, 3),
    ("enemy_defeated", "击败当前敌人", "digital", "powerUp9.ogg", .43, 350, 4),
    ("upgrade_offer", "升级选项出现", "interface", "open_004.ogg", .25, 250, 2),
    ("upgrade_select", "选择升级", "interface", "confirmation_004.ogg", .43, 250, 4),
    ("run_failure", "生命耗尽或时间归零", "interface", "error_005.ogg", .43, 400, 4),
]
GAIN_FACTORS = {
    "ui_open": 1.5,
    "ui_toggle": 1.5,
    "round_enter": 1.5,
    "combo_2": 2.0,
    "time_warning": 1.5,
    "upgrade_offer": 1.2,
}


def read_source(pack: str, filename: str) -> bytes:
    archive = CACHE / Path(PACKS[pack]["archive"]).name
    if not archive.exists():
        urllib.request.urlretrieve(PACKS[pack]["archive"], archive)
    with zipfile.ZipFile(archive) as contents:
        matches = [name for name in contents.namelist() if name.endswith("/Audio/" + filename) or name == "Audio/" + filename]
        if len(matches) != 1:
            raise RuntimeError(f"Expected one source for {pack}/{filename}, got {matches}")
        return contents.read(matches[0])


def audio_stats(path: Path) -> tuple[int, float, float]:
    with wave.open(str(path), "rb") as wav:
        assert wav.getnchannels() == 1 and wav.getframerate() == 44100 and wav.getsampwidth() == 2
        data = wav.readframes(wav.getnframes())
        duration_ms = round(wav.getnframes() / wav.getframerate() * 1000)
    samples = array.array("h")
    samples.frombytes(data)
    peak = max(abs(sample) for sample in samples) / 32768
    rms = math.sqrt(sum(sample * sample for sample in samples) / len(samples)) / 32768
    return duration_ms, round(20 * math.log10(max(peak, 1e-9)), 1), round(20 * math.log10(max(rms, 1e-9)), 1)


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    DEST.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    entries = []
    for cue_id, intended_use, pack, filename, volume, cooldown_ms, priority in CUES:
        source = CACHE / pack / "Audio" / filename
        source.parent.mkdir(parents=True, exist_ok=True)
        if not source.exists():
            source.write_bytes(read_source(pack, filename))
        duration = float(subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(source),
        ], text=True).strip())
        gain = .65 * GAIN_FACTORS.get(cue_id, 1.0)
        output = DEST / f"{cue_id}.wav"
        decoded = subprocess.check_output([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(source),
            "-af", f"volume={gain:.5f}", "-ar", "44100", "-ac", "1",
            "-f", "s16le", "-c:a", "pcm_s16le", "-",
        ])
        samples = array.array("h")
        samples.frombytes(decoded)
        threshold = 32768 * 10 ** (-45 / 20)
        audible = [index for index, sample in enumerate(samples) if abs(sample) >= threshold]
        if not audible:
            raise RuntimeError(f"Source has no audible samples: {source}")
        start = max(0, audible[0] - round(.005 * 44100))
        end = min(len(samples), audible[-1] + round(.020 * 44100))
        trimmed_start_ms = round(start / 44100 * 1000)
        trimmed_end_ms = round((len(samples) - end) / 44100 * 1000)
        samples = samples[start:end]
        fade_in = min(len(samples), round(.001 * 44100))
        fade_out = min(len(samples), round(.012 * 44100))
        for index in range(fade_in):
            samples[index] = round(samples[index] * index / fade_in)
        for index in range(fade_out):
            samples[-index - 1] = round(samples[-index - 1] * index / fade_out)
        with wave.open(str(output), "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(44100)
            wav.writeframes(samples.tobytes())
        duration_ms, peak_dbfs, rms_dbfs = audio_stats(output)
        entries.append({
            "cueId": cue_id,
            "filename": output.name,
            "durationMs": duration_ms,
            "sourceDurationMs": round(duration * 1000),
            "trimmedStartMs": trimmed_start_ms,
            "trimmedEndMs": trimmed_end_ms,
            "generator/source": "Kenney " + ("Interface Sounds" if pack == "interface" else "Digital Audio"),
            "sourcePage": PACKS[pack]["page"],
            "sourceArchive": PACKS[pack]["archive"],
            "sourceFile": f"Audio/{filename}",
            "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
            "license": "Creative Commons CC0 1.0",
            "creator": "Kenney",
            "attributionRequired": False,
            "accessedOn": date.today().isoformat(),
            "intendedUse": intended_use,
            "designerVolumeFactor": volume,
            "cooldownMs": cooldown_ms,
            "priority": priority,
            "loop": False,
            "secrecyRisk": "none: plays only after a visible UI action or public event",
            "peakDbfs": peak_dbfs,
            "rmsDbfs": rms_dbfs,
            "processing": f"mono 44100 Hz PCM WAV; {20 * math.log10(gain):+.2f} dB source gain; trim -45 dBFS edges with 5 ms lead and 20 ms tail; 1 ms fade in and 12 ms fade out",
        })
    MANIFEST.write_text(json.dumps({
        "schema": "thatbutton.sfxManifest.v1",
        "version": "2026-09-30",
        "files": entries,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared {len(entries)} cues in {DEST}")


if __name__ == "__main__":
    main()
