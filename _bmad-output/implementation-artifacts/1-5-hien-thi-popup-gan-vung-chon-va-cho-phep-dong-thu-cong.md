# Story 1.5: Hiển thị popup gần vùng chọn và cho phép đóng thủ công

Status: done

## Story

As a người học tiếng Anh,
I want popup luôn xuất hiện gần vùng bôi đen và dễ đóng,
so that tôi giữ được mạch đọc và kiểm soát giao diện.

## Acceptance Criteria

1. Given lookup đang ở trạng thái loading hoặc success, When popup được gắn vào viewport, Then popup xuất hiện gần vùng selection, And không che khuất phần nội dung quan trọng quá mức (tuân thủ kích thước UX mục tiêu).
2. Given popup đang mở, When người dùng nhấn Esc hoặc click ngoài popup, Then popup được đóng ngay, And focus được trả về trạng thái đọc tự nhiên.

## Tasks / Subtasks

- [x] Tính toán anchor position từ selection rect + viewport constraints (AC: 1)
- [x] Áp dụng kích thước popup tối đa theo UX spec (AC: 1)
- [x] Cài đặt cơ chế dismiss bằng `Esc` và click-outside (AC: 2)
  - [x] Quản lý focus ring/focus return đúng A11y
- [x] Viết test UI interaction cho open/close behavior (AC: 1,2)

## Dev Notes

- Bám chuẩn accessibility: keyboard dismiss và focus state rõ ràng.
- Giữ popup detach sạch listener khi đóng để tránh leak.

### Project Structure Notes

- Positioning logic tách module để có thể test.
- Dismiss behavior nằm trong popup controller.

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 1, Story 1.5)
- Source: _bmad-output/planning-artifacts/ux-design-specification.md (UX-DR1, UX-DR7, UX-DR12)
- Source: _bmad-output/planning-artifacts/prd.md (FR17, FR18)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm test` ✅ (19/19 tests pass)

### Completion Notes List

- Story context created by Scrum Master.
- Implemented popup positioning module với anchor gần selection, viewport clamp và `max width = 420px` theo UX constraints.
- Added dismiss controller hỗ trợ đóng popup bằng `Esc` và `click-outside`.
- Added focus restore behavior khi đóng popup để giữ A11y flow tự nhiên cho người dùng.
- Added defensive guards cho event target/viewport/popup dimensions để tránh runtime lỗi ở edge case.
- Added UI interaction tests cho open/close behavior, positioning constraints, và focus return.
- Code review hoàn tất, các finding về edge-case đã được xử lý.

### File List

- _bmad-output/implementation-artifacts/1-5-hien-thi-popup-gan-vung-chon-va-cho-phep-dong-thu-cong.md
- src/content/popupPositioning.js
- src/content/popupController.js
- tests/content/popupPositioningAndDismiss.test.js
