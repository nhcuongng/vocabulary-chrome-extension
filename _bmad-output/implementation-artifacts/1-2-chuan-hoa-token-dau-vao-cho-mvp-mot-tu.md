# Story 1.2: Chuẩn hóa token đầu vào cho MVP một từ

Status: done

## Story

As a người học tiếng Anh,
I want token được chuẩn hóa trước khi tra cứu,
so that kết quả lookup chính xác và ổn định hơn.

## Acceptance Criteria

1. Given token có chữ hoa/chữ thường lẫn dấu câu ở hai đầu, When token đi qua pipeline chuẩn hóa, Then token được chuyển thành lowercase và loại bỏ ký tự thừa ở biên, And giữ lại nội dung từ cần tra cứu.
2. Given người dùng chọn nhiều hơn một từ trong phạm vi MVP, When hệ thống kiểm tra quy tắc token, Then hệ thống trả trạng thái token không hợp lệ, And không thực hiện gọi lookup network.

## Tasks / Subtasks

- [x] Xây dựng `normalizeWord()` theo flow raw -> strip punctuation -> lowercase (AC: 1)
  - [x] Xử lý dấu câu biên trước/sau từ
  - [x] Giữ chữ cái hợp lệ trong lõi token
- [x] Xây validator MVP one-word (AC: 2)
  - [x] Từ chối nhiều token và ký tự không hợp lệ
  - [x] Trả `invalid-token` có reason code
- [x] Tích hợp normalize + validate vào pipeline trước lookup (AC: 1,2)
- [x] Viết test unit cho normalization edge cases (AC: 1)

## Dev Notes

- Caching key phải dùng normalized word theo kiến trúc.
- Tách biệt normalize logic để tái sử dụng cho cache, parser, telemetry.

### Project Structure Notes

- Utility normalization đặt trong shared domain module.
- Không để business rule rải rác ở nhiều entry points.

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 1, Story 1.2)
- Source: _bmad-output/planning-artifacts/architecture.md (AR2, AR3, AR8)
- Source: _bmad-output/planning-artifacts/prd.md (FR5, FR6, FR7, FR8)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm test` ✅ (19/19 tests pass)

### Completion Notes List

- Story context created by Scrum Master.
- Implemented shared normalization module `normalizeWord()` + `validateMvpOneWordToken()` theo pipeline raw -> strip punctuation biên -> lowercase.
- Integrated normalization/validation vào selection pipeline trước lookup; token hợp lệ luôn được chuẩn hóa trước khi tạo request.
- Added reason-code metadata cho nhánh invalid token (`empty-token`, `multi-token`, `invalid-characters`) để phục vụ error handling nhất quán.
- Added/updated unit tests cho normalization edge cases và selection integration.
- Code review hoàn tất, đã xử lý các nhánh lỗi chính được phát hiện.

### File List

- _bmad-output/implementation-artifacts/1-2-chuan-hoa-token-dau-vao-cho-mvp-mot-tu.md
- src/shared/wordNormalization.js
- src/content/selectionDetection.js
- tests/shared/wordNormalization.test.js
- tests/content/selectionDetection.test.js
