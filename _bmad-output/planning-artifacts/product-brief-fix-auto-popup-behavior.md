---
title: "Product Brief: Fix Auto-Popup Behavior"
status: "complete"
created: "2026-03-30"
updated: "2026-03-30"
inputs:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/implementation-artifacts/3-1-cai-dat-bat-tat-auto-popup.md
  - src/content/autoPopupLookupController.js
  - src/content/runtimeContentScript.js
  - src/shared/userSettings.js
---

# Product Brief: Hoàn thiện hành vi Auto-Popup Toggle

**Project:** vocabulary-chrome-extension
**Owner:** Cuongnguyenhuu
**Status:** Draft
**Date:** 2026-03-30

## 1. Executive Summary

Tính năng auto-popup toggle (FR4, FR23) đã có UI và controller (Story 3.1) nhưng hành vi runtime chưa hoàn chỉnh. Khi người dùng tắt auto-popup, hệ thống dừng hoàn toàn selection detection — khiến người dùng không có cách nào tra từ. Cần sửa lại để cung cấp hai luồng trải nghiệm rõ ràng: tự động tra khi bật, và tra qua icon kính lúp khi tắt.

Đây là tính năng MVP cốt lõi (PRD mục "Tùy chọn auto-show") ảnh hưởng trực tiếp đến trải nghiệm mỗi lần người dùng bôi đen từ. Nếu không hoàn thiện, extension chỉ hoạt động ở đúng một chế độ duy nhất — mất đi khả năng tùy biến theo thói quen đọc.

## 2. Vấn đề

**Hiện trạng:** Khi `autoPopupEnabled = false`, `autoPopupLookupController` gọi `selectionController.stop()`, tắt hoàn toàn việc lắng nghe sự kiện selection. Kết quả: người dùng bôi đen từ nhưng không có gì xảy ra — không popup, không icon, không phản hồi.

**Hậu quả:**
- Người dùng tắt auto-popup xong nghĩ extension hỏng, bật lại hoặc gỡ cài đặt.
- Checkbox "Auto-popup" trong settings tồn tại nhưng vô nghĩa — tạo ấn tượng sản phẩm chưa hoàn thiện.
- Extension mất khả năng phục vụ nhóm người dùng muốn kiểm soát thời điểm tra từ (đọc tập trung, xem tài liệu nhạy cảm).

## 3. Giải pháp

Xây dựng hai luồng trải nghiệm song song, chuyển đổi qua toggle auto-popup:

### Chế độ Auto-popup BẬT (mặc định)
Giữ nguyên hành vi hiện tại: bôi đen từ → popup định nghĩa tự động hiển thị gần vùng chọn.

### Chế độ Auto-popup TẮT
Bôi đen từ → hiển thị **icon kính lúp nhỏ** gần vùng chọn → người dùng click icon → popup định nghĩa hiển thị.

**Đặc tả icon kính lúp:**
- Hình dạng: icon kính lúp (🔍) nhỏ gọn, kích thước đủ để click dễ dàng trên cả desktop.
- Vị trí: xuất hiện gần cuối vùng text đã chọn (tương tự vị trí popup hiện tại).
- Hành vi: click vào → trigger lookup flow bình thường → hiển thị popup kết quả.
- Tự ẩn khi người dùng click ra ngoài hoặc bỏ chọn text.

### Quick Toggle trong Browser Action Popup
Thêm checkbox với hint text trong popup extension (toolbar icon) để người dùng chuyển đổi nhanh giữa hai chế độ mà không cần mở trang settings:
- **UI:** Checkbox kèm label ngắn gọn (ví dụ: "Auto-popup") và hint giải thích hành vi (ví dụ: "Tự động hiện định nghĩa khi bôi đen từ").
- **Hành vi:** Thay đổi setting tức thì, đồng bộ với content script real-time — áp dụng ngay trên trang đang mở.
- **Trạng thái:** Phản ánh đúng giá trị hiện tại của `autoPopupEnabled` khi mở popup.

## 4. Đối tượng người dùng

- **Người dùng auto-popup ON:** Muốn tra nhanh liên tục, chấp nhận popup xuất hiện mỗi lần bôi đen — phù hợp khi đọc bài có nhiều từ mới.
- **Người dùng auto-popup OFF:** Muốn kiểm soát — chỉ tra khi cần, tránh popup bất ngờ khi bôi đen text vì mục đích khác (copy, highlight, quote).

## 5. Tiêu chí thành công

- **Chức năng:** Cả hai chế độ hoạt động đúng và chuyển đổi tức thì khi user thay đổi setting (không cần reload).
- **UX:** Icon kính lúp xuất hiện < 200ms sau khi selection hoàn tất. Click icon trigger lookup trong < 100ms.
- **Ổn định:** Không tạo xung đột với popup renderer hiện tại. Không ảnh hưởng trang web host.

## 6. Phạm vi

### Trong scope
- Sửa `autoPopupLookupController` để selection detection vẫn hoạt động khi auto-popup OFF.
- Tạo component icon kính lúp (trigger icon) với logic hiển thị/ẩn.
- Kết nối trigger icon với lookup orchestrator hiện có.
- Thêm checkbox quick toggle trong browser action popup với hint text.
- Đảm bảo chuyển đổi chế độ real-time theo settings change (từ cả popup lẫn settings page).
- Viết test cho cả hai luồng và quick toggle.

### Ngoài scope
- Thay đổi giao diện popup kết quả.
- Thay đổi nguồn dữ liệu hoặc parser.
- Hỗ trợ multi-word selection.

## 7. Rủi ro và giảm thiểu

| Rủi ro | Giảm thiểu |
|--------|-----------|
| Icon kính lúp bị trang web che khuất (z-index) | Sử dụng Shadow DOM hoặc z-index cao, tương tự cách popup hiện tại hoạt động |
| Selection detection chạy liên tục gây overhead | Giữ nguyên cơ chế debounce hiện có trong `selectionDetection.js` |
| Xung đột giữa icon và popup khi user chuyển mode | Đảm bảo cleanup icon trước khi render popup và ngược lại |
