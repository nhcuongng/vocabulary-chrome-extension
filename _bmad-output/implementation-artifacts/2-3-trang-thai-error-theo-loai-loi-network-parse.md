# Story 2.3: Trạng thái error theo loại lỗi (network/parse)

Status: review

## Story

As a người học tiếng Anh,
I want thông báo lỗi rõ nguyên nhân,
so that tôi biết phải làm gì tiếp theo thay vì bị bối rối.

## Acceptance Criteria

1. Given lỗi network hoặc timeout, When hệ thống trả kết quả lỗi, Then popup hiển thị thông báo lỗi tương ứng, And cung cấp hành động tiếp theo phù hợp (ví dụ thử lại).
2. Given parser thất bại do thay đổi cấu trúc nguồn, When hệ thống bắt lỗi parser, Then popup hiển thị trạng thái error an toàn, And không làm hỏng trang web đang mở.

## Tasks / Subtasks

- [x] Chuẩn hóa taxonomy lỗi: `network`, `timeout`, `parse`, `unknown` (AC: 1,2)
- [x] Render error state theo từng loại với CTA tương ứng (AC: 1)
- [x] Bọc parser bằng safe guard để không crash host page (AC: 2)
- [x] Viết test cho từng error type + fallback default (AC: 1,2)

## Dev Notes

- Error branch phải luôn trả về trạng thái an toàn.
- Không để unhandled exception đi xuyên qua content script.

### Project Structure Notes

- Error mapping module riêng, dùng chung giữa SW và popup UI.
- Message catalog tách khỏi logic để dễ maintain.

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 2, Story 2.3)
- Source: _bmad-output/planning-artifacts/prd.md (FR15, FR22, NFR5)
- Source: _bmad-output/planning-artifacts/ux-design-specification.md (UX-DR5)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm test` ✅ (29/29 tests pass)

### Completion Notes List

- Story context created by Scrum Master.
- Chuẩn hóa taxonomy lỗi dùng chung (`network`, `timeout`, `parse`, `unknown`) với fallback `unknown` cho type không hợp lệ.
- Added rendering nhánh `error` theo từng loại lỗi với message + CTA tương ứng từ message catalog.
- Added `safeParseVocabularyHtml()` guard để bắt parser exception, trả typed parse error và tránh unhandled exception xuyên qua content script.
- Added tests cho từng error type, fallback default, parser guard not-found branch, và parse-error branch.

### File List

- _bmad-output/implementation-artifacts/2-3-trang-thai-error-theo-loai-loi-network-parse.md
- src/shared/lookupContract.js
- src/content/popupRenderer.js
- src/infrastructure/adapters/safeVocabularyHtmlParserAdapter.js
- tests/content/popupRenderer.test.js
- tests/infrastructure/safeVocabularyHtmlParserAdapter.test.js
- tests/shared/lookupContract.test.js
