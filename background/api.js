// Eng 2 — Chutes LLM fetch wrapper
// Exposes analyzeArticle(text) → Promise<schema> as the shared contract with Eng 1

const ENDPOINT = "https://llm.chutes.ai/v1/chat/completions";
const MODEL = "Qwen/Qwen3-32B-TEE";

async function callLLM(apiKey, messages) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  const raw = await response.text();
  let content = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
    const chunk = JSON.parse(line.slice(6));
    content += chunk.choices[0]?.delta?.content ?? "";
  }
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) console.log("THINKING:\n", thinkMatch[1].trim());
  return content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

// Shared contract with Eng 1 — called by the service worker
// prompt.js and parser.js will be wired in here during Phase 2
async function analyzeArticle(text) {
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (!apiKey) throw new Error("No API key set");
  const raw = await callLLM(apiKey, [{ role: "user", content: text }]);
  return JSON.parse(raw);
}

// Node test environment only
if (typeof module !== "undefined") module.exports = { callLLM, analyzeArticle };
