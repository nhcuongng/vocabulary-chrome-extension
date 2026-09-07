---
title: 'Multi-Source 100 Words Test, In-Definition Synonyms/Antonyms & Dedicated Tab'
type: 'feature'
created: '2026-09-07T13:22:00+07:00'
status: 'ready-for-dev'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Extension hỗ trợ 2 nguồn tra cứu (Vocabulary.com và FreeDictionary/Simple Learn). Cần:
1. Trích xuất và hiển thị **Synonyms** & **Antonyms** đi kèm dưới từng ví dụ/định nghĩa trong tab **Definitions** cho cả hai nguồn.
2. Đồng thời gom và hiển thị toàn bộ Synonyms & Antonyms vào một tab riêng (**Synonyms & Antonyms**) với các chip từ có thể click để tra cứu.
3. Chạy kiểm thử tự động toàn diện cho 100 từ phổ biến trên cả 2 nguồn.

**Approach:** 
1. **FreeDictionary Adapter**:
   - Trích xuất `synonyms` và `antonyms` ở cấp độ từng definition/sense.
   - Format trực tiếp trong thẻ `<li>` của Definition: hiển thị dòng `Synonyms: ...` và `Antonyms: ...` đi kèm sau definition/example.
   - Thu thập toàn bộ synonyms & antonyms vào mảng tổng thể để cấp cho tab Synonyms & Antonyms.
2. **Vocabulary.com Adapter**:
   - Trích xuất định nghĩa kèm các instances/synonyms/antonyms trong `<div class="word-definitions">` ("Definitions of ...").
   - Format trực tiếp trong thẻ `<li>` của Definition: hiển thị dòng `Synonyms: ...` và `Antonyms: ...` đi kèm sau definition/example.
   - Thu thập synonyms & antonyms vào mảng tổng thể.
3. **Popup View Model & Tabs UI**:
   - Cung cấp tab **Definitions** với format chi tiết (Definition -> Example -> Synonyms/Antonyms).
   - Cung cấp tab **Synonyms & Antonyms** với danh sách từ dạng chips có thể click để tra cứu nhanh.
4. **Fixture & Test Suite 100 từ**:
   - Nâng cấp `commonWordsDataset.js` và `tests/e2e/multiSource100WordsDisplay.test.js` kiểm thử tự động toàn bộ 100 từ cho cả 2 nguồn.

## Boundaries & Constraints

**Always:**
- Giao diện UI 100% bằng tiếng Anh (English UI Only).
- Tất cả unit & e2e tests (`npm test`) vượt qua 100%.
- Giữ cấu trúc Shadow DOM Style Isolation.

**Ask First:**
- Thay đổi cấu trúc lưu trữ user-settings.

**Never:**
- Không tự động git commit/push khi chưa có sự đồng ý của người dùng.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| FreeDictionary lookup with sense synonyms/antonyms | Word JSON with `synonyms: ['quick']`, `antonyms: ['slow']` | Definition list displays `Synonyms: quick` & `Antonyms: slow` under the sense; Tab "Synonyms & Antonyms" displays badges/chips | Fallback gracefully if empty |
| Vocabulary.com lookup with defContent synonyms/antonyms | HTML with `word-definitions` containing synonyms/antonyms in definitions | Definition list displays formatted synonyms/antonyms under the definition; Tab "Synonyms & Antonyms" displays badges/chips | Fallback gracefully if empty |
| 100 Words Batch Test | 100 common words dataset across 2 sources | All 100 words parse successfully with headword, pronunciation, definitions with synonyms/antonyms, and word relations | Assert all pass without error |

</frozen-after-approval>

## Code Map

- `src/infrastructure/adapters/freeDictionaryApiAdapter.js` -- Parse & format synonyms/antonyms trong definitions và trả về mảng tổng.
- `src/infrastructure/adapters/vocabularyHtmlParserAdapter.js` -- Parse & format synonyms/antonyms trong cụm "Definitions of..." và trả về mảng tổng.
- `src/application/popupViewModelMapper.js` -- Map synonyms & antonyms vào view model.
- `src/content/popupRenderer.js` -- Render view model sang item types cho popup.
- `src/content/popupManager.js` -- Render tab "Definitions" (với inline synonyms/antonyms) và tab "Synonyms & Antonyms" (chips).
- `tests/fixtures/commonWordsDataset.js` -- Cập nhật dataset 100 từ với mock responses cho 2 nguồn có synonyms/antonyms.
- `tests/e2e/multiSource100WordsDisplay.test.js` -- Test suite 100 từ toàn diện cho cả 2 nguồn.

## Tasks & Acceptance

**Execution:**
- [ ] `src/infrastructure/adapters/freeDictionaryApiAdapter.js` -- Format synonyms & antonyms đi kèm từng sense/definition và trích xuất danh sách tổng hợp.
- [ ] `src/infrastructure/adapters/vocabularyHtmlParserAdapter.js` -- Format synonyms & antonyms đi kèm từng definition trong cụm "Definitions of..." và trích xuất danh sách tổng hợp.
- [ ] `src/application/popupViewModelMapper.js` -- Đưa `synonyms` và `antonyms` vào view model.
- [ ] `src/content/popupRenderer.js` -- Bổ sung render item cho tab `synonyms-antonyms`.
- [ ] `src/content/popupManager.js` -- Render tab `Synonyms & Antonyms` (dạng chips tương tác) và hỗ trợ style inline synonyms/antonyms trong tab Definitions.
- [ ] `tests/fixtures/commonWordsDataset.js` -- Cập nhật dataset 100 từ cho cả 2 nguồn.
- [ ] `tests/e2e/multiSource100WordsDisplay.test.js` -- Chạy kiểm thử tự động 100 từ trên cả 2 nguồn.

**Acceptance Criteria:**
- Given từ có chứa synonyms/antonyms, when xem tab Definitions, then bên dưới mỗi định nghĩa/ví dụ hiển thị rõ ràng nhãn Synonyms / Antonyms.
- Given từ có chứa synonyms/antonyms, when xem tab Synonyms & Antonyms, then hiển thị danh sách chips tương tác cho phép click để tra từ tiếp theo.
- Given bộ dataset 100 từ, when chạy test kiểm thử trên cả 2 nguồn, then 100% test case pass.

## Verification

**Commands:**
- `npm test` -- expected: All test suites pass 100%.
