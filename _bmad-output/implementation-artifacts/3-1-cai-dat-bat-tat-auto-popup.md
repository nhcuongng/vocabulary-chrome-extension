# Story 3.1: Cài đặt bật/tắt auto-popup

Status: ready-for-dev

## Story

As a người học tiếng Anh,
I want cấu hình auto-popup theo thói quen của tôi,
so that tôi kiểm soát được mức độ tự động của extension.

## Acceptance Criteria

1. Given người dùng mở màn hình cài đặt extension, When người dùng thay đổi công tắc auto-popup, Then hệ thống cập nhật giá trị cài đặt mới, And hành vi trigger lookup tuân theo giá trị vừa chọn.

## Tasks / Subtasks

- [ ] Tạo UI settings với toggle auto-popup (AC: 1)
- [ ] Kết nối settings với storage adapter và event cập nhật runtime (AC: 1)
- [ ] Đồng bộ behavior trigger lookup theo config mới ngay lập tức (AC: 1)
- [ ] Viết test cho luồng đổi setting -> áp dụng hành vi (AC: 1)

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

### Completion Notes List

- Story context created by Scrum Master.

### File List

- _bmad-output/implementation-artifacts/3-1-cai-dat-bat-tat-auto-popup.md
