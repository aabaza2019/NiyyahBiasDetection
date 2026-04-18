const MSG = {
  GET_ARTICLE: 'GET_ARTICLE',
  HIGHLIGHT: 'HIGHLIGHT',
  SHOW_RESULT: 'SHOW_RESULT',
  SHOW_ERROR: 'SHOW_ERROR',
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MSG.GET_ARTICLE) {
    sendResponse(extractArticle());
  } else if (message.type === MSG.HIGHLIGHT) {
    injectStyles();
    message.flags.forEach(f => highlightSentence(f.sentence, f.type, f.explanation));
    sendResponse({ ok: true });
  } else if (message.type === MSG.SHOW_RESULT) {
    showPanel(message.data);
    sendResponse({ ok: true });
  } else if (message.type === MSG.SHOW_ERROR) {
    showPanelError(message.error);
    sendResponse({ ok: true });
  }
});

function extractArticle() {
  const selected = window.getSelection()?.toString().trim();
  if (selected && selected.length > 20) {
    return { text: cleanText(selected), found: true, fromSelection: true };
  }

  const selectors = [
    'article',
    '[role="main"]',
    '.article-body',
    '.post-content',
    '.entry-content',
    '.story-body',
    '.article__body',
    'main',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim().length > 200) {
      return { text: cleanText(el.innerText), found: true };
    }
  }
  const bodyText = document.body.innerText.trim();
  return { text: cleanText(bodyText), found: bodyText.length > 200 };
}

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 24000);
}

function highlightSentence(sentence, type, explanation) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = walker.nextNode())) {
    const idx = node.textContent.indexOf(sentence);
    if (idx === -1) continue;
    try {
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + sentence.length);

      const mark = document.createElement('mark');
      mark.className = `bias-highlight bias-${type}`;

      const tooltip = document.createElement('span');
      tooltip.className = 'bias-tooltip';
      tooltip.textContent = `${type.replace(/_/g, ' ')}: ${explanation}`;
      mark.appendChild(tooltip);

      range.surroundContents(mark);
    } catch {
      // skip — sentence crosses element boundaries
    }
    break;
  }
}

function showPanel(data) {
  removePanel();
  injectStyles();
  const { score, political_lean, summary, flags } = data;
  const scoreClass = score >= 7 ? 'bd-score-high' : score >= 4 ? 'bd-score-mid' : 'bd-score-low';

  const panel = document.createElement('div');
  panel.id = 'bias-detector-panel';
  panel.innerHTML = `
    <div class="bd-header">
      <span class="bd-title">Bias Detector</span>
      <span class="bd-source">selection</span>
      <button class="bd-close" id="bd-close">✕</button>
    </div>
    <div class="bd-score-row">
      <div class="bd-score ${scoreClass}">
        <span class="bd-score-num">${score}</span><span class="bd-score-max">/10</span>
      </div>
      <span class="bd-lean bd-lean-${political_lean}">${political_lean}</span>
    </div>
    <div class="bd-summary">${escPanel(summary)}</div>
    <div class="bd-flags">
      <div class="bd-flags-title">Flagged Passages <span class="bd-count">${flags.length}</span></div>
      ${flags.map(f => `
        <div class="bd-flag">
          <span class="bd-flag-type bd-${f.type}">${f.type.replace(/_/g, ' ')}</span>
          <blockquote class="bd-quote">"${escPanel(f.sentence)}"</blockquote>
          <p class="bd-explanation">${escPanel(f.explanation)}</p>
        </div>`).join('')}
    </div>`;

  document.body.appendChild(panel);
  document.getElementById('bd-close').addEventListener('click', removePanel);
}

function showPanelError(error) {
  removePanel();
  injectStyles();
  const panel = document.createElement('div');
  panel.id = 'bias-detector-panel';
  panel.innerHTML = `
    <div class="bd-header">
      <span class="bd-title">Bias Detector</span>
      <button class="bd-close" id="bd-close">✕</button>
    </div>
    <div class="bd-summary" style="color:#f87171">${escPanel(error)}</div>`;
  document.body.appendChild(panel);
  document.getElementById('bd-close').addEventListener('click', removePanel);
}

function removePanel() {
  document.getElementById('bias-detector-panel')?.remove();
}

function escPanel(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function injectStyles() {
  if (document.getElementById('bias-detector-styles')) return;
  const style = document.createElement('style');
  style.id = 'bias-detector-styles';
  style.textContent = `
    .bias-highlight { position: relative; cursor: pointer; border-radius: 2px; }
    .bias-loaded_language     { background: rgba(239,68,68,0.2);  border-bottom: 2px solid #ef4444; }
    .bias-missing_perspective { background: rgba(234,179,8,0.2);  border-bottom: 2px solid #eab308; }
    .bias-framing             { background: rgba(168,85,247,0.2); border-bottom: 2px solid #a855f7; }
    .bias-false_balance       { background: rgba(249,115,22,0.2); border-bottom: 2px solid #f97316; }
    .bias-tooltip {
      display: none; position: absolute; bottom: calc(100% + 4px); left: 0;
      background: #1e293b; color: #f1f5f9; padding: 8px 12px;
      border-radius: 6px; font-size: 13px; width: 280px;
      z-index: 2147483647; box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      line-height: 1.5; pointer-events: none; white-space: normal;
    }
    .bias-highlight:hover .bias-tooltip { display: block; }

    #bias-detector-panel {
      position: fixed; top: 20px; right: 20px; width: 340px; max-height: 80vh;
      background: #0f172a; color: #e2e8f0; border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5); z-index: 2147483646;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px; overflow: hidden; display: flex; flex-direction: column;
    }
    .bd-header {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; border-bottom: 1px solid #1e293b; flex-shrink: 0;
    }
    .bd-title { font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; flex: 1; }
    .bd-source { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 8px; border-radius: 4px; background: rgba(59,130,246,0.15); color: #60a5fa; }
    .bd-close { background: none; border: none; color: #475569; cursor: pointer; font-size: 14px; padding: 0; line-height: 1; }
    .bd-close:hover { color: #e2e8f0; }
    .bd-score-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #1e293b; flex-shrink: 0; }
    .bd-score { display: flex; align-items: baseline; gap: 2px; }
    .bd-score-num { font-size: 40px; font-weight: 700; line-height: 1; }
    .bd-score-max { font-size: 16px; color: #475569; }
    .bd-score-high .bd-score-num { color: #ef4444; }
    .bd-score-mid  .bd-score-num { color: #f59e0b; }
    .bd-score-low  .bd-score-num { color: #22c55e; }
    .bd-lean { padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
    .bd-lean-left    { background: #1d4ed8; color: #fff; }
    .bd-lean-right   { background: #b91c1c; color: #fff; }
    .bd-lean-neutral { background: #166534; color: #fff; }
    .bd-summary { padding: 12px 16px; font-size: 13px; line-height: 1.6; color: #cbd5e1; border-bottom: 1px solid #1e293b; flex-shrink: 0; }
    .bd-flags { padding: 12px 16px; overflow-y: auto; }
    .bd-flags-title { font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .bd-count { background: #1e293b; border-radius: 99px; padding: 1px 8px; font-size: 12px; }
    .bd-flag { margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #1e293b; }
    .bd-flag:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .bd-flag-type { display: inline-block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 8px; border-radius: 4px; margin-bottom: 6px; }
    .bd-loaded_language     { background: rgba(239,68,68,0.15);  color: #f87171; }
    .bd-missing_perspective { background: rgba(234,179,8,0.15);  color: #fbbf24; }
    .bd-framing             { background: rgba(168,85,247,0.15); color: #c084fc; }
    .bd-false_balance       { background: rgba(249,115,22,0.15); color: #fb923c; }
    .bd-quote { font-size: 12px; color: #94a3b8; font-style: italic; margin: 4px 0 6px; padding-left: 10px; border-left: 2px solid #334155; line-height: 1.5; }
    .bd-explanation { font-size: 12px; color: #64748b; line-height: 1.5; }
  `;
  document.head.appendChild(style);
}
