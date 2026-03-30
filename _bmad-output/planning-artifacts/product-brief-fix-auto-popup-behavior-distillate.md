---
title: "Product Brief Distillate: Fix Auto-Popup Behavior"
type: llm-distillate
source: "product-brief-fix-auto-popup-behavior.md"
created: "2026-03-30"
purpose: "Token-efficient context for downstream PRD/story creation"
---

# Distillate: Hoàn thiện hành vi Auto-Popup Toggle

## Root Cause kỹ thuật

- `autoPopupLookupController.js:52-55`: khi `autoPopupEnabled = false`, gọi `selectionController.stop()` → tắt hoàn toàn mouseup listener → không có cách nào trigger lookup
- Selection detection (`selectionDetection.js`) chỉ có 2 trạng thái: start/stop — không có trạng thái trung gian "detect nhưng không auto-trigger"
- Cần tách logic: selection detection luôn chạy, nhưng **hành động sau detection** thay đổi theo setting

## File map — các file cần chỉnh sửa / tạo mới

- `src/content/autoPopupLookupController.js` — sửa logic `applyAutoPopupEnabled()`: không stop selection detection khi OFF, thay vào đó chuyển sang hiển thị trigger icon
- `src/content/selectionDetection.js` — có thể cần expose thêm callback hoặc mode để hỗ trợ 2 luồng
- `src/content/runtimeContentScript.js` — cập nhật bootstrap để kết nối trigger icon với orchestrator
- `src/content/popupManager.js` — xem xét tái sử dụng cơ chế render/cleanup cho trigger icon
- `src/popup/popup.html` + `src/popup/popup.js` — thêm checkbox quick toggle với hint
- `src/application/autoPopupSettingsPanel.js` — có thể tái sử dụng hoặc refactor để dùng chung cho cả settings page và popup
- `src/shared/userSettings.js` — không cần thay đổi, schema đã có `autoPopupEnabled`
- `src/infrastructure/adapters/chromeStorageSettingsAdapter.js` — không cần thay đổi, subscribe mechanism đã hoạt động

## Component mới cần tạo: Trigger Icon

- **Render:** icon kính lúp (🔍), kích thước nhỏ gọn (~24x24px), clickable
- **Positioning:** gần cuối vùng selection, tái sử dụng logic positioning từ `popupPositioning.js`
- **Lifecycle:** xuất hiện khi có valid selection + auto-popup OFF → ẩn khi click outside / deselect / click icon (chuyển sang popup)
- **Isolation:** nên dùng cùng approach với popup hiện tại (kiểm tra popup dùng Shadow DOM hay inject trực tiếp, giữ nhất quán)
- **z-index:** cần cao hơn nội dung trang, tương tự popup

## Requirements hints (từ user + PRD)

- Mặc định `autoPopupEnabled = true` — giữ nguyên giá trị hiện tại trong `DEFAULT_USER_SETTINGS`
- Chuyển đổi mode phải real-time: thay đổi setting → áp dụng ngay trên trang đang mở, không cần reload
- Quick toggle trong browser action popup: checkbox + hint text, đồng bộ qua `chromeStorageSettingsAdapter` subscribe
- FR4 (PRD): "Người dùng có thể bật/tắt chế độ tự động hiện popup khi bôi đen"
- FR23 (PRD): "Người dùng có thể cấu hình hành vi auto popup trong phần cài đặt extension"
- NFR2 (PRD): render loading state < 200ms — áp dụng tương tự cho trigger icon appearance

## Review findings đáng lưu ý

- **Debounce:** selection detection đã có debounce trong `selectionDetection.js` — trigger icon phải tôn trọng cơ chế này, không nhấp nháy khi user bôi đen nhanh liên tục
- **Cleanup conflict:** khi user chuyển mode ON→OFF hoặc ngược lại, cần cleanup icon trước khi render popup và ngược lại — tránh cả hai xuất hiện đồng thời
- **Input/textarea:** cần quyết định có hỗ trợ selection trong form elements không (hiện tại selection detection chỉ hoạt động trên text nodes thường)
- **Shadow DOM vs inject:** kiểm tra approach hiện tại của popup renderer, trigger icon nên nhất quán

## Scope signals

- **IN:** sửa auto-popup behavior, trigger icon, quick toggle trong popup, tests
- **OUT:** thay đổi giao diện popup kết quả, thay đổi parser/data source, multi-word selection
- **OUT (explicit):** không thêm setting mới ngoài auto-popup toggle

## Open questions cho PRD/architecture

- Trigger icon render bằng Shadow DOM hay inject trực tiếp? (cần kiểm tra popup hiện tại dùng gì)
- Có hỗ trợ trigger icon trên selection trong `<input>`, `<textarea>`, `contenteditable` không?
- Quick toggle trong popup có cần animation/transition khi thay đổi trạng thái không?
- Story 3.1 đánh dấu "done" — cần re-open hoặc tạo story mới?
