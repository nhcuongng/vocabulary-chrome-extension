---
title: 'Collapse definitions in popup'
type: 'feature'
created: '2026-03-30'
status: 'done'
baseline_commit: '0cd4252c55fb8292c7b4a5c794452c2be905b789'
context: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/architecture.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The current popup displays all definitions or hides them behind a "See more" link, which can be cluttered or require extra clicks to see all meanings.

**Approach:** Wrap each definition in a native HTML `<details>` element with a `<summary>` containing the label. The first definition will be set to `open` by default. Simplify the popup rendering logic by removing the "See more" manual implementation.

## Boundaries & Constraints

**Always:** Use native HTML `<details>` and `<summary>` for the collapse behavior. Ensure the first definition is `open`. Use `innerHTML` in the renderer as definitions contain HTML from the adapter.

**Ask First:** If the styling of `<details>` in the Shadow DOM requires significant CSS changes that affect the overall layout.

**Never:** Use external UI libraries for the collapse behavior. Don't change the content of the definitions themselves, only the wrapping structure.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Single Definition | One definition found | One `<details open>` element shown | N/A |
| Multiple Definitions | 3 definitions found | First is `<details open>`, next two are `<details>` (collapsed) | N/A |
| No Definitions | empty array | "not-found" state handled by mapper/manager | Handled by existing logic |

</frozen-after-approval>

## Code Map

- `src/infrastructure/adapters/vocabularyHtmlParserAdapter.js` -- Responsible for extracting and formatting definitions from HTML.
- `src/content/popupManager.js` -- Responsible for rendering the popup content and handling UI interactions.

## Tasks & Acceptance

**Execution:**
- [x] `src/infrastructure/adapters/vocabularyHtmlParserAdapter.js` -- Update `parseVocabularyHtml` to wrap each definition in `<details>` and `<summary>`. The first one gets the `open` attribute.
- [x] `src/content/popupManager.js` -- Remove the "See more" logic and simplify the `definition` type rendering to just output all items in the array.
- [x] `src/content/popupManager.js` -- Add CSS styles for `<details>` and `<summary>` in the Shadow DOM styles to ensure consistent look and feel.

**Acceptance Criteria:**
- Given a successful lookup with multiple definitions, when the popup is shown, then the first definition is expanded and others are collapsed.
- Given a collapsed definition, when the user clicks the summary, then the definition content is revealed.
- Given the popup is displayed, when looking at the UI, then the "See more" link is no longer present.

## Spec Change Log

- **Iteration 1**: Review surfaced a regression in popup positioning (height changes on expansion don't trigger repositioning), duplicate "Short Definition" sections in the parser, and excessive inline styles in the adapter.
  - **Amended**: Added requirement to handle `toggle` events on `<details>` in `popupManager.js`. Updated parser to avoid duplicates. Moved styles to Shadow DOM CSS.
  - **Iteration 2**: Review identified a critical XSS risk in the sanitization logic (stripping before decoding) and a bug in repositioning where scrolling causes the popup to jump (stale viewport-relative coordinates).
  - **Amended**: Fix sanitization order in `vocabularyHtmlParserAdapter.js`. Store and use absolute document-relative coordinates for the selection in `popupManager.js` to ensure stable repositioning. Improve CSS for the collapse icon.
  - **Iteration 3**: Review surfaced a remaining XSS risk in the raw extraction of definitions from the ordered list (`olMatch` logic) and a boundary case where the popup's top could be pushed off-screen if it's very tall.
  - **Amended**: Apply sanitization to individual list items in `olMatch` logic. Add clamping to the top of the viewport in `updatePopupPosition`.
  - **Iteration 4**: Review identified that `stripTags` remains bypassable, and the popup clamping logic doesn't react to window scroll/resize events, leading to inconsistent viewport boundary enforcement.
  - **Amended**: Improve `stripTags` regex robustness. Add `scroll` and `resize` event listeners to `windowObj` to trigger `updatePopupPosition`. Harmonize CSS `min-width` with responsive `maxWidth`.
  - **Avoids**: Bypassing sanitization with complex attributes; popup overlapping viewport boundaries during scroll; layout breakage on small viewports.
  - **KEEP**: Native `<details>`/`<summary>` structure; first item `open`; simplified renderer loop; duplicate prevention; absolute coordinates for positioning; top clamping.

## Design Notes

The adapter will now return HTML fragments like:
```html
<details open>
  <summary><p style="..."><span>✭</span> Short Definition</p></summary>
  <div>Definition text...</div>
</details>
```
The `popupManager.js` will simply render these as part of the `definition` item type.

## Suggested Review Order

**UI & Interaction**

- Wrapping definitions in native `<details>` for clean, accessible collapse behavior.
  [`vocabularyHtmlParserAdapter.js:94`](../../src/infrastructure/adapters/vocabularyHtmlParserAdapter.js#L94)

- Simplified renderer loop that handles collapsible items and attaches `toggle` repositioning listeners.
  [`popupManager.js:467`](../../src/content/popupManager.js#L467)

- CSS styles for the new collapsible structure, including icon rotation and responsive widths.
  [`popupManager.js:217`](../../src/content/popupManager.js#L217)

**Positioning & Stability**

- Calculating and storing absolute document-relative coordinates to keep the popup stable during scroll.
  [`popupManager.js:505`](../../src/content/popupManager.js#L505)

- Window `scroll` and `resize` listeners with throttling to ensure the popup stays within viewport bounds.
  [`popupManager.js:21`](../../src/content/popupManager.js#L21)

- Clamping logic preventing the popup from overflowing the top or bottom of the screen.
  [`popupManager.js:296`](../../src/content/popupManager.js#L296)

**Security & Data Integrity**

- Corrected sanitization pipeline decoding entities before stripping tags to prevent XSS bypasses.
  [`vocabularyHtmlParserAdapter.js:24`](../../src/infrastructure/adapters/vocabularyHtmlParserAdapter.js#L24)

- Robust tag-stripping regex handling quoted attributes and HTML comments.
  [`vocabularyHtmlParserAdapter.js:1`](../../src/infrastructure/adapters/vocabularyHtmlParserAdapter.js#L1)

- Duplicate prevention using a `Set` to ensure the same meaning isn't displayed multiple times.
  [`vocabularyHtmlParserAdapter.js:106`](../../src/infrastructure/adapters/vocabularyHtmlParserAdapter.js#L106)

## Verification

**Commands:**
- `npm test` -- expected: SUCCESS
- `npm run build` -- expected: SUCCESS

**Manual checks (if no CLI):**
- Inspect the popup in the browser after building to ensure `<details>` elements are working correctly.
- Verify the first definition is open and others are closed.
- Verify "See more" is gone.
