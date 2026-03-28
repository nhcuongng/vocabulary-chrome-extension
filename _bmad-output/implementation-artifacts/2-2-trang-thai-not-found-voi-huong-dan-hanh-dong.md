# Story 2.2: Trạng thái not-found với hướng dẫn hành động

Status: ready-for-dev

## Story

As a người học tiếng Anh,
I want nhận được hướng dẫn cụ thể khi không tìm thấy từ,
so that tôi có thể thao tác lại đúng cách.

## Acceptance Criteria

1. Given lookup không có dữ liệu từ điển khả dụng, When parser hoặc mapper xác nhận kết quả rỗng, Then popup hiển thị trạng thái not-found, And hiển thị gợi ý thao tác lại (bỏ dấu câu/chọn 1 từ/thử từ gốc).

## Tasks / Subtasks

- [ ] Thiết kế nhánh kết quả `not-found` trong state machine (AC: 1)
- [ ] Render message + guidance theo UX copy đã thống nhất (AC: 1)
- [ ] Kết nối trigger từ parser/mapper khi dữ liệu rỗng (AC: 1)
- [ ] Viết test hiển thị not-found với dữ liệu null/empty (AC: 1)

## Dev Notes

- Không dùng generic error cho trường hợp not-found.
- Copy guidance phải ngắn, rõ và hành động được.

### Project Structure Notes

- UI copy tách constants để dễ bản địa hóa sau này.
- State mapping nằm trong presentation adapter.

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 2, Story 2.2)
- Source: _bmad-output/planning-artifacts/prd.md (FR14, FR21)
- Source: _bmad-output/planning-artifacts/ux-design-specification.md (UX-DR4)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

### Completion Notes List

- Story context created by Scrum Master.

### File List

- _bmad-output/implementation-artifacts/2-2-trang-thai-not-found-voi-huong-dan-hanh-dong.md
