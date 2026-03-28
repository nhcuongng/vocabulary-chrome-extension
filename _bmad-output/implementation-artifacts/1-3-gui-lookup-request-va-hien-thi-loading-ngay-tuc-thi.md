# Story 1.3: Gửi lookup request và hiển thị loading ngay tức thì

Status: done

## Story

As a người học tiếng Anh,
I want hệ thống gửi yêu cầu tra cứu sau khi token hợp lệ,
so that tôi nhận được phản hồi nhanh mà không rời trang.

## Acceptance Criteria

1. Given token normalized hợp lệ, When service worker xử lý lookup, Then URL dictionary được tạo đúng theo headword chuẩn hóa, And request được gửi đi trong ngữ cảnh extension.
2. Given lookup đã được khởi tạo, When popup bắt đầu render, Then trạng thái loading được hiển thị, And loading xuất hiện trong thời gian mục tiêu UX (dưới 200ms).

## Tasks / Subtasks

- [x] Xây dựng request builder tạo dictionary URL từ normalized headword (AC: 1)
- [x] Thực thi lookup qua service worker với interface typed response (AC: 1)
- [x] Kích hoạt trạng thái UI `loading` ngay khi request bắt đầu (AC: 2)
  - [x] Đảm bảo TTI hiển thị loading < 200ms trong điều kiện bình thường
- [x] Viết test integration cho flow request -> loading (AC: 1,2)

## Dev Notes

- Không block rendering popup chờ network response.
- Response model phải tương thích tagged union chuẩn kiến trúc.

### Project Structure Notes

- Request handling trong service worker domain layer.
- UI state machine đặt trong popup presenter/state module.

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 1, Story 1.3)
- Source: _bmad-output/planning-artifacts/prd.md (FR9, FR10, FR19)
- Source: _bmad-output/planning-artifacts/ux-design-specification.md (UX-DR2, UX-DR6)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm test` ✅ (19/19 tests pass)

### Completion Notes List

- Story context created by Scrum Master.
- Added dictionary lookup request builder từ normalized headword và tách service lookup thành typed response contract (`success`/`not-found`/`error`).
- Added service worker message handler để xử lý `LOOKUP_REQUEST` trong ngữ cảnh extension.
- Implemented lookup flow orchestrator: render `loading` ngay khi request bắt đầu, sau đó chuyển state theo kết quả lookup.
- Added protection cho error path và stale response để tránh bị kẹt ở `loading` hoặc ghi đè state mới bởi response cũ.
- Added integration tests cho URL builder, service worker lookup handler, typed lookup service, loading latency < 200ms.
- Code review hoàn tất, đã vá toàn bộ finding mức HIGH/MED liên quan flow lookup.

### File List

- _bmad-output/implementation-artifacts/1-3-gui-lookup-request-va-hien-thi-loading-ngay-tuc-thi.md
- src/shared/lookupContract.js
- src/background/lookupRequestBuilder.js
- src/background/lookupService.js
- src/background/serviceWorkerLookupHandler.js
- src/content/lookupFlowOrchestrator.js
- tests/background/lookupFlow.test.js
- tests/background/serviceWorkerLookupHandler.test.js
