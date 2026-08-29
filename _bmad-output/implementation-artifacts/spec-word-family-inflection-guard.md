---
title: 'Word Family: Vô hiệu hóa Click cho Biến thể Chia Động từ (ed, ing, s, es) với Cursor not-allowed'
type: 'feature'
created: '2026-08-29'
status: 'done'
baseline_commit: 'f5afe895542136be50b66c503f580b73ddf14e8b'
context: ['_bmad-output/project-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Trong danh sách Word Family của Vocabulary.com có chứa cả các dạng chia động từ / biến thể ngữ pháp thông thường (-ed, -ing, -s, -es, -ies, -d...). Khi người dùng click vào các từ này, việc tra cứu không mang lại giá trị định nghĩa mới và gây tải request không cần thiết.

**Approach:** Nhận diện các biến thể chia từ (-ed, -ing, -s, -es, -ies, -d...) so với từ gốc (headword). Gán trạng thái `disabled-inflection` với `cursor: not-allowed`, làm mờ nhẹ, ngăn chặn sự kiện click tra cứu, trong khi các từ phái sinh thực thụ (derivative nouns, adjectives, adverbs...) vẫn có thể click tra cứu bình thường.

## Boundaries & Constraints

**Always:**
- Giữ nguyên Shadow DOM style isolation và tagged union response contract.
- Các từ phái sinh có nghĩa riêng (như `creation`, `creative`, `creator`, `creativity`, `development`, `happiness`...) vẫn bấm tra cứu bình thường.
- Các từ biến thể chia động từ (như `created`, `creating`, `creates`, `played`, `playing`, `plays`...) hiển thị `cursor: not-allowed`, không gọi hàm tra cứu khi click.

**Ask First:**
- Mở rộng logic lọc sang các loại hậu tố khác ngoài dạng chia động từ/số nhiều.

**Never:**
- Không ẩn hoàn toàn các từ chia động từ (vẫn hiển thị để người dùng học nhận diện họ từ, chỉ vô hiệu hóa click).
- Không ảnh hưởng đến các thành phần UI khác.

## I/O & Edge-Case Matrix

| Scenario | Input (Headword + Family Word) | Expected Output / Behavior | Error Handling |
|----------|--------------------------------|---------------------------|----------------|
| Biến thể -ed | `create` + `created` | `isInflectedForm` = true; chip có `cursor: not-allowed`, click không tra cứu | N/A |
| Biến thể -ing | `create` + `creating` | `isInflectedForm` = true; chip có `cursor: not-allowed`, click không tra cứu | N/A |
| Biến thể -s | `create` + `creates` | `isInflectedForm` = true; chip có `cursor: not-allowed`, click không tra cứu | N/A |
| Biến thể -ied | `study` + `studied` | `isInflectedForm` = true; chip có `cursor: not-allowed`, click không tra cứu | N/A |
| Từ phái sinh danh từ | `create` + `creation` | `isInflectedForm` = false; chip `cursor: pointer`, click tra cứu bình thường | N/A |
| Từ phái sinh tính từ | `create` + `creative` | `isInflectedForm` = false; chip `cursor: pointer`, click tra cứu bình thường | N/A |
| Từ phái sinh tiền tố | `create` + `recreate` | `isInflectedForm` = false; chip `cursor: pointer`, click tra cứu bình thường | N/A |

</frozen-after-approval>

## Code Map

- `src/domain/wordInflectionUtils.js` -- Utility xác định dạng chia từ / biến thể ngữ pháp (-ed, -ing, -s, -es, -ied, -d...).
- `src/content/popupManager.js` -- Áp dụng style `disabled-inflection` và ngăn click cho các chip biến thể chia từ trong popup.
- `src/content/quickSearchOverlay.js` -- Áp dụng style `disabled-inflection` và ngăn click trong overlay.
- `src/popup/popup.js` & `src/popup/popup.html` -- Áp dụng style `disabled-inflection` và ngăn click trong action popup.
- `tests/domain/wordInflectionUtils.test.js` -- Unit tests kiểm tra nhận diện chính xác các dạng chia từ vs từ phái sinh.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/wordInflectionUtils.js` -- Tạo module utility `isInflectedForm(word, headword)`.
- [x] `src/content/popupManager.js` -- Tích hợp `isInflectedForm`, CSS `.disabled-inflection` và chặn click.
- [x] `src/content/quickSearchOverlay.js` -- Tích hợp `isInflectedForm`, CSS và chặn click.
- [x] `src/popup/popup.js` & `src/popup/popup.html` -- Tích hợp `isInflectedForm`, CSS và chặn click.
- [x] `tests/domain/wordInflectionUtils.test.js` -- Viết unit test toàn diện cho hàm `isInflectedForm`.

**Acceptance Criteria:**
- Given popup hiển thị Word Family của từ `create`, when xem các chip `created`, `creating`, `creates`, then con trỏ chuột hiển thị `not-allowed` và click không kích hoạt tra cứu.
- Given popup hiển thị Word Family của từ `create`, when xem các chip `creation`, `creative`, `creator`, then con trỏ chuột hiển thị `pointer` và click tra cứu bình thường.

## Verification

**Commands:**
- `npm test` -- expected: Tất cả 99 test cases đều PASS.
- `npm run build` -- expected: Build bundle thành công không lỗi.
- `npm run quality:gate` -- expected: Toàn bộ release quality gate PASS.

## Suggested Review Order

**Inflection Logic & Utility**

- Logic phân biệt biến thể chia từ (-ed, -ing, -s, -es, -ied, -d...) vs từ phái sinh:
  [`wordInflectionUtils.js:1`](../../src/domain/wordInflectionUtils.js#L1)

**UI Integrations**

- Tích hợp style `disabled-inflection` và chặn click trong popup nội dung:
  [`popupManager.js:975`](../../src/content/popupManager.js#L975)

- Tích hợp trong overlay tìm kiếm nhanh:
  [`quickSearchOverlay.js:420`](../../src/content/quickSearchOverlay.js#L420)

- Tích hợp trong popup action:
  [`popup.js:280`](../../src/popup/popup.js#L280)

**Automated Tests**

- Kiểm thử nhận diện các dạng chia từ:
  [`wordInflectionUtils.test.js:1`](../../tests/domain/wordInflectionUtils.test.js#L1)

- Kiểm thử tương tác click chip chia từ vs phái sinh:
  [`popupManagerNavigation.test.js:185`](../../tests/content/popupManagerNavigation.test.js#L185)
