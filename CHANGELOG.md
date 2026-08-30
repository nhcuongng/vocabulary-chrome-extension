# Changelog

All notable changes to the **Vocabulary Chrome Extension** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.4] - 2026-08-31

### 🚀 Added & Improved
- **Anti-Layout Shift & Fixed Container Dimensions**:
  - Enforced a fixed width of `380px` for the in-page popup container (`.vocab-popup-theme`) to eliminate Cumulative Layout Shift (CLS) when transitioning between loading skeleton and content display.
  - Added responsive constraint `max-width: calc(100vw - 24px)` to ensure seamless responsive layout on ultra-narrow viewports / mobile screens.
  - Added `scrollbar-gutter: stable` to prevent horizontal layout jank when definition lists trigger vertical scrolling.
  - Synchronized popup positioning maxWidth logic with the 380px standard.

## [0.2.3] - 2026-08-30

### 🚀 Added & Improved
- **Auto Mode Priority Rebalancing**:
  - Reordered the automatic fallback chain in Auto mode: `Vocabulary.com` → `Free Dictionary API` → `Cambridge Dictionary`.
  - Updated hint and status descriptions to clearly show `Vocab.com → FreeDict → Cambridge`.
- **UI Source Selection Reordering**:
  - Moved Cambridge Dictionary to the bottom across all dictionary source selectors:
    - Popup Action (`popup.html` & `popup.js`)
    - In-page Lookup Popup (`popupManager.js`)
    - Shared History Slider catalog (`historySliderRenderer.js`)
    - Quick Search Overlay (`quickSearchOverlay.js`)
- **Multi-Source Fallback Testing**:
  - Added test suites in `tests/background/multiSourceLookup.test.js` validating the full 3-tier fallback chain.

## [0.2.2] - 2026-08-30

### 🚀 Added & Improved
- **Free Dictionary API Support**:
  - Integrated `freedictionaryapi.com` API as a new explicit dictionary source, providing a structured alternative for definitions, IPA, and forms.
  - Built-in Google TTS fallback for Free Dictionary API since it does not natively provide audio stream URLs.
  - Updated all UI components (action popup, in-page popup, quick search overlay) to support the new "Free Dictionary API" source selection.
- **Cambridge Experimental Badge**:
  - Added an experimental (🧪) badge next to the Cambridge Dictionary source selection option in all UIs to indicate its experimental web-scraping nature subject to Cloudflare blocks.

## [0.2.1] - 2026-08-30

### 🚀 Added & Improved
- **Header Settings Gear Icon (⚙️)**:
  - Transferred configuration controls (`Auto-popup`, `Dark mode`, help tooltips, and status indicator) from the bottom footer into a sleek gear icon popover located beside the dictionary source button in `popup.html`.
  - Cleaned up the footer area completely, giving all viewport real estate to dictionary lookup results and word definitions.
- **Shared History Slider Component (`src/content/historySliderRenderer.js`)**:
  - Unified history slider rendering across Popup Action (`popup.html`) and In-page Popup (`popupManager.js`).
  - Standardized all UI copy, tooltips, and source menu descriptions into a single centralized English dictionary catalog (`UI_COPY`).
- **Responsive History Chips with Smart Ellipsis (`...`)**:
  - History chips in both popup modes now scale responsively with `flex: 1 1 0px` and `min-width: 0; width: 0`.
  - Long words automatically truncate with ellipsis without distorting container layout. Full words remain accessible via `title` and `aria-label` attributes.
- **Strict Popup Dimensions & Natural Height**:
  - Fixed popup width strictly at `380px` (`min-width: 380px; max-width: 380px`) with `overflow-x: hidden`.
  - Removed artificial `min-height: 250px`, enabling natural dynamic height expansion from compact idle state (~120px) to full search results (~380px).
- **Custom Thin Scrollbar & Padding Optimization**:
  - Redesigned `.results-container` scroll layout with 5px slim custom scrollbar matching light/dark theme colors.
  - Eliminated awkward padding offsets and scroll clipping.
- **Enhanced Token Validation & Audio Handling**:
  - Accepts hyphenated compound words (`well-known`, `state-of-the-art`) while rejecting invalid trailing digits/underscores (`word_123`).
  - Improved dark mode contrast ratio to WCAG AA standards and improved trigger icon accessibility (`aria-label`, keyboard dismissal).

---

## [0.2.0] - 2026-08-30

### 🚀 Added
- **Multi-Source Dictionary Architecture**:
  - Support for **Auto**, **Vocabulary.com**, and **Cambridge Dictionary** sources.
  - Direct Open Dictionary API engine (`api.dictionaryapi.dev`) for fast, structured dictionary lookups bypassing Cloudflare anti-scraping blocks.
  - Structured multi-section definitions: `Short Definition` (concise top meanings), `Long Definition` (in-depth explanations with examples), and categorized **Part of Speech** collapsible sections (`Noun`, `Verb`, `Adjective`, etc.).
- **Resilient Audio Playback Engine**:
  - Direct integration with Google Translate TTS CDN audio streams (`en-US` and `en-GB`) with cross-origin audio support.
  - Native Web Speech API fallback with auto-resumption for Chrome's internal audio engine.
  - Audio pronunciation buttons for both US and UK pronunciations with independent controls.
- **Enhanced UI & UX**:
  - **History Slider**: Paginated search history slider (5 chips per slide) with Previous and Next navigation buttons.
  - **Vertical Source Selection Popover**: Sleek dictionary icon menu located beside the close button in popup and search bar in toolbar popup.
  - **English UI Localization**: Standardized all toolbar popup interface text, tooltips, and settings into clear English.
- **Accurate History Logging**:
  - History is now recorded **strictly on successful responses** (`status === 'success'`), preventing misspelled, non-existent, or errored words from cluttering the search history.

### 🔧 Fixed
- Fixed Cambridge Dictionary HTTP 403 Forbidden Cloudflare challenge blocking automated background requests.
- Fixed `DOMException: The element has no supported sources` on broken third-party audio URLs.
- Fixed Chrome `window.speechSynthesis` paused state bug.

---

## [0.1.5] - 2026-08-28

### 🚀 Added
- Comprehensive test suites and quality gates.
- Word inflection utilities and family tags.

---

## [0.1.4] - 2026-08-25

### 🚀 Added
- Quick Search Overlay modal with keyboard shortcut support.
- Dark mode theme persistence.

---

## [0.1.0] - 2026-08-15

### 🚀 Initial Release
- Core highlight-to-lookup functionality for English vocabulary.
- Manifest V3 compliant service worker and Shadow DOM content script isolation.
