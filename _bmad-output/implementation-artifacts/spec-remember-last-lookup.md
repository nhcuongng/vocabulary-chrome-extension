---
title: 'Persist & Restore Last Searched Word in Popup'
type: 'feature'
created: '2026-09-04'
status: 'done'
baseline_commit: 'f950030015ead19e1427f8c668d31e76eb178c49'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Khi người dùng mở lại popup trên thanh toolbar của trình duyệt, popup luôn hiển thị zero-state (ô tìm kiếm trống rỗng) dù trước đó vừa tra cứu một từ. Người dùng muốn có một tuỳ chọn (checkbox) cho phép lưu lại kết quả tra cứu gần nhất và tự động khôi phục khi mở popup, mặc định bật.

**Approach:** Bổ sung setting `rememberLastLookup` (mặc định `true`) vào user settings và lưu `lastLookupWord` trong storage. Khi mở popup, nếu `rememberLastLookup` bật và có `lastLookupWord` (hoặc từ gần nhất trong history), tự động điền input và thực hiện tìm kiếm / hiển thị kết quả. Thêm checkbox trong Settings menu popover của popup toolbar để người dùng có thể bật/tắt tuỳ chọn này bất cứ lúc nào.

## Boundaries & Constraints

**Always:**
- UI text bắt buộc 100% bằng tiếng Anh (English UI Only).
- Checkbox mới được đặt trong Settings Menu Popover của toolbar popup (`Remember last lookup` / `Restore last searched word when opening`).
- Giá trị mặc định của setting `rememberLastLookup` là `true`.
- Giữ nguyên các tính năng hiện tại: Auto-popup toggle, Dark mode toggle, Dictionary source selector, History slider & Zero-state.
- Toàn bộ 178+ test cases hiện tại phải tiếp tục vượt qua (pass), bổ sung unit test cho setting mới và hành vi restore.

**Ask First:**
- Bất kỳ thay đổi nào làm thay đổi schema lưu trữ history hoặc các component bên ngoài popup.

**Never:**
- Không tự động lookup nếu `rememberLastLookup` tắt (`false`) hoặc khi không có từ nào đã được tra cứu trước đó.
- Không phá vỡ chức năng Clear search (khi bấm clear, ô tìm kiếm vẫn xoá và hiển thị zero-state).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mở popup lần đầu (chưa có history) | `rememberLastLookup = true`, history trống | Hiển thị Zero-state Onboarding card, ô search trống | N/A |
| Mở popup khi đã có history gần nhất | `rememberLastLookup = true`, history có `["ephemeral", ...]` | Ô search tự điền "ephemeral" và tự động hiển thị kết quả tra cứu | Nếu lookup fail thì hiển thị error UI an toàn |
| Mở popup khi user đã tắt tính năng | `rememberLastLookup = false`, history có `["ephemeral"]` | Ô search trống, hiển thị Zero-state Quick Review card | N/A |
| Toggle checkbox trong Settings menu | User toggle `rememberLastLookup` từ On sang Off (hoặc ngược lại) | Lưu setting vào chrome storage ngay lập tức và đồng bộ trạng thái | Xử lý lỗi storage adapter an toàn |
| Tra từ mới khi `rememberLastLookup = true` | User tra từ mới "meticulous" | Lưu "meticulous" vào history / last lookup, mở popup lần tới sẽ nhớ "meticulous" | N/A |

</frozen-after-approval>

## Code Map

- `src/shared/userSettings.js` -- Bổ sung `rememberLastLookup: true` vào `DEFAULT_USER_SETTINGS`, normalize và merge logic.
- `src/infrastructure/adapters/chromeStorageSettingsAdapter.js` -- Cập nhật `isSameSettings` bao gồm trường `rememberLastLookup`.
- `src/popup/popup.html` -- Thêm item checkbox `remember-last-lookup-toggle` vào Settings Menu popover với label tiếng Anh ("Remember last lookup") và tooltip/hint giải thích ("Restore last searched word on open").
- `src/popup/popup.js` -- Tích hợp quản lý setting `rememberLastLookup`: gán sự kiện toggle checkbox, lưu setting, và khi popup bootstrap nếu `rememberLastLookup` là `true` thì lấy từ gần nhất từ `historyStore.getRecentSearchWords(1)[0]` để tự động điền search input và gọi `performSearch(lastWord)`.
- `tests/` -- Bổ sung / cập nhật test cases trong `userSettings.test.js`, `chromeStorageSettingsAdapter.test.js`, và test cho popup restore.

## Tasks & Acceptance

**Execution:**
- [x] `src/shared/userSettings.js` -- Bổ sung `rememberLastLookup` (default: true) vào `DEFAULT_USER_SETTINGS` và `normalizeUserSettings`.
- [x] `src/infrastructure/adapters/chromeStorageSettingsAdapter.js` -- Cập nhật hàm so sánh `isSameSettings` bao gồm trường `rememberLastLookup`.
- [x] `src/popup/popup.html` -- Thêm setting item checkbox `Remember last lookup` trong Settings Popover.
- [x] `src/popup/popup.js` -- Kết nối checkbox toggle, load setting và khôi phục từ tra gần nhất khi mở popup nếu option đang bật.
- [x] `tests/shared/userSettings.test.js` & `tests/infrastructure/chromeStorageSettingsAdapter.test.js` -- Bổ sung unit tests cho `rememberLastLookup`.

**Acceptance Criteria:**
- Given `rememberLastLookup` là `true` và có từ trong lịch sử tra cứu, when người dùng mở popup, then ô input tự động điền từ gần nhất và kết quả tra cứu của từ đó được hiển thị.
- Given `rememberLastLookup` là `false`, when người dùng mở popup, then ô input để trống và hiển thị màn hình Zero-state.
- Given checkbox "Remember last lookup" trong Settings menu, when người dùng chuyển đổi trạng thái checkbox, then giá trị setting được lưu bền vững vào `chrome.storage.local`.

## Design Notes

- Sử dụng ngay `historyStore.getRecentSearchWords(1)` để lấy từ gần nhất đã tra cứu thành công, tránh phải quản lý thêm một key lưu trữ riêng biệt gây phân mảnh dữ liệu.
- Đặt checkbox bên trong popover menu **Settings** (`#vocab-settings-menu-popover`) trên thanh toolbar của popup cùng nhóm với **Auto-popup** và **Dark mode**, giữ cho giao diện toolbar gọn gàng, thanh thoát và đúng design system hiện tại.

## Verification

**Commands:**
- `npm test` -- expected: Tất cả các bài kiểm thử unit & integration test đều pass (100% pass).
- `npm run build` -- expected: Build bundle thành công không lỗi cú pháp hay import.

## Suggested Review Order

**Settings Schema & Adapter**
- Default setting `rememberLastLookup: true` and normalization logic.
  [`userSettings.js:23`](../../src/shared/userSettings.js#L23)
- Settings diff comparator including `rememberLastLookup`.
  [`chromeStorageSettingsAdapter.js:18`](../../src/infrastructure/adapters/chromeStorageSettingsAdapter.js#L18)

**Popup UI & Lifecycle**
- Checkbox toggle HTML with accessible labels and tooltips.
  [`popup.html:1556`](../../src/popup/popup.html#L1556)
- Runtime initialization, change handler, and startup restore logic.
  [`popup.js:268`](../../src/popup/popup.js#L268)

**Test Suite**
- Unit tests for schema normalization and adapter persistence.
  [`userSettings.test.js:61`](../../tests/shared/userSettings.test.js#L61)
