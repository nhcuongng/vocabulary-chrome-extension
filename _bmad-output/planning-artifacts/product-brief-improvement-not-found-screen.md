---
name: improvement-not-found-screen
description: Product brief for enhancing the 'Not Found' screen with external dictionary links.
type: project
---

# Product Brief: External Dictionary Fallback for 'Not Found' State

**Project:** vocabulary-chrome-extension
**Owner:** Cuongnguyenhuu (Project Lead)
**Status:** Draft
**Date:** 2026-03-30

## 1. Executive Summary
The goal of this enhancement is to reduce user friction when a vocabulary lookup fails in the primary source (Vocabulary.com). By providing immediate, clickable links to trusted external dictionaries (Google, Cambridge, Oxford) at the top of the "Not Found" screen, we empower users to continue their learning journey without manually copying and searching for words elsewhere.

## 2. Problem Statement
Currently, when a word is not found in Vocabulary.com, the extension displays a static "Not Found" message with general tips (e.g., "strip punctuation"). While helpful, this results in a "dead end" for words that genuinely don't exist in the source dictionary. Users have to:
1. Close the popup.
2. Re-select the word (if lost).
3. Open a new tab.
4. Manually search on Google or other dictionaries.

This breaks the "in-context" reading flow which is the core value proposition of the extension.

## 3. Goals & Success Metrics
- **Goal:** Provide a seamless fallback path for unknown words.
- **Success Metric:**
    - Decrease in "abandonment" rate after a Not Found state (qualitative).
    - Increase in "useful end states" for lookups (as per NFR4).

## 4. Proposed Solution
Modify the "Not Found" popup state to include a "Search elsewhere" row at the top of the guidance list.

### Functional Requirements:
- **FR-NF1:** Identify the normalized token (word) that triggered the Not Found state.
- **FR-NF2:** Generate dynamic search URLs for:
    - **Google:** `https://www.google.com/search?q=define+${word}`
    - **Cambridge:** `https://dictionary.cambridge.org/dictionary/english/${word}`
    - **Oxford:** `https://www.oxfordlearnersdictionaries.com/definition/english/${word}`
- **FR-NF3:** Display a text line (e.g., "Thử tìm kiếm tại: Google | Cambridge | Oxford") at the top of the current guidance list.
- **FR-NF4:** All links must open in a new tab (`target="_blank"`) to prevent navigating away from the current page.

### User Experience (UX):
- **Placement:** Above the current tips ("Bỏ dấu câu...", "Chỉ chọn một từ...").
- **Style:** Consistent with the current "Scholarly Calm" system (blue links).
- **Behavior:** Links should be clearly identifiable as interactive elements.

## 5. Technical Constraints & Architecture
- **Adapter Pattern:** Maintain the current adapter isolation. The links should be generated in the mapping layer (`popupViewModelMapper.js`).
- **Sanitization:** Ensure the word/token is properly URI-encoded to prevent malformed URLs or injection.
- **Renderer:** Leverage the existing `innerHTML` support in `popupManager.js` to render the embedded links.

## 6. Implementation Strategy
1. **Update `popupCopyCatalog.js`**: Add a template string or placeholder for the search links.
2. **Update `popupViewModelMapper.js`**:
    - Pass the `headword` (or normalized token) even in the `not-found` state.
    - Build the HTML string for the search links.
3. **Update `popupRenderer.js`**: Ensure the search links are injected at the top of the `guidance` array or as a new field.

---
*Drafted by Antigravity (BMad BA Agent)*
