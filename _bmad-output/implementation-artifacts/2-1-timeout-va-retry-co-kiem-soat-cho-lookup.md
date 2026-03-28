# Story 2.1: Timeout và retry có kiểm soát cho lookup

Status: review

## Story

As a người học tiếng Anh,
I want hệ thống xử lý timeout và retry hợp lý,
so that tôi không bị treo UI khi kết nối kém.

## Acceptance Criteria

1. Given request lookup vượt quá ngưỡng timeout, When service worker kiểm tra thời gian chờ, Then request được kết thúc an toàn, And hệ thống chuyển sang nhánh lỗi có hướng dẫn.
2. Given xảy ra lỗi tạm thời có thể phục hồi, When cơ chế retry chạy, Then hệ thống retry theo số lần giới hạn cấu hình, And không tạo vòng lặp retry vô hạn.

## Tasks / Subtasks

- [x] Thêm timeout controller cho lookup request (AC: 1)
- [x] Thiết kế retry policy (max attempts, backoff) có cấu hình (AC: 2)
- [x] Trả error type rõ ràng cho UI guidance (AC: 1,2)
- [x] Viết test cho timeout path và retry termination (AC: 1,2)

## Dev Notes

- Timeout default không vượt quá 3s theo NFR.
- Retry phải dừng tuyệt đối sau ngưỡng cấu hình.

### Project Structure Notes

- Network resilience đặt trong service worker lookup service.
- Error types phải dùng shared enum/union để UI tiêu thụ ổn định.

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 2, Story 2.1)
- Source: _bmad-output/planning-artifacts/prd.md (FR11, FR12, NFR3, NFR6)
- Source: _bmad-output/planning-artifacts/architecture.md (AR6, AR7)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm test` ✅ (29/29 tests pass)

### Completion Notes List

- Story context created by Scrum Master.
- Implemented timeout controller với ngưỡng mặc định `3000ms` trong lookup service để request không treo vô hạn.
- Added retry policy có cấu hình (`maxAttempts`, `baseDelayMs`, `backoffMultiplier`, `maxDelayMs`, `retryableStatusCodes`) và cơ chế dừng tuyệt đối khi vượt ngưỡng.
- Chuẩn hóa error response metadata (attempts, retryExhausted, timing) để UI có thể đưa guidance chính xác.
- Added test cho timeout path, retry termination, và retry-success cho lỗi network tạm thời.

### File List

- _bmad-output/implementation-artifacts/2-1-timeout-va-retry-co-kiem-soat-cho-lookup.md
- src/background/lookupService.js
- src/shared/lookupContract.js
- tests/background/lookupFlow.test.js
