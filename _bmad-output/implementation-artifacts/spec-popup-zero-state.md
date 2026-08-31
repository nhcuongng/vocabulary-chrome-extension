---
title: 'Implement Standalone Toolbar Popup Zero-State Experience'
type: 'feature'
created: '2026-08-31'
status: 'done'
context:
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Khi người dùng click mở popup từ thanh công cụ extension (không phải bôi đen từ trên web), khoảng trống bên dưới thanh tìm kiếm chiếm hơn 60% diện tích làm popup bị trống trải, thiếu định hướng và lãng phí không gian hiển thị ban đầu.

**Approach:** Triển khai module renderer `popupZeroStateRenderer.js` để render Zero-State khi chưa có từ khóa tìm kiếm: hiển thị Smart Flashcard Review (hoặc Onboarding Guide nếu chưa có lịch sử) kèm Micro-tips banner, hỗ trợ dark mode và chuyển đổi mượt mà khi tìm kiếm.

## Boundaries & Constraints

**Always:**
- Tương thích 100% với Dark Mode và Light Mode hiện tại.
- Phù hợp với DOM/CSS trong Shadow DOM & Standalone popup (`popup.html`).
- Không gây layout shift đột ngột; chuyển cảnh mượt mà khi người dùng gõ từ khóa hoặc bấm nút clear.
- Unit test đầy đủ các kịch bản (returning user có lịch sử, first-time user chưa có lịch sử, shuffle từ vựng, click xem chi tiết).

**Ask First:**
- Thay đổi cấu trúc lưu trữ `chrome.storage.local` (hiện tại chỉ đọc từ `historyStore` có sẵn).

**Never:**
- Không gọi API ngoài khi đang ở trạng thái idle zero-state nếu không cần thiết; ưu tiên dùng dữ liệu lịch sử local.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Returning User (có lịch sử) | `historyWords = ['location', 'shell', ...]` | Hiển thị Smart Flashcard Review với từ ngẫu nhiên, nút Shuffle 🔀 và Micro-tip | Fallback an toàn nếu từ vựng rỗng |
| First-time User (chưa có lịch sử) | `historyWords = []` | Hiển thị Onboarding 3 bước minh họa và Micro-tip | N/A |
| Bấm nút Shuffle 🔀 | Click shuffle button | Chuyển sang từ ngẫu nhiên khác trong danh sách lịch sử | Nếu chỉ có 1 từ thì giữ nguyên |
| Bấm vào Flashcard | Click vào từ trên flashcard | Điền từ vào ô tìm kiếm và kích hoạt tra cứu chi tiết | N/A |
| Bắt đầu gõ từ khóa | Input có ký tự | Ẩn Zero-State, hiển thị search results / suggestions | N/A |
| Xóa trắng ô input | Clear button click / backspace | Hiện lại Zero-State tự nhiên | N/A |

</frozen-after-approval>

## Code Map

- `src/popup/popupZeroStateRenderer.js` -- Module mới render UI Zero-State (Flashcard card, Onboarding card, Micro-tip).
- `src/popup/popup.html` -- Cập nhật styles CSS cho Zero-State components (Light & Dark mode).
- `src/popup/popup.js` -- Tích hợp hiển thị Zero-State khi khởi động popup và xử lý ẩn/hiện khi input thay đổi.
- `tests/popup/popupZeroStateRenderer.test.js` -- Unit tests kiểm thử các trạng thái và hành vi tương tác của Zero-State.

## Tasks & Acceptance

**Execution:**
- [x] `_bmad-output/implementation-artifacts/spec-popup-zero-state.md` -- Tạo spec file.
- [x] `src/popup/popupZeroStateRenderer.js` -- Tạo module render zero-state UI với cấu trúc DOM ngữ nghĩa, accessible.
- [x] `src/popup/popup.html` -- Thêm CSS styles cho `.vocab-zero-state`, `.vocab-quick-review-card`, `.vocab-onboarding-card`, `.vocab-micro-tips-banner` (hỗ trợ Dark Mode).
- [x] `src/popup/popup.js` -- Hook zero-state renderer vào lifecycle mở popup, sự kiện search input change, và shuffle/click word.
- [x] `tests/popup/popupZeroStateRenderer.test.js` -- Viết bộ unit test toàn diện cho renderer.

**Acceptance Criteria:**
- Given popup mở ra và chưa có input search, when lịch sử có từ vựng, then hiển thị Smart Review Flashcard với nút Shuffle và Micro-tip.
- Given popup mở ra lần đầu chưa có lịch sử, when `historyWords = []`, then hiển thị Onboarding 3 bước và Micro-tip.
- Given người dùng gõ ký tự vào ô search, when input không rỗng, then ẩn Zero-State; when xóa trắng ô search, then hiển thị lại Zero-State.
- Given bộ kiểm thử chạy `npm test`, then tất cả test cases đều pass.

## Verification

**Commands:**
- `npm test` -- expected: Tất cả test suites pass 100%.
- `npm run build` -- expected: Build bundle thành công không lỗi.
