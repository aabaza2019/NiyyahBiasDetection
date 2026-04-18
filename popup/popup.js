const MSG = {
  ANALYZE: 'ANALYZE',
  ANALYZE_RESULT: 'ANALYZE_RESULT',
  ANALYZE_ERROR: 'ANALYZE_ERROR',
  HIGHLIGHT: 'HIGHLIGHT',
};

document.addEventListener('DOMContentLoaded', () => {
  analyze();
});

function analyze() {
  render('loading');
  chrome.runtime.sendMessage({ type: MSG.ANALYZE }, (response) => {
    if (chrome.runtime.lastError) {
      render('error', { error: chrome.runtime.lastError.message });
      return;
    }
    if (!response) {
      render('error', { error: 'No response from extension background.' });
      return;
    }
    if (response.type === MSG.ANALYZE_RESULT) {
      render('result', response.data);
      sendHighlights(response.data.flags);
    } else {
      render('error', { error: response.error || 'Analysis failed.' });
    }
  });
}

function sendHighlights(flags) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) return;
    chrome.tabs.sendMessage(tab.id, { type: MSG.HIGHLIGHT, flags });
  });
}

function render(state, data) {
  const app = document.getElementById('app');

  if (state === 'loading') {
    app.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Analyzing article…</p>
      </div>`;
    return;
  }

  if (state === 'error') {
    app.innerHTML = `
      <div class="error">
        <p>${esc(data.error)}</p>
        <button id="retry-btn">Try again</button>
      </div>`;
    document.getElementById('retry-btn').addEventListener('click', analyze);
    return;
  }

  if (state === 'empty') {
    app.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📰</div>
        <p>No article detected on this page.<br>Navigate to a news article and try again.</p>
      </div>`;
    return;
  }

  if (state === 'result') {
    const { score, political_lean, summary, flags } = data;
    const scoreClass = score >= 7 ? 'score-high' : score >= 4 ? 'score-mid' : 'score-low';

    app.innerHTML = `
      <header><h1>Bias Detector</h1></header>
      <div class="score-card">
        <div class="score ${scoreClass}">
          <span class="score-num">${score}</span><span class="score-max">/10</span>
        </div>
        <span class="lean-badge lean-${political_lean}">${political_lean}</span>
      </div>
      <div class="summary">${esc(summary)}</div>
      <div class="flags">
        <h2>Flagged Passages <span class="count">${flags.length}</span></h2>
        ${flags.map(f => `
          <div class="flag">
            <span class="flag-type ${f.type}">${f.type.replace(/_/g, ' ')}</span>
            <blockquote>"${esc(f.sentence)}"</blockquote>
            <p>${esc(f.explanation)}</p>
          </div>`).join('')}
      </div>
      <a class="settings-link" id="settings-link" href="#">⚙ Settings</a>`;

    document.getElementById('settings-link').addEventListener('click', (e) => {
      e.preventDefault();
      renderSettings();
    });
  }
}

function renderSettings() {
  const app = document.getElementById('app');
  chrome.storage.local.get('apiKey', ({ apiKey }) => {
    app.innerHTML = `
      <header><h1>Settings</h1></header>
      <div class="summary" style="padding-top:20px">
        <label style="display:block;font-size:13px;color:#64748b;margin-bottom:8px">Anthropic API Key</label>
        <input id="api-key-input" type="password"
          style="width:100%;padding:8px 12px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#e2e8f0;font-size:14px"
          placeholder="sk-ant-..." value="${apiKey ? esc(apiKey) : ''}" />
        <button id="save-key"
          style="margin-top:12px;width:100%;padding:8px;background:#3b82f6;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer">
          Save
        </button>
        <button id="back-btn"
          style="margin-top:8px;width:100%;padding:8px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:6px;font-size:14px;cursor:pointer">
          Back
        </button>
      </div>`;

    document.getElementById('save-key').addEventListener('click', () => {
      const key = document.getElementById('api-key-input').value.trim();
      chrome.storage.local.set({ apiKey: key }, () => analyze());
    });
    document.getElementById('back-btn').addEventListener('click', analyze);
  });
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
