import { build } from 'esbuild';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const portRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(portRoot, 'build');
if (relative(portRoot, output) !== 'build') {
  throw new Error('Unsafe build output path.');
}
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, 'audio'), { recursive: true });

await build({
  entryPoints: [resolve(portRoot, 'src/game.js')],
  outfile: resolve(output, 'game.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2018',
  logLevel: 'info'
});

function wav(notes, durationSeconds = 0.32) {
  const rate = 22050;
  const count = Math.round(rate * durationSeconds);
  const dataSize = count * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let index = 0; index < count; index++) {
    const t = index / rate;
    const note = notes[Math.min(notes.length - 1, Math.floor(t / durationSeconds * notes.length))];
    const envelope = Math.min(1, t / 0.008) * Math.max(0, 1 - t / durationSeconds);
    const sample = Math.sin(2 * Math.PI * note * t) * envelope * 0.28;
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + index * 2);
  }
  return buffer;
}

const sounds = {
  click: [600],
  chain: [760, 920],
  combo: [780, 980, 1180],
  error: [180, 90],
  explosion: [120, 75, 45],
  levelup: [400, 600, 800],
  beep: [840]
};
for (const [name, notes] of Object.entries(sounds)) {
  await writeFile(resolve(output, 'audio', `${name}.wav`), wav(notes));
}

await writeFile(resolve(output, 'game.json'), JSON.stringify({
  deviceOrientation: 'portrait',
  showStatusBar: false
}, null, 2) + '\n');
await writeFile(resolve(output, 'project.config.json'), JSON.stringify({
  appid: process.env.WECHAT_GAME_APPID || 'touristappid',
  compileType: 'game',
  projectname: 'ThatButton',
  setting: { es6: false, minified: false, urlCheck: true }
}, null, 2) + '\n');
console.log(`WeChat Mini Game build: ${output}`);
