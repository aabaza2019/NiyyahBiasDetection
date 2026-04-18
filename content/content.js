const MSG = {
  GET_ARTICLE: 'GET_ARTICLE',
  HIGHLIGHT: 'HIGHLIGHT',
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MSG.GET_ARTICLE) {
    sendResponse(extractArticle());
  } else if (message.type === MSG.HIGHLIGHT) {
    injectStyles();
    message.flags.forEach(f => highlightSentence(f.sentence, f.type, f.explanation));
    sendResponse({ ok: true });
  }
});

function extractArticle() {
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
  `;
  document.head.appendChild(style);
}
