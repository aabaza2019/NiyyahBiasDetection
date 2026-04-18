# Bias Detector Chrome Extension — Project Plan

Two engineers working in parallel across 15 days. Eng 1 owns the Chrome harness, UI, and highlighting. Eng 2 owns API integration, prompting, and response parsing. Both share a contract layer defined on day 1.

---

## Shared contract (owned jointly, defined day 1)

Before either track starts, agree on and commit these to a `shared/` folder:

- **Message types** — the `chrome.runtime.sendMessage` payloads passed between content script, service worker, and popup
- **JSON schema** — the structure the LLM must return (see below)
- **Mock fixtures** — a hardcoded sample response Eng 1 can build the UI against without a live API

### LLM response schema

```json
{
  "score": 7,
  "political_lean": "right",
  "summary": "Article uses loaded language and omits key opposing viewpoints.",
  "flags": [
    {
      "sentence": "The radical left agenda continues to push...",
      "type": "loaded_language",
      "explanation": "Pejorative framing with no factual basis."
    }
  ]
}
```

---

## Eng 1 — Chrome harness, UI, highlighting

### Phase 1 · Days 1–3 · Scaffold

- [ ] Create `manifest.json` (Manifest V3) with `activeTab`, `storage`, `scripting` permissions
- [ ] Set up folder structure: `content/`, `background/`, `popup/`, `shared/`
- [ ] Confirm extension loads unpacked in Chrome without errors
- [ ] Wire `chrome.runtime.sendMessage` stub from content script → service worker → popup (no logic yet, just the plumbing)

### Phase 2 · Days 4–8 · Core build

- [ ] **Content script** — extract article body from DOM using selectors (`article`, `[role=main]`, `.article-body` etc.), clean and return plain text
- [ ] **Popup UI** — score card showing `score`, `political_lean`, `summary`; loading spinner; error state
- [ ] Style popup with a clean, minimal design (no external CSS frameworks needed)
- [ ] Build against mock fixture from shared contract — UI should be fully functional before real API is wired

### Phase 3 · Days 9–12 · Inline highlighting

- [ ] Receive `flags` array from service worker and highlight matching sentences in the page DOM
- [ ] Add tooltip or sidebar panel showing `type` and `explanation` per flagged sentence
- [ ] Handle edge cases: sentence not found in DOM, multiple matches, dynamic pages
- [ ] Clicking a highlight scrolls to + focuses the relevant popup detail

### Phase 4 · Days 13–15 · Polish

- [ ] Loading states while waiting for LLM response (spinner in popup, subtle page overlay)
- [ ] Empty state when no article is detected on the current page
- [ ] Settings popup: API key entry field, model selector
- [ ] Accessibility pass: keyboard nav, focus management, ARIA labels

---

## Eng 2 — API integration, prompting, response parsing

### Phase 1 · Days 1–3 · API client skeleton

- [ ] Create `background/api.js` — `fetch` wrapper for the Anthropic `/v1/messages` endpoint
- [ ] Store and retrieve API key via `chrome.storage.local` (never hardcoded)
- [ ] Return a stubbed mock response matching the shared JSON schema so Eng 1 can proceed
- [ ] Add basic error surface: network failure, 401 auth error, 429 rate limit

### Phase 2 · Days 4–8 · Prompt design + response parser

- [ ] Write `shared/prompt.js` — system prompt + user prompt template wrapping the article text
- [ ] System prompt should instruct: detect political bias, loaded language, missing perspectives; respond only in valid JSON matching the schema
- [ ] Write `shared/parser.js` — validates and extracts `score`, `political_lean`, `summary`, `flags` from LLM response; throws on malformed output
- [ ] Unit test parser against a set of real and malformed LLM responses

### Phase 3 · Days 9–12 · Caching + robustness

- [ ] URL-keyed cache in `chrome.storage.session` — skip API call if same article was analysed in the last 30 min
- [ ] Debounce: don't fire on page load, fire on explicit user click in popup
- [ ] Retry logic: 1 retry on transient network error, back off on 429
- [ ] Truncate very long articles to fit context window (first 6000 tokens or ~24 000 chars)

### Phase 4 · Days 13–15 · Prompt refinement

- [ ] Test prompt against 10–15 real articles across political spectrum
- [ ] Tune prompt to reduce false positives on neutral factual reporting
- [ ] Add `confidence` field to schema if the model supports it
- [ ] Document prompt design decisions in `shared/PROMPT_NOTES.md`

---

## Sync points

| Sync | When | Goal |
|------|------|------|
| Sync 1 | End of day 3 | Agree on message contract and JSON schema; both unblock |
| Sync 2 | End of day 8 | Wire up real message passing end-to-end for the first time |
| Sync 3 | End of day 12 | Full smoke test: real article → real API → highlights on page |
| Sync 4 | End of day 15 | QA pass, release build, load test on 5+ news sites |

---

## File structure

```
bias-detector/
├── manifest.json
├── shared/
│   ├── contract.js       # Message type constants
│   ├── schema.json       # LLM response JSON schema
│   ├── parser.js         # Response validation (Eng 2)
│   ├── prompt.js         # Prompt template (Eng 2)
│   ├── mock.json         # Fixture for UI development (Eng 2)
│   └── PROMPT_NOTES.md   # Prompt design log (Eng 2)
├── content/
│   └── content.js        # DOM extraction + highlighting (Eng 1)
├── background/
│   ├── service-worker.js # Message router (Eng 1 shell, Eng 2 logic)
│   └── api.js            # LLM fetch wrapper (Eng 2)
└── popup/
    ├── popup.html        # (Eng 1)
    ├── popup.js          # (Eng 1)
    └── popup.css         # (Eng 1)
```

---

## Definition of done

- Extension loads on Chrome without warnings
- Visiting a news article and clicking the extension icon returns a bias score within 5 seconds
- Biased sentences are highlighted inline on the page
- API key is never exposed in source; stored only in `chrome.storage.local`
- Extension handles no-article pages, API errors, and slow responses gracefully
