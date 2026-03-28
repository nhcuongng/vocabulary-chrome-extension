# Story 2.2: Trạng thái not-found với hướng dẫn hành động

Status: review

## Story

As a người học tiếng Anh,
I want nhận được hướng dẫn cụ thể khi không tìm thấy từ,
so that tôi có thể thao tác lại đúng cách.

## Acceptance Criteria

1. Given lookup không có dữ liệu từ điển khả dụng, When parser hoặc mapper xác nhận kết quả rỗng, Then popup hiển thị trạng thái not-found, And hiển thị gợi ý thao tác lại (bỏ dấu câu/chọn 1 từ/thử từ gốc).

## Tasks / Subtasks

- [x] Thiết kế nhánh kết quả `not-found` trong state machine (AC: 1)
- [x] Render message + guidance theo UX copy đã thống nhất (AC: 1)
- [x] Kết nối trigger từ parser/mapper khi dữ liệu rỗng (AC: 1)
- [x] Viết test hiển thị not-found với dữ liệu null/empty (AC: 1)

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

- `npm test` ✅ (29/29 tests pass)

### Completion Notes List

- Story context created by Scrum Master.
- Added nhánh mapping `not-found` trong `popupViewModelMapper` khi thiếu headword/definition cốt lõi.
- Tách UI copy sang message catalog riêng (`popupCopyCatalog`) để giữ logic presentation độc lập và sẵn sàng i18n.
- Kết nối trigger not-found từ parser/mapper khi payload rỗng hoặc không đủ dữ liệu hiển thị.
- Added tests xác nhận trạng thái not-found và guidance list cho dữ liệu null/empty.

### File List

- _bmad-output/implementation-artifacts/2-2-trang-thai-not-found-voi-huong-dan-hanh-dong.md
- src/application/popupViewModelMapper.js
- src/application/popupCopyCatalog.js
- tests/application/popupViewModelMapper.test.js
