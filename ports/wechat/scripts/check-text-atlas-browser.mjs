// Headless, local-only visual evidence. Never drives Windows native UI.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const output = resolve(root, 'output/text-atlas-parity');
await mkdir(output, { recursive: true });
const browser = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'
].find(existsSync);
assert.ok(browser, 'Set CHROME_PATH to a Chromium executable');
const baseline = execFileSync('git', ['show', '89eab01:ports/wechat/src/renderer.js'], { cwd: root, encoding: 'utf8' })
  .replaceAll("from './", "from '/ports/wechat/src/");
const gameSource = await readFile(resolve(root, 'ports/wechat/src/game.js'), 'utf8');
const artDefinition = gameSource.match(/const ART = \{([\s\S]*?)\n\};/)[1];
const assets = Object.fromEntries([...artDefinition.matchAll(/(\w+): 'art\/([^']+)'/g)]
  .map((m) => [m[1], '/ports/wechat/assets/runtime/' + m[2]]));
assets.textAtlas = '/ports/wechat/assets/runtime/text-atlas-v1.png';
const html = `<!doctype html><meta charset="utf-8"><pre id="output">pending</pre><script type="module">
try {
  const {createCanvasRenderer: before} = await import('/baseline.js');
  const {createCanvasRenderer: after} = await import('/ports/wechat/src/renderer.js');
  const {generateLevelData} = await import('/src/core/level.js');
  const {createSeededRng} = await import('/src/core/rng.js');
  const {createWechatHazards} = await import('/ports/wechat/src/hazards.js');
  const images = {};
  await Promise.all(Object.entries(${JSON.stringify(assets)}).map(([key,src])=>new Promise((done,fail)=>{
    const image = new Image(); image.onload = () => {images[key]=image;done();}; image.onerror = () => fail(new Error(src)); image.src=src;
  })));
  const rules = ['颜色为【红色】', '形状为【三角形】', '数字为【偶数】',
    '颜色为【紫色】且形状为【五角星】', '数字为【9】且颜色为【黄色】',
    '颜色不是【蓝色】且形状为【正方形】', '颜色为【红色】或【蓝色】',
    '颜色为【黄色】或数字为【奇数】', '颜色为【紫色】且形状为【圆形】且数字为【1】'];
  function make(factory, w,h,dpr, rule, variant, at, hazard, trigger, motion=false) {
    Date.now = () => 100000;
    const canvas = document.createElement('canvas'), counters = {};
    const context = canvas.getContext('2d');
    for (const name of ['fillText','drawImage']) {
      const original = context[name].bind(context);
      context[name] = (...args) => {counters['canvas'+name]=(counters['canvas'+name]||0)+1;return original(...args);};
    }
    const diagnostics = {beginDraw(){return performance.now();},endDraw(){},count(name,n=1){counters[name]=(counters[name]||0)+n;}};
    const view = factory({canvas,motionEnabled:motion,diagnostics,
      textAtlasOptions:{rules:variant !== 'off',numbers:variant !== 'off'},
      info:{windowWidth:w,windowHeight:h,pixelRatio:dpr,safeArea:{top:h<700?24:47,bottom:h-34}}});
    view.setImages(variant === 'missing' ? {...images,textAtlas:null} : images);
    const board = {...generateLevelData({level:6,rng:createSeededRng('atlas-browser-parity')}),level:6,score:120,ruleText:rule};
    view.renderer.renderBoard(board);
    view.renderer.updateCombatStatus({player:{hp:82,maxHp:100},combat:{hp:150,maxHp:500},combo:{hasVisibleCombo:false,streak:0}});
    view.renderer.updateTimer(8400,14000);
    if(hazard) view.renderer.updateHazardPresentation(createWechatHazards({level:hazard==='swap'?28:36,
      seed:'atlas-browser-parity',cols:board.difficulty.cols,buttonIds:board.buttons.map(b=>b.id),nowMs:at}));
    if(trigger === 'press'){view.renderer.markButtonPressed(board.buttons[0].id);board.buttons[0].isClicked=true;}
    if(trigger === 'exit') view.renderer.beginRoundExit();
    Date.now = () => 100000+at;
    for(const key of Object.keys(counters)) delete counters[key]; view.draw();
    view.setMotionPaused(true);
    return {canvas,counters,view};
  }
  function differences(a,b) {
    const x=a.getContext('2d').getImageData(0,0,a.width,a.height).data;
    const y=b.getContext('2d').getImageData(0,0,b.width,b.height).data;
    let pixels=0,channels=0,maxDelta=0,box={left:a.width,top:a.height,right:0,bottom:0};
    for(let i=0;i<x.length;i+=4){let changed=false;for(let c=0;c<4;c++)if(x[i+c]!==y[i+c]){
      changed=true;channels++;maxDelta=Math.max(maxDelta,Math.abs(x[i+c]-y[i+c]));}
      if(changed){pixels++;const px=i/4%a.width,py=Math.floor(i/4/a.width);
        box.left=Math.min(box.left,px);box.right=Math.max(box.right,px);box.top=Math.min(box.top,py);box.bottom=Math.max(box.bottom,py);}
    }
    return {differentPixels:pixels,differentChannels:channels,maxChannelDelta:maxDelta,bounds:pixels?box:null};
  }
  const results=[];
  let example;
  for(const [w,h] of [[320,568],[390,844]]) for(const dpr of [1,2,3]) for(const rule of rules) {
    const a=make(before,w,h,dpr,rule,'off',650), b=make(after,w,h,dpr,rule,'off',650);
    const c=make(after,w,h,dpr,rule,'on',650), missing=make(after,w,h,dpr,rule,'missing',650);
    results.push({w,h,dpr,rule,defaultVsBaseline:differences(a.canvas,b.canvas),
      atlasVsBaseline:differences(a.canvas,c.canvas),missingVsBaseline:differences(a.canvas,missing.canvas),
      baselineCounts:a.counters,atlasCounts:c.counters});
    if(w===390 && dpr===2 && rule===rules[8]) {
      const preview=document.createElement('canvas');preview.width=780;preview.height=844;
      const ctx=preview.getContext('2d');ctx.drawImage(a.canvas,0,0,390,844);ctx.drawImage(c.canvas,390,0,390,844);
      example=preview.toDataURL('image/png').split(',')[1];
    }
  }
  for(const [w,h] of [[320,568],[390,844]]) for(const dpr of [1,2,3])
    for(const scenario of [{trigger:'press',at:80},{trigger:'press',at:180},
      {trigger:'exit',at:90},{trigger:'exit',at:300},
      {hazard:'swap',at:3300},{hazard:'swap',at:3500},
      {hazard:'glitch',at:1900},{hazard:'glitch',at:2800}]) {
      const {at,hazard,trigger}=scenario, rule=rules[8];
      const a=make(before,w,h,dpr,rule,'off',at,hazard,trigger,true);
      const b=make(after,w,h,dpr,rule,'off',at,hazard,trigger,true);
      const c=make(after,w,h,dpr,rule,'on',at,hazard,trigger,true);
      const missing=make(after,w,h,dpr,rule,'missing',at,hazard,trigger,true);
      results.push({w,h,dpr,rule,...scenario,motion:true,defaultVsBaseline:differences(a.canvas,b.canvas),
        atlasVsBaseline:differences(a.canvas,c.canvas),missingVsBaseline:differences(a.canvas,missing.canvas),
        baselineCounts:a.counters,atlasCounts:c.counters});
    }
  const runtimeSwitchCases=[];
  for(const [w,h] of [[320,568],[390,844]]) for(const dpr of [1,2,3]) {
    const a=make(before,w,h,dpr,rules[8],'off',1900,'glitch');
    const live=make(after,w,h,dpr,rules[8],'off',1900,'glitch');
    live.view.setMotionPaused(false);
    live.view.setTextAtlasOptions({rules:true,numbers:true});
    const enabled=differences(a.canvas,live.canvas);
    live.view.setTextAtlasOptions({rules:false,numbers:false});
    const restored=differences(a.canvas,live.canvas);
    live.view.setMotionPaused(true);
    runtimeSwitchCases.push({w,h,dpr,enabled,restored});
  }
  document.querySelector('#output').textContent=JSON.stringify({browser:navigator.userAgent,results,runtimeSwitchCases,example});
}catch(error){document.querySelector('#output').textContent=JSON.stringify({error:String(error),stack:error.stack});}
</script>`;
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/') {response.setHeader('Content-Type','text/html; charset=utf-8');response.end(html);return;}
    if (path === '/baseline.js') {response.setHeader('Content-Type','text/javascript');response.end(baseline);return;}
    const file = resolve(root, '.' + decodeURIComponent(path));
    if (relative(root, file).startsWith('..')) {response.writeHead(403);response.end();return;}
    response.setHeader('Content-Type', {'.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg'}[extname(file)] || 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(404);response.end(); }
});
await new Promise((done)=>server.listen(0,'127.0.0.1',done));
try {
  const stdout=await new Promise((done,fail)=>{
    const child=spawn(browser,['--headless=new','--disable-gpu','--no-first-run',
      '--disable-background-networking', '--disable-extensions',
      '--user-data-dir='+resolve(output,'chromium-profile'),'--dump-dom','--virtual-time-budget=15000',
      'http://127.0.0.1:'+server.address().port+'/'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
    let outputText='',errorText='';
    child.stdout.on('data',data=>{outputText+=data;});child.stderr.on('data',data=>{errorText+=data;});
    child.on('error',fail);child.on('exit',code=>code===0?done(outputText):fail(new Error(errorText)));
  });
  const report=JSON.parse(stdout.match(/<pre id="output">(.*?)<\/pre>/s)[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
  if(report.error)throw new Error(report.stack);
  await writeFile(resolve(output,'comparison.png'),Buffer.from(report.example,'base64'));
  delete report.example;
  await writeFile(resolve(output,'results.json'),JSON.stringify(report,null,2)+'\n');
  assert.ok(report.results.every(r=>r.defaultVsBaseline.differentPixels===0),'Default visual regression');
  assert.ok(report.results.every(r=>r.missingVsBaseline.differentPixels===0),'Atlas failure visual regression');
  assert.ok(report.runtimeSwitchCases.every(r=>r.enabled.differentPixels>0 && r.restored.differentPixels===0),
    'Runtime switch must invalidate rule/glitch caches and restore the original pixels.');
  console.log(JSON.stringify({cases:report.results.length,defaultDifferent:0,missingDifferent:0,
    runtimeSwitchCases:report.runtimeSwitchCases.length,runtimeRestoredDifferent:0,
    candidateDiffRange:[Math.min(...report.results.map(r=>r.atlasVsBaseline.differentPixels)),
      Math.max(...report.results.map(r=>r.atlasVsBaseline.differentPixels))],output}));
} finally {server.close();}
