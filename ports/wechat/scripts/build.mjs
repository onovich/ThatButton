import { build } from 'esbuild';
import { copyFile, mkdir, rm, writeFile, readdir, stat, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SFX_CUES } from '../../../src/audio/cues.js';

const portRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(portRoot, 'build');
if (relative(portRoot, output) !== 'build') {
  throw new Error('Unsafe build output path.');
}
try {
  await rm(output, { recursive: true, force: true });
} catch (error) {
  // WeChat DevTools can keep the build directory open on Windows. Generated
  // files below are overwritten, so a locked directory need not block builds.
  if (!['EBUSY', 'EPERM'].includes(error?.code)) throw error;
  console.warn(`WeChat build directory is in use; updating generated files in place (${error.code}).`);
}
await mkdir(resolve(output, 'audio'), { recursive: true });
await mkdir(resolve(output, 'audio', 'music'), { recursive: true });
await mkdir(resolve(output, 'art'), { recursive: true });
const obsoleteFrames = resolve(output, 'art', 'frames');
if (relative(output, obsoleteFrames).replaceAll('\\', '/') !== 'art/frames') {
  throw new Error('Unsafe generated frame cleanup path.');
}
try {
  await rm(obsoleteFrames, { recursive: true, force: true });
} catch (error) {
  if (!['EBUSY', 'EPERM'].includes(error?.code)) throw error;
  console.warn(`Paused character frames are still open in WeChat DevTools (${error.code}).`);
}
for (const name of [
  'running-pair.png', 'caring-pair.png', 'separated-pair.png',
  'title-home.png', 'title-result.png', 'title-upgrade-v22.png',
  'result-button-retry-v32.png', 'result-button-home-v32.png',
  'result-score-digits-v32.png', 'result-score-fen-v32.png',
  'result-crown-v32.png', 'result-burst-v32.png', 'result-burst-right-v32.png',
  'upgrade-bubble-v25.png', 'upgrade-status-v23.png', 'upgrade-heart-v23.png',
  'upgrade-card-chain-v23.png', 'upgrade-card-hp-v23.png',
  'upgrade-card-time-v23.png', 'upgrade-card-progress-v23.png',
  'upgrade-pair-v24.png', 'upgrade-background-v24.jpg',
  'upgrade-rays-v24.png',
  'sunny-stage.jpg', 'gameplay-landscape.jpg',
  'combo-wordmark-v30.png', 'max-wordmark-v30.png', 'ready-wordmark-v25.png',
  'hit-wordmark-v30.png', 'combo-digits-v29.png', 'text-atlas-v1.png'
]) {
  await copyFile(resolve(portRoot, 'assets/runtime', name), resolve(output, 'art', name));
}
try {
  await rm(resolve(output, 'art', 'combo-plaque-v16.png'), { force: true });
  await rm(resolve(output, 'art', 'combo-wordmark-v17.png'), { force: true });
  await rm(resolve(output, 'art', 'ready-wordmark-v21.png'), { force: true });
  await rm(resolve(output, 'art', 'max-wordmark-v26.png'), { force: true });
  for (const name of ['combo-wordmark-v24.png', 'max-wordmark-v28.png',
    'hit-wordmark-v25.png', 'combo-digits-v25.png']) {
    await rm(resolve(output, 'art', name), { force: true });
  }
  await rm(resolve(output, 'art', 'upgrade-bubble-v23.png'), { force: true });
} catch (error) {
  if (!['EBUSY', 'EPERM'].includes(error?.code)) throw error;
  console.warn(`Obsolete combo art is still open in WeChat DevTools (${error.code}).`);
}

// Stamp the tested source/assets, independent of dirty Git state or build time.
const sourceHash = createHash('sha256');
async function hashDirectory(path) {
  const entries = (await readdir(path, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  for (const entry of entries) {
    const file = resolve(path, entry.name);
    if (entry.isDirectory()) await hashDirectory(file);
    else { sourceHash.update(relative(portRoot, file).replaceAll('\\', '/')); sourceHash.update('\0'); sourceHash.update(await readFile(file)); }
  }
}
for (const path of ['src', 'assets/runtime', 'assets/music', '../../src']) await hashDirectory(resolve(portRoot, path));
sourceHash.update(await readFile(fileURLToPath(import.meta.url)));
const buildId = sourceHash.digest('hex').slice(0, 20);
await build({
  entryPoints: [resolve(portRoot, 'src/game.js')],
  outfile: resolve(output, 'game.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2018',
  // Preserve names and syntax for profiling; remove whitespace to fit the 4 MiB package.
  minifyWhitespace: true,
  define: { __WECHAT_BUILD_ID__: JSON.stringify(buildId) },
  logLevel: 'info'
});
await copyFile(resolve(portRoot, 'assets/text-atlas/OFL.txt'), resolve(output, 'art/OFL-text-atlas.txt'));

for (const name of ['beep', 'chain', 'click', 'combo', 'error', 'explosion', 'levelup']) {
  await rm(resolve(output, 'audio', `${name}.wav`), { force: true });
}
for (const cue of Object.values(SFX_CUES)) {
  await copyFile(resolve(portRoot, '../../src/audio/sfx', cue.file), resolve(output, 'audio', cue.file));
}
for (const name of ['home.m4a', 'game.m4a']) {
  await copyFile(resolve(portRoot, 'assets/music', name), resolve(output, 'audio/music', name));
}

await writeFile(resolve(output, 'game.json'), JSON.stringify({
  deviceOrientation: 'portrait',
  showStatusBar: false,
  iOSHighPerformance: true
}, null, 2) + '\n');
await writeFile(resolve(output, 'project.config.json'), JSON.stringify({
  appid: process.env.WECHAT_GAME_APPID || 'wxecad834e040489b5',
  compileType: 'game',
  projectname: 'ThatButton',
  setting: { es6: false, minified: false, urlCheck: true }
}, null, 2) + '\n');
async function directoryBytes(path) {
  let total = 0;
  for (const item of await readdir(path, { withFileTypes: true })) {
    const child = resolve(path, item.name);
    total += item.isDirectory() ? await directoryBytes(child) : (await stat(child)).size;
  }
  return total;
}
const packageBytes = await directoryBytes(output);
if (packageBytes >= 4 * 1024 * 1024) throw new Error(`WeChat main package exceeds 4 MiB: ${packageBytes} bytes`);
console.log(`WeChat Mini Game build: ${output} (${packageBytes} bytes; ${4 * 1024 * 1024 - packageBytes} bytes remaining; id ${buildId})`);
