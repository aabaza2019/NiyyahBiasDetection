importScripts('api.js');

const MSG = {
  ANALYZE: 'ANALYZE',
  ANALYZE_RESULT: 'ANALYZE_RESULT',
  ANALYZE_ERROR: 'ANALYZE_ERROR',
  GET_ARTICLE: 'GET_ARTICLE',
  HIGHLIGHT: 'HIGHLIGHT',
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MSG.ANALYZE) {
    handleAnalyze()
      .then(sendResponse)
      .catch(() => sendResponse({ type: MSG.ANALYZE_ERROR, error: 'Unexpected error.' }));
    return true; // keep channel open for async response
  }
});

async function handleAnalyze() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return { type: MSG.ANALYZE_ERROR, error: 'No active tab found.' };

  let article;
  try {
    article = await chrome.tabs.sendMessage(tab.id, { type: MSG.GET_ARTICLE });
  } catch {
    return { type: MSG.ANALYZE_ERROR, error: 'Could not reach page. Try refreshing.' };
  }

  if (!article?.text) {
    return { type: MSG.ANALYZE_ERROR, error: 'No article content found on this page.' };
  }

  try {
    const data = await analyzeArticle(article.text);
    return { type: MSG.ANALYZE_RESULT, data };
  } catch (e) {
    return { type: MSG.ANALYZE_ERROR, error: e.message || 'Analysis failed.' };
  }
}
