import assert from 'node:assert/strict';
import { copyDiagnosticReport } from '../src/report-export.js';
import { createPerformanceDiagnostics } from '../src/performance-diagnostics.js';

const dialogs = [];
const wx = { setClipboardData: ({ fail }) => fail({ errMsg: 'setClipboardData:fail denied', errno: 112 }),
  showModal: (options) => dialogs.push(options) };
const collector = createPerformanceDiagnostics(wx, { enabled: true, now: () => 0 });
const data = collector.exportReport();
assert.deepEqual(JSON.parse(data).scenes, {});
assert.match(dialogs[0].content, /setClipboardData:fail denied/);
assert.match(dialogs[0].content, /112/);
dialogs[0].success({ confirm: true });
assert.match(dialogs[1].title, /摘要/);
const report = { reports: [{ metadata: { comparison: { group: 'B', order: 2 } },
  scenes: { game: { draws: 10, fillText: 12, drawSubmit: { meanMs: 1.5 }, rafOver50ms: 2 } } }] };
dialogs.length = 0;
copyDiagnosticReport(wx, report);
dialogs[0].success({ confirm: true });
dialogs[1].success({ confirm: true });
assert.match(dialogs[2].content, /第2轮 B \/ game/);
assert.match(dialogs[2].content, /提交均值ms 1.5/);
assert.match(dialogs[2].content, /文字次数 12/);
let copied;
copyDiagnosticReport({ setClipboardData: ({ data }) => { copied = data; } }, report);
assert.deepEqual(JSON.parse(copied), report);
dialogs.length = 0;
copyDiagnosticReport({ ...wx, setClipboardData() { throw new Error('sync failure'); } }, report);
assert.match(dialogs[0].content, /sync failure/);
dialogs.length = 0;
const blockedData = copyDiagnosticReport({ ...wx, setClipboardData: ({ fail }) => fail({
  errMsg: 'setClipboardData:fail please go to mp to announce your privacy usage', errno: 1026
}) }, report);
assert.match(dialogs[0].title, /剪贴板被微信拦截/);
assert.match(dialogs[0].content, /公众平台/);
assert.match(dialogs[0].content, /1026/);
assert.deepEqual(JSON.parse(blockedData), report, 'A privacy error must preserve the report for later export.');
console.log('Clipboard error detail, screenshot fallback and lossless compact export checks passed.');
