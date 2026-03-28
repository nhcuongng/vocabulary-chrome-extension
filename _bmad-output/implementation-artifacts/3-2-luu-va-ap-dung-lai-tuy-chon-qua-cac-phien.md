# Story 3.2: Lưu và áp dụng lại tùy chọn qua các phiên

Status: ready-for-dev

## Story

As a người học tiếng Anh,
I want tùy chọn của tôi được ghi nhớ lâu dài,
so that tôi không phải cấu hình lại mỗi lần mở trình duyệt.

## Acceptance Criteria

1. Given người dùng đã lưu tùy chọn auto-popup, When trình duyệt hoặc extension được khởi động lại, Then cài đặt được nạp lại từ storage local, And áp dụng đúng cho phiên duyệt mới.

## Tasks / Subtasks

- [ ] Thiết kế persistence cho user preference trong local storage extension (AC: 1)
- [ ] Nạp settings trong startup lifecycle của extension (AC: 1)
- [ ] Áp dụng setting trước khi bắt selection events (AC: 1)
- [ ] Viết test restart scenario và backward compatibility (AC: 1)

## Dev Notes

- Không lưu dữ liệu cá nhân ngoài phạm vi cài đặt cần thiết.
- Handle fallback khi storage lỗi hoặc key chưa tồn tại.

### Project Structure Notes

- Đặt schema version cho settings để hỗ trợ migrate về sau.
- Wrapper storage dùng chung để kiểm soát type-safe access.

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 3, Story 3.2)
- Source: _bmad-output/planning-artifacts/prd.md (FR24, NFR8)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

### Completion Notes List

- Story context created by Scrum Master.

### File List

- _bmad-output/implementation-artifacts/3-2-luu-va-ap-dung-lai-tuy-chon-qua-cac-phien.md
