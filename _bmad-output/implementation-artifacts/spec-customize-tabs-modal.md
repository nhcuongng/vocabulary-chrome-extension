---
title: 'Customize Tabs Modal with Drag-and-Drop Reorder, Eye Toggle Visibility, and Reset Default'
type: 'feature'
created: '2026-09-07T14:00:00+07:00'
status: 'draft'
context:
  - 'src/shared/userSettings.js'
  - 'src/content/popupManager.js'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Hiện tại tính năng tùy biến tab biến đổi thanh tab trực tiếp thành dạng kéo thả, gây chật chội và không trực quan. Người dùng chưa thể ẩn/hiện từng tab hoặc khôi phục về cấu hình mặc định (Reset to default).

**Approach:** Khi nhấn vào biểu tượng bánh răng (Settings) trên thanh tab, mở một modal popup tùy chỉnh (Tab Customization Modal / Dropdown). Modal này hiển thị danh sách các tab kèm icon kéo thả (drag handle) để đổi thứ tự, icon con mắt (eye toggle) để bật/tắt hiển thị (hide/show) từng tab, cùng nút "Save" để lưu lại và nút "Reset to default" để khôi phục cấu hình tab ban đầu.

## Boundaries & Constraints

**Always:**
- 100% English UI text theo rule giao diện (e.g., "Customize Tabs", "Save", "Reset to default", "Drag to reorder", "Toggle visibility", "At least one tab must remain visible").
- Tương thích ngược với cấu hình `tabOrderPreference` và mở rộng cấu hình lưu trữ với `hiddenTabsPreference` trong `userSettings.js`.
- Ngăn chặn người dùng ẩn toàn bộ các tab (phải luôn giữ lại ít nhất 1 tab hiển thị).
- Đảm bảo dừng sự kiện click (`e.stopPropagation()`) để không làm đóng popup từ điển chính khi thao tác trong modal cấu hình tab.
- Hỗ trợ đầy đủ chế độ Light mode và Dark mode cho modal tùy biến tab.

**Ask First:**
- Thay đổi schemaVersion lưu trữ nếu có breaking change.

**Never:**
- Không làm ảnh hưởng đến cơ chế chuyển tab thông thường khi không mở modal.
- Không cho phép danh sách tab rỗng hoàn toàn gây lỗi render layout.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Open Customize Modal | Click gear icon on tab bar | Opens mini customization modal showing all available tabs with drag handles and eye icons | Toggle open/close on subsequent clicks |
| Reorder Tabs via Drag | Drag a tab row to a new position | Tab row moves smoothly to new position in the modal list | Safe swap indices |
| Toggle Tab Visibility | Click eye icon next to a tab | Toggles visible (eye open) / hidden (eye slashed) state | Prevent disabling if it is the only visible tab left |
| Save Changes | Click "Save" button | Updates `tabOrderPreference` and `hiddenTabsPreference` in storage, applies new order & visibility to tab bar, closes modal | Fallback safely on storage error |
| Reset to Default | Click "Reset to default" button | Clears custom order & hidden preferences (resets to default order, all tabs visible), updates tab bar and closes modal | Restores initial order & visibility |
| Outside click / Close | Click outside modal or click Cancel/Close | Closes modal without saving uncommitted changes | Discard unsaved state |

</frozen-after-approval>

## Code Map

- `src/shared/userSettings.js` -- Schema & normalization cho `hiddenTabsPreference` (hoặc cấu hình tabs tổng thể) và `DEFAULT_USER_SETTINGS`.
- `src/infrastructure/adapters/chromeStorageSettingsAdapter.js` -- Cập nhật so sánh `isSameSettings` cho `hiddenTabsPreference`.
- `src/content/popupManager.js` -- Thêm SVG eye / eye-off, xây dựng Modal Popup "Customize Tabs", xử lý kéo thả danh sách trong modal, toggle con mắt, nút Save và Reset to default; áp dụng filter tab hiển thị theo `hiddenTabsPreference`.
- `tests/content/popupManagerNavigation.test.js` -- Bổ sung test suites cho Customize Tabs modal (mở modal, kéo thả sắp xếp, ẩn tab với icon mắt, nút Reset default, nút Save).
- `tests/unit/userSettings.test.js` (hoặc file test settings tương ứng) -- Test normalization cho `hiddenTabsPreference`.

## Tasks & Acceptance

**Execution:**
- [ ] `src/shared/userSettings.js` -- Thêm `hiddenTabsPreference` vào default settings và hàm `normalizeUserSettings`.
- [ ] `src/infrastructure/adapters/chromeStorageSettingsAdapter.js` -- Cập nhật `isSameSettings` bao gồm so sánh `hiddenTabsPreference`.
- [ ] `src/content/popupManager.js` -- Xây dựng UI Modal Customize Tabs (drag items, eye toggle, Save, Reset to default) & áp dụng ẩn/hiện/sắp xếp tab.
- [ ] `tests/content/popupManagerNavigation.test.js` -- Viết test kiểm tra tương tác modal cài đặt tab, kéo thả, ẩn hiện mắt, Save và Reset.

**Acceptance Criteria:**
- Given từ điển hiển thị có nhiều tab (Explanation, Definitions, Word Family), when người dùng click biểu tượng cài đặt bánh răng, then một modal cấu hình tab xuất hiện hiển thị danh sách tab.
- Given modal cấu hình đang mở, when người dùng kéo thả các dòng tab, then thứ tự trong danh sách modal thay đổi.
- Given modal cấu hình đang mở, when người dùng click biểu tượng con mắt của một tab, then trạng thái ẩn/hiện của tab đó được toggle (nếu còn >= 2 tab đang bật).
- Given modal cấu hình đang mở, when người dùng click "Save", then cấu hình được lưu vào storage, tab bar cập nhật theo thứ tự và trạng thái hiển thị mới, modal đóng lại.
- Given modal cấu hình đang mở, when người dùng click "Reset to default", then thứ tự và trạng thái hiển thị của các tab trở về mặc định ban đầu, lưu lại và modal đóng.

## Verification

**Commands:**
- `npm test` -- expected: All unit & integration tests pass (182+ tests passing).

**Manual checks (if no CLI):**
- Tra cứu từ `resilient`, click icon bánh răng ở thanh tab: xuất hiện modal nhỏ. Kéo thả đổi vị trí, bấm ẩn một tab bằng icon mắt, bấm Save để xem kết quả. Mở lại bấm "Reset to default" xem thanh tab quay về mặc định ban đầu.
