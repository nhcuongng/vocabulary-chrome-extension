# Changelog

All notable changes to the **Vocabulary Chrome Extension** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
