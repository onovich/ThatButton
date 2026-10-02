// Only invoked by an explicit export action; no background work or uploads.
export function reportSummaryPages(report) {
  const reports = report.reports || [report];
  const fmt = (v) => Number.isFinite(v) ? Number(v.toFixed(3)) : '未测';
  const pages = [];
  for (const item of reports) {
    const m = item.metadata || {}, ab = m.comparison || {};
    const head = `第${ab.order ?? '-'}轮 ${ab.group || '单份'}\n构建 ${m.buildId || '未知'}\n机型 ${m.model || '未知'} / ${m.system || '未知'}\n种子 ${ab.seed || m.run?.seed || '未知'}\n关卡 ${m.run?.level ?? '-'} / 分数 ${m.run?.score ?? '-'}\n图集 规则:${Boolean(m.ruleAtlas)} 数字:${Boolean(m.numberAtlas)}`;
    // Split metadata too, so long device strings cannot hide the scene metrics.
    for (let i = 0; i < head.length; i += 600) pages.push(head.slice(i, i + 600));
    for (const [name, s] of Object.entries(item.scenes || {})) {
      if (!s.draws && !s.rafInterval?.count) continue;
      pages.push(`第${ab.order ?? '-'}轮 ${ab.group || '单份'} / ${name}\n绘制次数 ${s.draws || 0}\n提交均值ms ${fmt(s.drawSubmit?.meanMs)}\n近期P95ms ${fmt(s.drawSubmit?.recentP95Ms)} / 样本 ${s.drawSubmit?.recentSampleCount || 0}\n文字次数 ${s.fillText || 0}\n帧间隔样本 ${s.rafInterval?.count || 0}\n超过50ms次数 ${s.rafOver50ms || 0}\n规则/数字命中 ${s.ruleAtlasHit || 0}/${s.numberAtlasHit || 0}\n规则/数字回退 ${s.ruleAtlasFallback || 0}/${s.numberAtlasFallback || 0}`);
    }
  }
  return pages;
}

export function copyDiagnosticReport(wxApi, report) {
  const data = JSON.stringify(report); // Compact, lossless JSON reduces clipboard payload.
  function failed(error) {
    const detail = String(error?.errMsg || error?.message || '剪贴板接口不可用').slice(0, 700);
    if (!wxApi.showModal) {
      wxApi.showToast?.({ title: '复制失败，请在微信中查看详情', icon: 'none' });
      return;
    }
    const pages = reportSummaryPages(report);
    function showPage(index) {
      wxApi.showModal({ title: `摘要 ${index + 1}/${pages.length}`, content: pages[index],
        confirmText: index + 1 < pages.length ? '下一页' : '完成', cancelText: '关闭',
        success: ({ confirm }) => { if (confirm && index + 1 < pages.length) showPage(index + 1); } });
    }
    const privacyBlocked = Number(error?.errno ?? error?.errCode) === 1026 || /announce your privacy/i.test(detail);
    wxApi.showModal({ title: privacyBlocked ? '剪贴板被微信拦截' : '报告复制失败',
      content: privacyBlocked
        ? `微信要求完善小游戏隐私告知配置（1026）。请开发者在公众平台检查隐私保护指引和告知方式，再重试。\n报告仍保留，不必重测或反复截图。\n${detail}`
        : `请截图此错误：\n${detail}\n错误码：${error?.errno ?? error?.errCode ?? '未提供'}\n可查看摘要并截图；不会删除报告。`,
      confirmText: '查看摘要', cancelText: '关闭',
      success: ({ confirm }) => { if (confirm && pages.length) showPage(0); } });
  }
  try {
    if (typeof wxApi.setClipboardData !== 'function') throw new Error('setClipboardData unavailable');
    wxApi.setClipboardData({ data, fail: failed });
  } catch (error) { failed(error); }
  return data;
}
