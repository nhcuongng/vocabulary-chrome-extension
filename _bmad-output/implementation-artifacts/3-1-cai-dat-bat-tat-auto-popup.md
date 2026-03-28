# Story 3.1: Cài đặt bật/tắt auto-popup

Status: done

## Story

As a người học tiếng Anh,
I want cấu hình auto-popup theo thói quen của tôi,
so that tôi kiểm soát được mức độ tự động của extension.

## Acceptance Criteria

1. Given người dùng mở màn hình cài đặt extension, When người dùng thay đổi công tắc auto-popup, Then hệ thống cập nhật giá trị cài đặt mới, And hành vi trigger lookup tuân theo giá trị vừa chọn.

## Tasks / Subtasks

- [x] Tạo UI settings với toggle auto-popup (AC: 1)
- [x] Kết nối settings với storage adapter và event cập nhật runtime (AC: 1)
- [x] Đồng bộ behavior trigger lookup theo config mới ngay lập tức (AC: 1)
- [x] Viết test cho luồng đổi setting -> áp dụng hành vi (AC: 1)

## Dev Notes

- Giá trị mặc định phải rõ ràng và nhất quán giữa popup/options/content script.
- Tránh race condition khi đọc/ghi settings đồng thời.

### Project Structure Notes

- Settings domain tách khỏi lookup flow.
- Sử dụng Chrome storage API theo wrapper thống nhất.

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 3, Story 3.1)
- Source: _bmad-output/planning-artifacts/prd.md (FR4, FR23)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm test` ✅ (45/45 tests pass)

### Completion Notes List

- Story context created by Scrum Master.
- Added `createAutoPopupSettingsPanel()` để quản lý UI toggle auto-popup, đồng bộ trạng thái hiển thị và xử lý đổi setting an toàn.
- Added `createAutoPopupLookupController()` để áp dụng setting auto-popup theo runtime và cập nhật hành vi trigger lookup ngay sau khi user đổi toggle.
- Added luồng subscribe settings change để nội dung popup phản ứng ngay khi preference đổi (không cần reload extension).
- Completed code review cho phạm vi Story 3.1, không còn patch findings sau khi chạy full test suite.

### File List

- _bmad-output/implementation-artifacts/3-1-cai-dat-bat-tat-auto-popup.md
- src/application/autoPopupSettingsPanel.js
- src/content/autoPopupLookupController.js
- tests/application/autoPopupSettingsPanel.test.js
- tests/content/autoPopupLookupController.test.js

### Change Log

- 2026-03-28: Hoàn tất Story 3.1 (UI toggle auto-popup + runtime apply tức thì), đã chạy code review và test pass.
