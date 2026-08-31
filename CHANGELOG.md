# Changelog

All notable changes to the **Vocabulary Chrome Extension** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.7.0] - 2026-08-31

### 🚀 Added & Improved (Pronunciation & Stress Sourcing)
- **FreeDictionary API Pronunciation & Stress Sourcing**:
  - Automatically enriches all dictionary lookup results with standardized phonetic IPA (US and UK) and direct MP3 audio URLs from `https://freedictionaryapi.com`.
  - Built-in graceful fallbacks to primary dictionary phonetics and Google TTS ensuring uninterrupted lookup if the API is unreachable.
- **Unified Pronunciation & Stress UI Across All Popups**:
  - Synchronized toolbar popup (`popup.html` / `popup.js`) and in-page selection popup (`popupManager.js`) to share an identical pronunciation interface:
    - Dedicated US / UK IPA tags and speaker buttons with interactive audio playback.
    - Interactive **Syllable Rhythm Pill** featuring SVG Waveform icon, highlighted stressed syllables (`vocab-syl-high`), Equalizer Rhythm Bars (`generateEqualizerBarsSvg`), and click-to-expand **Pitch Contour SVG Line Diagram**.
- **Automated Test Coverage**:
  - Added unit test suites for FreeDictionary phonetics parser in `tests/infrastructure/freeDictionaryApiAdapter.test.js`.
  - Added service worker lookup handler tests for pronunciation enrichment and fallback in `tests/background/serviceWorkerLookupHandler.test.js`.

---

## [0.6.0] - 2026-08-31

### 🚀 Added & Improved (Popup UX & Display Hierarchy)
- **Unpacked Quick Glance Definitions Across All 3 Sources**:
  - **Vocabulary.com**: Short definition renders directly as an unpacked zero-click quick card (`vocab-quick-def`), removing the accordion wrapper so users can instantly read the meaning.
  - **FreeDictionary API**: Top 1–2 primary meanings render directly as a quick card, while comprehensive definitions and parts of speech remain cleanly organized in collapsible accordions.
  - **Cambridge Dictionary**: First core sense & part-of-speech renders directly as a quick-glance card, while detailed POS entries (Guidewords, grammatical notes, and examples) are neatly grouped in accordions.
  - Added subtle left-accent styling (`border-left: 3px solid #1677c9`) for the quick definition block with full Dark Mode support.
- **Redesigned Syllable Stress Block (Equalizer Rhythm Pill)**:
  - Replaced crude ASCII symbols and emoji with a sleek **Syllable Rhythm Pill**:
    - Modern SVG Waveform icon.
    - Highlighted syllables chain (`lo · KEI · ʃən`) with primary stress in bold uppercase and brand accent background.
    - Mini SVG Equalizer Rhythm Bars (` ▂ █ ▂ `) providing intuitive, at-a-glance acoustic rhythm feedback.
    - Interactive tooltip displaying stress details (`Stress on 2nd syllable · Click to toggle pitch contour`).
    - Click-to-expand smooth pitch contour diagram.
- **Automated Test Coverage**:
  - Added unit tests for `formatOrdinal`, `generateEqualizerBarsSvg`, and stress summary calculation in `tests/domain/stressDiagramUtils.test.js`.
  - Updated parser adapter tests and popup navigation tests to validate the new quick definition and rhythm pill structures.

---

## [0.5.1] - 2026-08-31

### 🔧 Fixed & Improved (UI Wording & Layout)
- **Zero-State UI — Wording refinements** (based on multi-agent party review):
  - CTA hint: changed from `"Click to view full definition & pronunciation ➔"` to `"Click to recall this word ➔"` — shorter and more user-friendly.
  - Onboarding card title: changed from `"👋 English Vocabulary Lookup"` to `"👋 Your personal vocabulary assistant"` — warmer, ownership-focused tone.
  - Shuffle button label: changed from `"Shuffle another word from history"` to `"Show another word from your history"` — accurately describes the action.
  - Onboarding step 2: corrected to describe standalone popup behavior (`"Search any word in the box above for instant definitions and examples."`) instead of in-page popup behavior.
  - Onboarding step 3: replaced internal jargon `"syllable stress diagrams"` with `"syllable stress patterns"`.
  - Micro-tip (pronunciation): simplified `"listen to native UK/US audio pronunciation"` to `"hear UK/US pronunciation"`.
  - Micro-tip (history): fixed relative `"above"` to `"at the top"` to avoid ambiguity.
- **Settings panel — Wording refinement**:
  - Dark mode settings hint: changed from `"Dark theme for popup"` to `"Toggle dark theme"`.
- **Layout fix**:
  - Added `max-height: 32px` to history slider wrapper to prevent pushing zero-state content too far down when many history chips are present.

---

## [0.5.0] - 2026-08-31

### 🚀 Added & Improved
- **Standalone Toolbar Popup Zero-State Experience**:
  - Implemented `popupZeroStateRenderer` for the standalone extension action popup (`popup.html`).
  - Added **Smart Flashcard Review (`✨ From Your History`)**:
    - Randomly highlights previously searched words from history when the search input is empty.
    - Includes interactive **Shuffle 🔀** button to cycle through history words.
    - Click-to-lookup interaction that immediately populates the search bar and triggers lookup.
  - Added **Onboarding Guide Card**:
    - Displays a clean 3-step guide for first-time users before any search history exists.
  - Added **Micro-Tips Banner**:
    - Displays helpful tips highlighting key extension capabilities (auto-popup, pronunciation audio, history chips, dictionary source priority).
  - Added **Zero-State & Search Transitions**:
    - Automatically hides zero-state and reveals live search results when user types or selects a word.
    - Restores zero-state seamlessly when search query is cleared.
  - Full **Dark Mode** & **Light Mode** styling and accessibility support.
- **English UI Standardization**:
  - Enforced 100% English UI consistency across all popup zero-state components, buttons, tooltips, and hints.
  - Formally codified the **English UI Only** rule in project guidelines.
- **Automated Test Coverage**:
  - Added unit tests for zero-state renderer in `tests/popup/popupZeroStateRenderer.test.js` covering returning user, first-time user, shuffle, and keyboard navigation.

## [0.4.0] - 2026-08-31

### 🚀 Added & Improved
- **Ecosystem Bridge Target Positioning**:
  - Enhanced `vocabulary-lookup` cross-extension bridge to support multiple target positioning inputs:
    - DOM Element target via `detail.targetElement` or `detail.target` with automatic `getBoundingClientRect()`.
    - Explicit bounding rectangle via `detail.rect` (`{ left, top, bottom, right, width, height }`).
    - Mouse click coordinates via `detail.clientX` / `detail.clientY` or `detail.x` / `detail.y`.
    - Automatic centered fallback if no coordinate or target is supplied (100% backward compatible).
  - Maintained selection / target positioning context throughout the Orchestrator lookup lifecycle.
- **Draggable Popup Modal**:
  - Transformed the popup header bar (`.vocab-popup-header-bar`) into an interactive drag handle with smooth `grab` / `grabbing` cursor transitions.
  - Added interaction isolation so clicks on history slider chips, navigation arrows, dictionary source selectors, or the close button do not trigger drag actions.
  - Implemented viewport boundary clamping (accounting for scroll offsets) to prevent the popup from escaping visible screen boundaries.
  - Preserved custom user-dragged modal positions across content rerenders, scroll, and resize events, resetting cleanly upon dismissal.
- **Automated Test Coverage**:
  - Added dedicated test suites for Ecosystem Bridge target positioning variants and popup modal dragging behaviors.

## [0.3.0] - 2026-08-31

### 🚀 Added & Improved
- **Draggable Auto Dictionary Source Priority**:
  - Added interactive drag-and-drop reordering for Auto dictionary sources with touch and pointer support.
  - Hidden by default behind a clean gear icon (⚙️) on the Auto selection row for a clutter-free UI.
- **English Syllable Stress Stepped Line Diagram**:
  - Implemented phonetic IPA pitch suprasegmental parser (`parseStressDiagramFromIpa`) supporting High (`▔`), Mid (`⎺`), and Low (`_`) levels based on British Council Armstrong & Ward pitch contour conventions.
  - Generates scalable, responsive SVG Stepped Line Diagram with interactive collapse icon toggle (`▼` / `▲`).
- **Ecosystem Cross-Extension Bridge**:
  - Injects a hidden bridge element `<div id="vocabulary-lookup" style="display:none;" data-extension="vocabulary-lookup"></div>` on web pages.
  - Enables other extensions in the user ecosystem to trigger dictionary lookups and popup UI via `bridgeElement.dispatchEvent(new CustomEvent('vocabulary-lookup', { detail: { word, rect, source } }))`.
- **100% English UI Localization**:
  - Converted all user-facing copy, error messages, search guidance, permission disclosures, and tooltips to clean, native English.

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
