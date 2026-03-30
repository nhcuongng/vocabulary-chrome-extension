# DISTILLATE: External Dictionary Fallback for 'Not Found' State

## Context
- **Project:** vocabulary-chrome-extension
- **Problem:** "Not Found" state is currently a dead end for users.
- **Goal:** Add search links to Google, Cambridge, Oxford at the top of the suggestion list in the popup.

## Requirements
- **FR1:** Extract normalized token from failed lookup.
- **FR2:** Generate search URLs:
  - Google: `https://www.google.com/search?q=define+${word}`
  - Cambridge: `https://dictionary.cambridge.org/dictionary/english/${word}`
  - Oxford: `https://www.oxfordlearnersdictionaries.com/definition/english/${word}`
- **FR3:** Inject HTML links at the TOP of the guidance list (above "Bỏ dấu câu...", etc.).
- **FR4:** All links must have `target="_blank"` and `rel="noopener noreferrer"`.
- **UX:** Blue embedded links, simple text: "Thử tìm kiếm tại: Google | Cambridge | Oxford".

## Implementation Strategy
- **File:** `src/application/popupCopyCatalog.js` (add link template).
- **File:** `src/application/popupViewModelMapper.js` (pass word to not-found state, build HTML).
- **File:** `src/content/popupRenderer.js` (render on top of guidance).
- **Security:** Use `encodeURIComponent` for the word in URLs.
