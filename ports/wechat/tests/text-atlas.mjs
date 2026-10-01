import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createTextAtlas } from '../src/text-atlas.js';
import { TEXT_ATLAS } from '../src/text-atlas-manifest.js';
import { createCanvasRenderer } from '../src/renderer.js';
import { createWechatHazards } from '../src/hazards.js';
import { generateLevelData } from '../../../src/core/level.js';
import { createSeededRng } from '../../../src/core/rng.js';

const atlasImage = { width: TEXT_ATLAS.width, height: TEXT_ATLAS.height };
const imageBytes = readFileSync(new URL('../assets/runtime/text-atlas-v1.png', import.meta.url));
assert.equal(createHash('sha256').update(imageBytes).digest('hex'), TEXT_ATLAS.pngSha256);
assert.ok(TEXT_ATLAS.decodedBytes <= 3 * 1024 * 1024);
assert.equal(TEXT_ATLAS.tokens.length, 16);
assert.equal([...new Set(TEXT_ATLAS.tokens.join(''))].length, 24);
const atlas = createTextAtlas({ rules: true, numbers: true });
assert.equal(atlas.canDraw('01', '#fff'), false);
atlas.setImage(atlasImage);
assert.equal(atlas.canDraw('01', '#fff'), true);
assert.equal(atlas.canDraw('新版词条', '#ec1938'), false);
assert.equal(atlas.drawGlyph({ drawImage() { throw new Error('decode failed'); } }, '0', 0, 0, 21, '#fff'), false);
assert.equal(atlas.canDraw('01', '#fff'), false);
atlas.setImage({ width: 1, height: 1 });
assert.equal(atlas.status().decodedBytes, 0);

function setup(options, image = atlasImage) {
  const counters = {}, commands = [];
  const context = new Proxy({
    globalAlpha: 1,
    measureText(value) { return { width: [...String(value)].reduce((n, c) => n + (/\d/.test(c) ? 10 : 21), 0) }; },
    fillText(value, ...args) { commands.push(['fillText', String(value), ...args]); },
    drawImage(_image, ...args) { commands.push(['drawImage', ...args]); },
    createLinearGradient() { return { addColorStop() {} }; }
  }, { get(target, key) { return key in target ? target[key] : () => {}; } });
  const view = createCanvasRenderer({
    canvas: { getContext: () => context }, motionEnabled: false,
    info: { windowWidth: 390, windowHeight: 844, pixelRatio: 3 }, textAtlasOptions: options,
    diagnostics: { beginDraw() { return 0; }, endDraw() {}, count(name, amount = 1) {
      counters[name] = (counters[name] || 0) + amount;
    } }
  });
  if (image) view.setImages({ textAtlas: image });
  return { view, counters, commands, clear() {
    commands.length = 0; for (const key of Object.keys(counters)) delete counters[key];
  } };
}
function touchMap(view) {
  const map = [];
  for (let y = 200; y < 780; y += 8) for (let x = 10; x < 390; x += 8) {
    const hit = view.hitTest(x, y);
    if (hit?.type === 'press') map.push([x, y, hit.buttonId]);
  }
  return map;
}
const originalNow = Date.now;
Date.now = () => 100000;
try {
  const baseline = setup({}), candidate = setup({ rules: true, numbers: true });
  const absent = setup({ rules: true, numbers: true }, null);
  let aggregate = { baselineFillText: 0, atlasFillText: 0, ruleGlyphHits: 0, numberGlyphHits: 0 };
  for (const level of [1, 6, 19, 28, 36, 48]) for (let seed = 0; seed < 8; seed++) {
    const board = generateLevelData({ level, rng: createSeededRng(`atlas-${seed}`) });
    assert.ok(board.buttons.every((button) => button.number >= 1 && button.number <= 9));
    const rendered = { ...board, level, score: 80 };
    for (const run of [baseline, candidate, absent]) {
      run.view.renderer.renderBoard(rendered);
      run.view.renderer.updateTimer(11000, 15000);
      run.view.renderer.updateHazardPresentation(createWechatHazards({
        level, seed: `atlas-${seed}`, cols: board.difficulty.cols,
        buttonIds: board.buttons.map((b) => b.id), nowMs: 3510
      }));
      run.clear(); run.view.draw();
    }
    assert.deepEqual(touchMap(candidate.view), touchMap(baseline.view));
    assert.deepEqual(absent.commands, baseline.commands, 'Missing atlas must preserve original drawing commands');
    assert.equal(candidate.counters.ruleAtlasFallback || 0, 0);
    assert.equal(candidate.counters.numberAtlasFallback || 0, 0);
    aggregate.baselineFillText += baseline.counters.fillText || 0;
    aggregate.atlasFillText += candidate.counters.fillText || 0;
    aggregate.ruleGlyphHits += candidate.counters.ruleAtlasHit || 0;
    aggregate.numberGlyphHits += candidate.counters.numberAtlasHit || 0;
  }
  // Unknown future vocabulary falls back for the whole rule, never missing glyphs.
  const unknownBoard = { ...generateLevelData({ level: 1, rng: createSeededRng('unknown') }),
    level: 1, ruleText: '未来新增【词条】' };
  candidate.view.renderer.renderBoard(unknownBoard);
  candidate.clear(); candidate.view.draw();
  assert.ok(candidate.commands.some((c) => c[0] === 'fillText' && c[1] === '未'));
  assert.ok(candidate.counters.ruleAtlasFallback > 0);
  assert.equal(candidate.counters.ruleAtlasHit || 0, 0);
  // Replace/reload invalidates both readiness and the single current rule layout.
  candidate.view.setImages({}); candidate.clear(); candidate.view.draw();
  assert.equal(candidate.counters.numberAtlasHit || 0, 0);
  const separateBoard = { ...generateLevelData({ level: 6, rng: createSeededRng('separate-switches') }),
    level: 6, ruleText: '颜色不是【蓝色】且形状为【正方形】' };
  const ruleOnly = setup({ rules: true }), numberOnly = setup({ numbers: true });
  for (const run of [ruleOnly, numberOnly]) {
    run.view.renderer.renderBoard(separateBoard); run.clear(); run.view.draw();
  }
  assert.ok(ruleOnly.counters.ruleAtlasHit > 0);
  assert.equal(ruleOnly.counters.numberAtlasHit || 0, 0);
  assert.ok(numberOnly.counters.numberAtlasHit > 0);
  assert.equal(numberOnly.counters.ruleAtlasHit || 0, 0);
  console.log('Atlas range, layout/hit parity, missing/decode/unknown-word fallback checks passed:', aggregate);
} finally { Date.now = originalNow; }
