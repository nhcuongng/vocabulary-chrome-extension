# Story 4.1: Telemetry ẩn danh cho thành công/thất bại lookup

Status: done

## Story

As a product operator,
I want hệ thống ghi nhận sự kiện lookup và phân loại lỗi,
so that tôi có thể theo dõi sức khỏe sản phẩm và truy vết sự cố.

## Acceptance Criteria

1. Given một lookup kết thúc, When hệ thống ghi log sự kiện, Then sự kiện được lưu ở dạng ẩn danh với loại kết quả (success/not-found/error), And kèm phân loại lỗi chính khi có lỗi (network/timeout/parse/invalid token).
2. Given operator cần truy vết lỗi theo phiên bản, When đọc dữ liệu telemetry cục bộ, Then có thể lọc và xem sự kiện theo version extension, And không chứa dữ liệu nhận dạng cá nhân.

## Tasks / Subtasks

- [x] Thiết kế telemetry event schema ẩn danh cho kết quả lookup (AC: 1)
- [x] Ghi event theo taxonomy lỗi chuẩn (AC: 1)
- [x] Gắn version extension vào payload để truy vết (AC: 2)
- [x] Viết test bảo đảm không log PII (AC: 2)

## Dev Notes

- Dữ liệu phải tối thiểu hóa theo nguyên tắc privacy by design.
- Chuẩn hóa event names để hỗ trợ phân tích sau này.

### Project Structure Notes

- Telemetry module độc lập, không phụ thuộc UI component.
- Shared event type dùng chung giữa lookup pipeline và logger.

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 4, Story 4.1)
- Source: _bmad-output/planning-artifacts/prd.md (FR25, FR26, FR27, NFR7)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm test` ✅ (57/57 tests pass)

### Completion Notes List

- Story context created by Scrum Master.
- Added shared telemetry schema ẩn danh (`lookup.completed`) với taxonomy kết quả `success/not-found/error` và taxonomy lỗi chuẩn hóa `network/timeout/parse/invalid-token/unknown`.
- Added telemetry recorder độc lập UI + local telemetry store để ghi/đọc event cục bộ và hỗ trợ filter theo `extensionVersion`.
- Tích hợp ghi telemetry dạng best-effort tại `lookupFlowOrchestrator` cho mọi lookup completion mà không ảnh hưởng UX chính.
- Added PII safety guard để chặn payload chứa key nhạy cảm (`headword`, `rawText`, `lookupUrl`, `selectionRect`, ...).
- Added unit tests cho schema, recorder filtering theo version/result type, và bất biến không log PII.
- Completed code review cho phạm vi Story 4.1 và đã fix toàn bộ findings (bao gồm guard privacy khi persist telemetry).

### File List

- _bmad-output/implementation-artifacts/4-1-telemetry-an-danh-cho-thanh-cong-that-bai-lookup.md
- src/shared/lookupTelemetryContract.js
- src/application/lookupTelemetryRecorder.js
- src/infrastructure/adapters/inMemoryTelemetryStore.js
- src/content/lookupFlowOrchestrator.js
- tests/shared/lookupTelemetryContract.test.js
- tests/application/lookupTelemetryRecorder.test.js
- tests/background/lookupFlow.test.js

### Change Log

- 2026-03-28: Hoàn tất Story 4.1 (telemetry ẩn danh + taxonomy lỗi + filter theo version + kiểm soát PII), đã chạy code review và test pass.
