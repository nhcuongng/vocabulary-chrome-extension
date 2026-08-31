---
title: 'Cho phép thay đổi thứ tự ưu tiên Auto nguồn từ điển bằng kéo thả'
type: 'feature'
created: '2026-08-31'
status: 'done'
baseline_commit: '971799fb1713ef04c886564ffa36aeed04b78f66'
context: ['_bmad-output/project-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Chế độ tra cứu từ điển "Auto" hiện tại đang cố định thứ tự fallback ưu tiên (`Vocabulary.com` → `Free Dictionary API` → `Cambridge Dictionary`), người dùng không thể tùy biến độ ưu tiên tra cứu theo sở thích hoặc nhu cầu học từ vựng riêng.

**Approach:** Bổ sung cấu hình danh sách thứ tự ưu tiên `autoSourceOrder` trong `userSettings`, hỗ trợ giao diện kéo thả (Drag and Drop) trực tiếp trong menu chọn nguồn từ điển (cả Extension Popup và In-page Content Script Popup) và cập nhật `serviceWorkerLookupHandler` để duyệt fallback theo thứ tự tùy chỉnh.

## Boundaries & Constraints

**Always:**
- Tuân thủ Tagged Union Response Contract và mô hình lưu trữ trong `chrome.storage.local`.
- Đảm bảo tính cô lập CSS / tương tác trong Shadow DOM và ngăn chặn sự kiện kéo thả lan ra trang web chủ (`stopPropagation`).
- Khi kéo thả sắp xếp lại thứ tự, tự động lưu ngay vào settings và cập nhật tức thì nhãn gợi ý hiển thị thứ tự (hint) của nguồn "Auto".
- Nếu dữ liệu cấu hình lưu trữ bị thiếu hoặc sai lệch, luôn chuẩn hóa an toàn fallback về danh sách nguồn mặc định `['vocabulary', 'freedictionary', 'cambridge']`.

**Ask First:**
- Thay đổi cấu trúc schema lớn vượt ngoài `autoSourceOrder`.

**Never:**
- Không xóa bỏ các nguồn từ điển hiện có (`vocabulary`, `freedictionary`, `cambridge`).
- Không gây gián đoạn hoặc phá vỡ luồng tra cứu nguồn đơn lẻ (direct source selection).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Kéo thả đổi vị trí nguồn trong Auto | Kéo thẻ `Cambridge` lên vị trí đầu tiên | Thứ tự `autoSourceOrder` đổi thành `['cambridge', 'vocabulary', 'freedictionary']`, lưu vào settings, hint Auto đổi thành `Cambridge → Vocab.com → FreeDict` | N/A |
| Tra cứu Auto với thứ tự tùy chỉnh | Tra từ khi `autoSourceOrder` là `['cambridge', 'freedictionary', 'vocabulary']` | Service Worker thử tra Cambridge trước, nếu lỗi/not found thử FreeDict, sau đó Vocabulary | Fallback sang nguồn kế tiếp |
| Settings lưu giá trị `autoSourceOrder` rỗng/không hợp lệ | `autoSourceOrder: null` hoặc chứa id lạ | `normalizeUserSettings` khôi phục đầy đủ 3 nguồn hợp lệ theo thứ tự mặc định | Tự động điền fallback chuẩn |
| Tương tác drag-and-drop trên trang web (Shadow DOM) | Người dùng kéo thả item bên trong popup của content script | Sự kiện dragover/drop xử lý mượt mà, không kích hoạt drag behavior của trang web chủ | Gọi `stopPropagation` trên các drag events |

</frozen-after-approval>

## Code Map

- `src/shared/userSettings.js` -- Định nghĩa hằng số `DEFAULT_AUTO_SOURCES`, cập nhật `DEFAULT_USER_SETTINGS` và logic `normalizeUserSettings` để chuẩn hóa `autoSourceOrder`.
- `src/background/serviceWorkerLookupHandler.js` -- Nạp/nhận `autoSourceOrder` từ settings hoặc message payload và duyệt tra cứu theo thứ tự đó khi `source === 'auto'`.
- `src/content/historySliderRenderer.js` -- Cập nhật `UI_COPY` hoặc hàm helper tạo text hiển thị hint thứ tự Auto động (VD: `buildAutoSourceHint(order)`).
- `src/popup/popup.html` & `src/popup/popup.js` -- Xây dựng UI danh sách kéo thả nguồn từ điển trong menu Source Popover của Extension Popup.
- `src/content/popupManager.js` -- Xây dựng UI danh sách kéo thả nguồn từ điển trong Shadow DOM Source Popover của In-page Popup.
- `tests/unit/userSettings.test.js` & `tests/unit/serviceWorkerLookupHandler.test.js` -- Unit test cho chuẩn hóa settings và luồng tra cứu đa nguồn theo thứ tự tùy biến.

## Tasks & Acceptance

**Execution:**
- [x] `src/shared/userSettings.js` -- Thêm `DEFAULT_AUTO_SOURCE_ORDER`, hỗ trợ `autoSourceOrder` trong `normalizeUserSettings` và `mergeUserSettings`.
- [x] `src/background/serviceWorkerLookupHandler.js` -- Cập nhật logic duyệt vòng lặp `autoSourceOrder` trong `createServiceWorkerLookupHandler`.
- [x] `src/content/historySliderRenderer.js` -- Thêm helper format nhãn/hint cho danh sách Auto source động.
- [x] `src/popup/popup.html` & `src/popup/popup.js` -- Render danh sách draggable items trong popover chọn nguồn, gắn event handlers `dragstart`, `dragover`, `drop`, `dragend` và lưu settings.
- [x] `src/content/popupManager.js` -- Thêm drag & drop tương tự cho Shadow DOM popup trong content script.
- [x] `tests/unit/userSettings.test.js` & `tests/unit/serviceWorkerLookupHandler.test.js` -- Viết test kiểm tra tính toàn vẹn của `autoSourceOrder` và luồng lookup fallback.

**Acceptance Criteria:**
- Given người dùng mở menu chọn nguồn từ điển (ở Extension popup hoặc Content script popup), when kéo thả đổi vị trí giữa các nguồn trong nhóm Auto, then danh sách cập nhật thứ tự mới, nhãn mô tả cập nhật tương ứng và cấu hình được lưu vào chrome storage.
- Given `autoSourceOrder` được đặt là `['cambridge', 'vocabulary', 'freedictionary']`, when thực hiện tra từ với `source: 'auto'`, then service worker ưu tiên tra `cambridge` đầu tiên.

## Verification

**Commands:**
- `npm test` -- expected: Tất cả unit tests (bao gồm userSettings và serviceWorkerLookupHandler) chạy thành công 100%.
- `npm run build` -- expected: Build bundle không lỗi.

**Manual checks (if no CLI):**
- Mở extension popup, click icon chọn nguồn từ điển, kéo thả reorder các nguồn từ điển, kiểm tra thứ tự được duy trì khi mở lại popup.

## Suggested Review Order

**1. Settings & Schema**

- Định nghĩa DEFAULT_AUTO_SOURCE_ORDER và logic chuẩn hóa autoSourceOrder
  [`userSettings.js:11`](../../src/shared/userSettings.js#L11)

**2. Background Service Worker Routing**

- Duyệt vòng lặp tra cứu Auto theo thứ tự autoSourceOrder tùy biến
  [`serviceWorkerLookupHandler.js:189`](../../src/background/serviceWorkerLookupHandler.js#L189)

**3. Extension Popup UI & Drag and Drop**

- Khởi tạo UI danh sách kéo thả nguồn và cập nhật cài đặt khi drop
  [`popup.js:109`](../../src/popup/popup.js#L109)
- Layout và styling cho khu vực Auto Priority Order trong popover
  [`popup.html:407`](../../src/popup/popup.html#L407)

**4. In-Page Content Script Shadow DOM UI**

- Xây dựng draggable items và handler drop trong Shadow DOM popup
  [`popupManager.js:1085`](../../src/content/popupManager.js#L1085)
- Helper định dạng chuỗi hint hiển thị thứ tự nguồn Auto
  [`historySliderRenderer.js:37`](../../src/content/historySliderRenderer.js#L37)

**5. Verification & Tests**

- Kiểm thử chuẩn hóa autoSourceOrder trong userSettings
  [`userSettings.test.js:49`](../../tests/shared/userSettings.test.js#L49)
- Kiểm thử luồng tra cứu Auto fallback theo custom autoSourceOrder
  [`multiSourceLookup.test.js:211`](../../tests/background/multiSourceLookup.test.js#L211)
- Kiểm thử kéo thả reorder danh sách Auto trong popupManager
  [`popupManagerNavigation.test.js:331`](../../tests/content/popupManagerNavigation.test.js#L331)
