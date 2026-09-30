import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWechatMusic, MUSIC_TRACKS } from '../ports/wechat/src/music.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'docs/audio/bgm-manifest.json')));
const reference = JSON.parse(readFileSync(resolve(root, 'docs/audio/bgm-reference-manifest.json')));
assert.equal(manifest.schema, 'thatbutton.cc0BgmManifest.v1');
assert.equal(manifest.files.length, 2);
assert.equal(reference.files.length, 2);
for (const mode of ['home', 'game']) {
  const track = manifest.files.find((item) => item.cueId === `music_${mode}`);
  const referenceTrack = reference.files.find((item) => item.cueId === `music_${mode}`);
  const file = readFileSync(resolve(root, 'ports/wechat/assets/music', track.filename));
  assert.equal(track.creator, 'Fupi');
  assert.equal(track.license, 'Creative Commons CC0 1.0');
  assert.equal(track.sourcePage, 'https://opengameart.org/content/empacotatron');
  assert.equal(track.sourceSha256, referenceTrack.sourceSha256);
  assert.equal(createHash('sha256').update(file).digest('hex'), track.sha256);
  assert.equal(file.toString('ascii', 4, 8), 'ftyp');
  assert.equal(statSync(resolve(root, 'docs/audio/bgm-reference', referenceTrack.filename)).size,
    referenceTrack.bytes);
  assert.equal(MUSIC_TRACKS[mode].loopEndMs, track.loopEndMs);
  assert.ok(Math.abs(track.encodedDurationMs - track.loopEndMs - track.crossfadeMs) < 100);
  assert.ok(track.peakDbfs <= -3 && track.meanDbfs < -16 && track.meanDbfs > -24);
}

let time = 0;
let nextId = 0;
const jobs = new Map();
const made = [];
function setJob(callback, delay, interval = 0) {
  const id = ++nextId;
  jobs.set(id, { callback, due: time + delay, interval });
  return id;
}
const timers = {
  now: () => time,
  setTimeout: (callback, delay) => setJob(callback, delay),
  clearTimeout: (id) => jobs.delete(id),
  setInterval: (callback, delay) => setJob(callback, delay, delay),
  clearInterval: (id) => jobs.delete(id)
};
function advance(ms) {
  const end = time + ms;
  while (true) {
    const next = [...jobs].sort((a, b) => a[1].due - b[1].due)[0];
    if (!next || next[1].due > end) break;
    time = next[1].due;
    if (next[1].interval) next[1].due += next[1].interval;
    else jobs.delete(next[0]);
    next[1].callback();
  }
  time = end;
}
const wxApi = { createInnerAudioContext() {
  let onPlay = null;
  let onEnded = null;
  const context = {
    src: '', volume: 0, playing: false, destroyed: false, positionMs: 0, startedAt: 0,
    get currentTime() { return (this.playing ? this.positionMs + time - this.startedAt : this.positionMs) / 1000; },
    onPlay(callback) { onPlay = callback; },
    onEnded(callback) { onEnded = callback; },
    play() { this.playing = true; this.startedAt = time; onPlay?.(); },
    pause() { this.positionMs = this.currentTime * 1000; this.playing = false; },
    stop() { this.positionMs = 0; this.playing = false; },
    destroy() { this.destroyed = true; },
    end() { this.playing = false; onEnded?.(); }
  };
  made.push(context);
  return context;
} };
const music = createWechatMusic(wxApi, timers);
music.play('home');
assert.equal(made.length, 2);
assert.equal(made[0].src, MUSIC_TRACKS.home.src);
assert.equal(made[0].volume, .1);
assert.equal(made[0].playing, true);
advance(MUSIC_TRACKS.home.loopEndMs);
assert.equal(made[1].playing, true, 'Next loop must start before the outgoing one ends.');
assert.equal(made[0].playing, true);
advance(350);
assert.equal(made[0].playing, false);
assert.equal(made[1].playing, true);
music.duck(420);
assert.ok(made[1].volume < .1);
advance(425);
assert.equal(made[1].volume, .1);
music.setPreferences({ music: true, musicVolume: 0 });
assert.equal(made[1].playing, false);
music.setPreferences({ music: true, musicVolume: 3 });
assert.equal(made[1].playing, true);
assert.ok(Math.abs(made[1].volume - .15) < 1e-9);
music.play('game');
assert.equal(made.length, 4);
assert.equal(made[3].src, MUSIC_TRACKS.game.src);
assert.equal(made[2].playing, true);
assert.ok(made[0].destroyed && made[1].destroyed);
advance(MUSIC_TRACKS.game.loopEndMs);
assert.equal(made[3].playing, true, 'Game theme must restart at its bar boundary.');
advance(350);
assert.equal(made[2].playing, false);
music.pause();
assert.equal(made[3].playing, false);
music.resume();
assert.equal(made[3].playing, true);
music.setPreferences({ music: false });
assert.equal(made[3].playing, false);
music.destroy();
assert.equal(jobs.size, 0);
console.log('CC0 BGM provenance, assets and WeChat music lifecycle checks passed.');
