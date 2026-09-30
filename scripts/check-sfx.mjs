import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SFX_CUES, createSfxGate } from '../src/audio/cues.js';
import { createAudioFeedback } from '../src/ui/audio.js';
import { createWechatAudio } from '../ports/wechat/src/audio.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'docs/audio/manifest.json'), 'utf8'));
assert.equal(manifest.files.length, Object.keys(SFX_CUES).length);
for (const [name, cue] of Object.entries(SFX_CUES)) {
  const entry = manifest.files.find((item) => item.cueId === name);
  assert.ok(entry, `Missing source record for ${name}`);
  assert.equal(entry.filename, cue.file);
  assert.equal(entry.designerVolumeFactor, cue.volume);
  const wav = readFileSync(resolve(root, 'src/audio/sfx', cue.file));
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.readUInt16LE(22), 1, 'Mono is required.');
  assert.equal(wav.readUInt32LE(24), 44100);
  let chunkOffset = 12;
  while (chunkOffset + 8 <= wav.length && wav.toString('ascii', chunkOffset, chunkOffset + 4) !== 'data') {
    chunkOffset += 8 + wav.readUInt32LE(chunkOffset + 4);
    if (chunkOffset % 2) chunkOffset++;
  }
  assert.ok(chunkOffset + 8 <= wav.length, `Missing PCM data for ${name}`);
  const durationMs = wav.readUInt32LE(chunkOffset + 4) / 2 / 44100 * 1000;
  assert.ok(Math.abs(durationMs - entry.durationMs) <= 2, `Duration mismatch for ${name}`);
  assert.ok(Math.abs(durationMs - cue.durationMs) <= 3, `Registry duration mismatch for ${name}`);
  assert.ok(entry.peakDbfs <= -3, `Clip ${name} peaks too high.`);
}

let now = 1000;
const gate = createSfxGate(() => now);
assert.equal(gate.allow('run_start').allowed, true);
assert.equal(gate.allow('run_start').allowed, false, 'Duplicate run start must be throttled.');
assert.equal(gate.allow('ui_back').allowed, true);
assert.equal(gate.allow('ui_open').allowed, false, 'Third equal-priority sound must be dropped.');
assert.deepEqual(gate.allow('run_failure').victims, ['ui_back'], 'Result sound should replace a UI sound.');
now += 1000;
assert.equal(gate.allow('ui_open').allowed, true);
gate.clear();
assert.equal(gate.allow('safe_press').allowed, true);
assert.equal(gate.allow('chain_ready').allowed, true);
now += 110;
assert.deepEqual(gate.allow('safe_press').victims, [], 'Finished tactile click leaves the active accent.');
assert.deepEqual(gate.allow('combo_2').victims, ['chain_ready'], 'New combo should replace the old accent.');

const webPlayers = [];
class FakeAudio {
  constructor(url) { this.url = url; this.plays = 0; this.pauses = 0; webPlayers.push(this); }
  play() { this.plays++; return Promise.resolve(); }
  pause() { this.pauses++; }
}
const web = createAudioFeedback(FakeAudio, { now: () => now });
web.playRunStart();
assert.equal(webPlayers.length, 1);
assert.ok(webPlayers[0].url.endsWith('/run_start.wav'));
assert.equal(webPlayers[0].volume, SFX_CUES.run_start.volume);
web.setEnabled(false);
web.playError();
assert.equal(webPlayers.length, 1, 'Muted Web audio must not create a player.');
web.setEnabled(true);
now += 1000;
web.playError();
assert.ok(webPlayers.some((player) => player.url.endsWith('/wrong_press.wav')));

const wxContexts = [];
let vibrationCount = 0;
const wxAudio = createWechatAudio({
  createInnerAudioContext() {
    const context = {
      plays: 0, stops: 0, destroyed: false,
      play() { this.plays++; }, stop() { this.stops++; }, destroy() { this.destroyed = true; }
    };
    wxContexts.push(context);
    return context;
  },
  vibrateShort() { vibrationCount++; }
}, () => now);
wxAudio.preload();
assert.ok(wxContexts.length <= 10, 'Preload must remain small.');
wxAudio.playRunStart();
assert.ok(wxContexts.some((context) => context.src === 'audio/run_start.wav' && context.plays === 1));
wxAudio.setPreferences({ sound: false, vibration: false });
wxAudio.playError();
assert.equal(vibrationCount, 0);
assert.equal(wxContexts.reduce((sum, context) => sum + context.plays, 0), 1);
wxAudio.setPreferences({ sound: true, vibration: false });
now += 1000;
wxAudio.playError();
assert.ok(wxContexts.some((context) => context.src === 'audio/wrong_press.wav' && context.plays === 1));
assert.equal(vibrationCount, 0);
wxAudio.destroy();
assert.ok(wxContexts.every((context) => context.destroyed));

console.log(`SFX contract checks passed (${manifest.files.length} licensed cues).`);
