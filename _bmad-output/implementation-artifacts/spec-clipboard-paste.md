---
title: 'Add Paste from Clipboard button in toolbar popup when clipboard has text'
type: 'feature'
created: '2026-09-09'
status: 'done'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Người dùng muốn có nút Paste từ clipboard trong toolbar popup để tra cứu nhanh, nhưng nút chỉ nên xuất hiện khi trong clipboard thực sự có chứa từ/văn bản và cần có tooltip tiếng Anh rõ ràng (kèm preview từ hoặc giải thích hành động).

**Approach:** 
- Khi popup khởi tạo hoặc khi focus vào popup, kiểm tra nội dung clipboard qua `navigator.clipboard.readText()`.
- Nếu clipboard có chứa từ/chuỗi ký tự hợp lệ (`text.trim().length > 0`): hiển thị nút Paste kèm tooltip (ví dụ: `Paste "word"` hoặc `Paste from clipboard: "word"`).
- Nếu clipboard rỗng hoặc không đọc được: ẩn nút Paste (display none).
- Khi người dùng click vào nút Paste: điền từ vào ô tìm kiếm và kích hoạt tra cứu từ điển tự động.

## Boundaries & Constraints

**Always:**
- Toàn bộ text giao diện và tooltip 100% bằng tiếng Anh (ví dụ: `Paste from clipboard` hoặc `Paste "apple"`).
- Đọc clipboard an toàn, bắt mọi ngoại lệ (permission denied, document not focused) mà không gây crash.
- Thêm permission `"clipboardRead"` vào `manifest.json`.

**Ask First:**
- N/A

**Never:**
- Không gửi nội dung clipboard ra ngoài internet hoặc lưu PII.
- Không crash hoặc block luồng khởi tạo popup nếu đọc clipboard thất bại.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Popup opened with clipboard word | Clipboard chứa `"resilience"` | Nút Paste hiển thị với tooltip `Paste "resilience"` | N/A |
| Click Paste Button | Nhấn nút Paste khi clipboard có `"resilience"` | Điền `"resilience"` vào ô input, tự động gọi `performSearch("resilience")`, update history slider | N/A |
| Popup opened with empty clipboard | Clipboard rỗng `""` | Nút Paste bị ẩn (`display: none`) | N/A |
| Clipboard permission rejected or error | `navigator.clipboard.readText()` reject | Nút Paste bị ẩn, bắt lỗi an toàn | Ghi log console nhẹ nhàng |

</frozen-after-approval>

## Code Map

- `manifest.json` -- Thêm quyền `"clipboardRead"`
- `src/popup/popup.html` -- Thêm markup nút `#vocab-paste-btn` (mặc định ẩn `display: none`) kèm tooltip và SVG icon Paste
- `src/popup/popup.js` -- Logic kiểm tra clipboard khi popup init / focus để toggle hiển thị nút paste + tooltip, và xử lý sự kiện click để điền vào ô tìm kiếm & tra cứu
- `tests/popup.test.js` -- Bổ sung unit tests cho việc ẩn/hiện nút paste dựa trên clipboard và hành vi click

## Tasks & Acceptance

**Execution:**
- [ ] `manifest.json` -- Thêm `"clipboardRead"` vào permissions
- [ ] `src/popup/popup.html` -- Thêm nút Paste button kèm SVG icon, tooltip container và CSS styling
- [ ] `src/popup/popup.js` -- Thêm hàm `checkAndUpdatePasteButtonState()`, gọi khi init và khi window focus; gắn click handler để dán & tra cứu
- [ ] `tests/popup.test.js` -- Viết test suite kiểm tra: hiển thị nút kèm tooltip khi có từ, ẩn nút khi rỗng hoặc lỗi permission, click để paste & search

**Acceptance Criteria:**
- Given clipboard có từ (vd: "hello"), when mở popup, then nút Paste xuất hiện kèm tooltip hướng dẫn/preview từ.
- Given clipboard rỗng hoặc không có quyền, when mở popup, then nút Paste được ẩn đi.
- Given nút Paste đang hiển thị, when click vào nút, then từ trong clipboard được dán vào ô search và tự động tra cứu.

## Spec Change Log

## Verification

**Commands:**
- `npm test` -- expected: All unit tests pass.
- `npm run build` -- expected: Build bundle hoàn tất không lỗi.
