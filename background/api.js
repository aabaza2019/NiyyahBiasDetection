// Eng 2 implements this. Must expose a global analyzeArticle(text) → Promise<schema>.
// Stub: returns mock.json so Eng 1's UI works immediately.
async function analyzeArticle(text) {
  const url = chrome.runtime.getURL('shared/mock.json');
  const res = await fetch(url);
  return res.json();
}
