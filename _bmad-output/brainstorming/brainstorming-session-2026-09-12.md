---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: "Nhấn Ctrl để phát âm và cấu hình phát âm mặc định trong Chrome Toolbar"
session_goals: "Thiết kế tương tác UX phát âm phím tắt, kiến trúc Audio & TTS, và giao diện cài đặt trên Toolbar Popup"
selected_approach: "ai-recommended"
techniques_used: ["SCAMPER Method", "Reverse Brainstorming", "Solution Matrix"]
ideas_generated: 12
context_file: ""
---

# Brainstorming Session: Quick Pronounce via Key Shortcut & Toolbar Audio Settings

## Session Overview

**Topic:** Nhấn Ctrl để phát âm và cấu hình phát âm mặc định trong Chrome Toolbar  
**Goals:** Thiết kế tương tác UX phát âm phím tắt, kiến trúc Audio & TTS, và giao diện cài đặt trên Toolbar Popup  

### Technique Selection

**Approach:** AI-Recommended Techniques  
**Recommended Sequence:**
1. **SCAMPER Method** (Structured Expansion)
2. **Reverse Brainstorming** (Risk & Failure Hunter)
3. **Solution Matrix** (Architecture & Convergent Matrix)

## Implementation Summary

1. **User Settings (`src/shared/userSettings.js`)**:
   - Added `ctrlPronounceEnabled` (boolean, default: `true`).
   - Added `defaultPronunciation` ('us' | 'uk', default: `'us'`).
2. **Toolbar Settings UI (`src/popup/popup.html`, `src/popup/popup.js`)**:
   - Added toggle "Pronounce on Ctrl key" with tooltip.
   - Added dropdown "Default pronunciation" (US / UK) with tooltip.
3. **Smart Shortcut Detection & Playback (`src/content/runtimeContentScript.js`, `src/content/popupManager.js`, `src/popup/popup.js`)**:
   - Standalone `Control` key listener (ignoring compound shortcuts like `Ctrl+C`, `Ctrl+V`, `Ctrl+F`).
   - Triggers pronunciation for current popup word or currently selected word on webpage.
4. **Testing**:
   - Full test suite passed (206/206 tests passing).

