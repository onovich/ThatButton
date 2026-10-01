// Build-time rasterization only. The game loads the PNG; it never rasterizes strings.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ref = 'f8d157532fbfaeda587e826d4cd5b21a49186f7c';
const fontUrl = `https://raw.githubusercontent.com/notofonts/noto-cjk/${ref}/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Black.otf`;
const fontSha256 = '2267c4a0312d267dff8c0d1609948f7d949a3da8be3e126f5e2690cb9cc883b4';
const cache = resolve(root, 'output/text-atlas-font');
await mkdir(cache, { recursive: true });
const fontPath = resolve(cache, 'NotoSansCJKsc-Black.otf');
if (!existsSync(fontPath)) {
  const response = await fetch(fontUrl);
  if (!response.ok) throw new Error(`Font download failed: ${response.status}`);
  await writeFile(fontPath, Buffer.from(await response.arrayBuffer()));
}
const font = await readFile(fontPath);
if (createHash('sha256').update(font).digest('hex') !== fontSha256) throw new Error('Font hash mismatch');
const licensePath = resolve(cache, 'OFL.txt');
if (!existsSync(licensePath)) {
  const response = await fetch(`https://raw.githubusercontent.com/notofonts/noto-cjk/${ref}/Sans/LICENSE`);
  if (!response.ok) throw new Error(`License download failed: ${response.status}`);
  await writeFile(licensePath, await response.text());
}
await mkdir(resolve(root, 'ports/wechat/assets/text-atlas'), { recursive: true });
await writeFile(resolve(root, 'ports/wechat/assets/text-atlas/OFL.txt'),
  'Copyright 2014-2021 Adobe (http://www.adobe.com/).\n\n' + await readFile(licensePath, 'utf8'));
const browser = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium'
].find(existsSync);
if (!browser) throw new Error('Set CHROME_PATH to a Chromium executable for build-time rasterization.');
const tokens = ['红色', '蓝色', '黄色', '紫色', '三角形', '圆形', '正方形', '五角星',
  '奇数', '偶数', '颜色为', '形状为', '数字为', '颜色不是', '且', '或'];
const characters = [...new Set(tokens.join(''))].join('');
if (characters.length !== 24) throw new Error('Unexpected rule alphabet');
const spec = { sourceEm: 63, cellWidth: 72, cellHeight: 84, columns: 12,
  originX: 4, originY: 42, tokens,
  groups: { '#071944': characters + '0123456789', '#ec1938': characters + '123456789', '#fff': '0123456789' } };
const html = `<!doctype html><meta charset="utf-8"><pre id="output">pending</pre><script type="module">
try {
  const font = new FontFace('AtlasSource', 'url(/font.otf)', {weight:'900'});
  await font.load(); document.fonts.add(font); await document.fonts.ready;
  const spec = ${JSON.stringify(spec)}, glyphs = {};
  const count = Object.values(spec.groups).reduce((n, group) => n + [...group].length, 0);
  const canvas = document.createElement('canvas');
  canvas.width = spec.columns * spec.cellWidth;
  canvas.height = Math.ceil(count / spec.columns) * spec.cellHeight;
  const ctx = canvas.getContext('2d');
  ctx.font = '900 ' + spec.sourceEm + 'px AtlasSource'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  let index = 0;
  for (const [color, chars] of Object.entries(spec.groups)) {
    glyphs[color] = {};
    for (const char of chars) {
      const x = index % spec.columns * spec.cellWidth, y = Math.floor(index / spec.columns) * spec.cellHeight;
      ctx.fillStyle = color; ctx.fillText(char, x + spec.originX, y + spec.originY);
      glyphs[color][char] = {x,y,advance:ctx.measureText(char).width}; index++;
    }
  }
  document.querySelector('#output').textContent = JSON.stringify({width:canvas.width,height:canvas.height,glyphs,
    png:canvas.toDataURL('image/png').split(',')[1]});
} catch(error) { document.querySelector('#output').textContent = JSON.stringify({error:String(error)}); }
</script>`;
const server = createServer((request, response) => {
  response.setHeader('Content-Type', request.url === '/font.otf' ? 'font/otf' : 'text/html; charset=utf-8');
  response.end(request.url === '/font.otf' ? font : html);
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
try {
  const stdout = await new Promise((done, fail) => {
    const child = spawn(browser, ['--headless=new', '--disable-gpu', '--no-first-run',
      '--disable-background-networking', `--user-data-dir=${resolve(cache, 'chromium-profile')}`,
      '--dump-dom', '--virtual-time-budget=10000', `http://127.0.0.1:${server.address().port}/`],
    { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '', errors = '';
    child.stdout.on('data', (data) => { output += data; });
    child.stderr.on('data', (data) => { errors += data; });
    child.on('error', fail);
    child.on('exit', (code) => code === 0 ? done(output) : fail(new Error(errors)));
  });
  const match = stdout.match(/<pre id="output">(.*?)<\/pre>/s);
  if (!match) throw new Error('No rasterizer output');
  const result = JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&'));
  if (result.error) throw new Error(result.error);
  const png = Buffer.from(result.png, 'base64');
  const { png: unused, ...metrics } = result;
  const manifest = { version: 1, ...spec, ...metrics, fontUrl, fontSha256,
    pngSha256: createHash('sha256').update(png).digest('hex'),
    rasterizer: 'Chromium Canvas2D; 63px / 3 = 21 logical px',
    decodedBytes: result.width * result.height * 4 };
  if (manifest.decodedBytes > 3 * 1024 * 1024) throw new Error('Atlas exceeds decoded pixel budget');
  await writeFile(resolve(root, 'ports/wechat/assets/runtime/text-atlas-v1.png'), png);
  await writeFile(resolve(root, 'ports/wechat/src/text-atlas-manifest.js'),
    '// Generated by scripts/prepare-text-atlas.mjs. Do not hand edit.\nexport const TEXT_ATLAS = ' +
    JSON.stringify(manifest) + ';\n');
  console.log(JSON.stringify({ width: result.width, height: result.height,
    pngBytes: png.length, decodedBytes: manifest.decodedBytes, pngSha256: manifest.pngSha256 }));
} finally { server.close(); }
