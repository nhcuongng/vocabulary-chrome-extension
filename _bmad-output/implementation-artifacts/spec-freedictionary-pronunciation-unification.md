---
title: 'Sourcing Pronunciation and Stress from FreeDictionary API with Unified Popup UI'
type: 'feature'
created: '2026-08-31'
status: 'done'
baseline_commit: '8964ed06f6c35ae8d3c1a77251ded52eb30a8acc'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Pronunciation, phonetic notation (IPA), and stress contours obtained from scraped HTML (like Vocabulary.com) can sometimes be inconsistent or incomplete, and the pronunciation/stress visualization UI differed between the in-page selection popup and the toolbar extension popup.

**Approach:** Enrich and prioritize phonetic IPA, audio, and stress diagram data using https://freedictionaryapi.com (with fallback to the primary dictionary source), and unify the pronunciation audio controls, syllable rhythm pill, and pitch contour line diagram across both the in-page selection popup and the Chrome toolbar popup.

## Boundaries & Constraints

**Always:**
- Keep all UI text, tooltips, and labels 100% in English (English UI Only).
- Enrich pronunciation and audio from Free Dictionary API (`https://freedictionaryapi.com/api/v1/entries/en/{word}` or `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`) when available, preserving definitions from the selected dictionary source.
- Provide seamless fallback to primary dictionary phonetics / Google TTS if FreeDictionary API fails or is unreachable.
- Unify pronunciation styling, speaker audio buttons, and interactive stress rhythm pills between `popupManager.js` and `popup.js`.

**Ask First:**
- Adding additional third-party audio or dictionary providers beyond FreeDictionary API.

**Never:**
- Break existing dictionary switching (Vocabulary.com, Cambridge, FreeDictionary, Auto).
- Block definition rendering if the FreeDictionary API pronunciation lookup experiences network timeout or errors.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Word with US & UK audio on FreeDictionary | Headword e.g. "photograph" | Display US and UK IPA tags, direct speaker buttons, and interactive rhythm pill / pitch contour | Falls back to Google TTS if audio URL fails to load |
| Word not found on FreeDictionary | Rare or inflected word | Display phonetics and audio from primary source (e.g. Vocabulary.com) | Standard fallback |
| FreeDictionary API Network Timeout / Error | Network offline or rate limit | Continue rendering dictionary definitions smoothly with fallback pronunciation/audio | Silent graceful fallback |
| Toolbar Popup vs In-page Popup | Any successful lookup | Both popups render identical pronunciation buttons, US/UK badges, and stress rhythm pill with pitch contour SVG | Consistent view model & CSS |

</frozen-after-approval>

## Code Map

- `src/background/serviceWorkerLookupHandler.js` -- Background handler orchestrating dictionary lookup and enriching phonetics/audio from FreeDictionary API
- `src/infrastructure/adapters/freeDictionaryApiAdapter.js` -- Adapter parsing phonetic IPA, US/UK audio links, and definitions from Free Dictionary API
- `src/application/popupViewModelMapper.js` -- Maps parsed payload and stress diagram structure into standard view model for all popups
- `src/content/popupManager.js` -- Renders unified pronunciation, audio buttons, and stress rhythm pill in the in-page Shadow DOM popup
- `src/popup/popup.js` -- Renders unified pronunciation, audio buttons, and stress rhythm pill in the toolbar popup
- `src/popup/popup.html` -- HTML container & styles for toolbar popup pronunciation & stress visualization
- `tests/infrastructure/freeDictionaryApiAdapter.test.js` -- Unit tests for FreeDictionary API parser
- `tests/background/serviceWorkerLookupHandler.test.js` -- Unit tests for FreeDictionary pronunciation enrichment & fallback

## Tasks & Acceptance

**Execution:**
- [x] `src/infrastructure/adapters/freeDictionaryApiAdapter.js` -- Extract comprehensive US/UK phonetics and audio links from Free Dictionary API response.
- [x] `src/background/serviceWorkerLookupHandler.js` -- Enrich lookup results with FreeDictionary API phonetics and audio while keeping primary definitions.
- [x] `src/application/popupViewModelMapper.js` -- Ensure clean mapping of enriched IPA, audio endpoints, and stress diagram data.
- [x] `src/popup/popup.js` & `src/popup/popup.html` -- Synchronize pronunciation & stress diagram UI in toolbar popup to match in-page popup's Rhythm Pill and Pitch Contour SVG.
- [x] `src/content/popupManager.js` -- Verify in-page popup pronunciation and stress rendering consistency.
- [x] `tests/background/serviceWorkerLookupHandler.test.js` & `tests/infrastructure/freeDictionaryApiAdapter.test.js` -- Add unit tests for FreeDictionary pronunciation enrichment and UI consistency.

**Acceptance Criteria:**
- Given a word lookup in either the in-page popup or toolbar popup, when FreeDictionary API returns phonetics/audio, then the popup displays standardized US/UK IPA, working audio buttons, and an interactive syllable rhythm pill with pitch contour.
- Given FreeDictionary API is unavailable or returns 404, when a word is looked up, then it falls back gracefully to the main dictionary's audio and pronunciation without breaking definition display.
- Given both in-page popup and toolbar popup, when displaying the same word, then their pronunciation and stress diagram appearance and behavior are completely unified.

## Verification

**Commands:**
- `npm test` -- expected: All unit and integration tests pass (100% passing).
- `npm run build` -- expected: Extension builds successfully without errors.

## Suggested Review Order

**Pronunciation Extraction & Background Enrichment**

- Extracts US/UK IPA and direct audio URLs from FreeDictionary API responses.
  [`freeDictionaryApiAdapter.js:16`](../../src/infrastructure/adapters/freeDictionaryApiAdapter.js#L16)

- Enriches all dictionary lookup responses with FreeDictionary API phonetics and audio.
  [`serviceWorkerLookupHandler.js:20`](../../src/background/serviceWorkerLookupHandler.js#L20)

**Toolbar Popup UI Harmonization**

- Renders identical interactive Rhythm Pill and Pitch Contour diagram in toolbar popup.
  [`popup.js:626`](../../src/popup/popup.js#L626)

- Adds matching CSS styles for stress rhythm pill and pitch contour in toolbar popup HTML.
  [`popup.html:543`](../../src/popup/popup.html#L543)

**Tests & Quality Gates**

- Unit tests verifying phonetics extraction from standard API format.
  [`freeDictionaryApiAdapter.test.js:56`](../../tests/infrastructure/freeDictionaryApiAdapter.test.js#L56)

- Unit tests verifying background service worker pronunciation enrichment and fallback.
  [`serviceWorkerLookupHandler.test.js:92`](../../tests/background/serviceWorkerLookupHandler.test.js#L92)
