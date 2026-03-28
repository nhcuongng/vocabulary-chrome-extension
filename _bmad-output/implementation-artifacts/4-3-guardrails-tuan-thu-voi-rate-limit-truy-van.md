# Story 4.3: Guardrails tuân thủ với rate-limit truy vấn

Status: done

## Story

As a product operator,
I want có cơ chế giới hạn truy vấn hợp lý,
so that extension vận hành bền vững và giảm rủi ro vi phạm điều khoản nguồn.

## Acceptance Criteria

1. Given số lượng lookup tăng cao trong thời gian ngắn, When hệ thống đánh giá ngưỡng truy vấn, Then rate-limit được áp dụng theo chính sách, And người dùng nhận phản hồi phù hợp thay vì lỗi mơ hồ.
2. Given cùng một từ được tra cứu lặp lại, When dữ liệu cache còn hiệu lực, Then hệ thống ưu tiên dùng cache trước network, And giảm số request ra nguồn dữ liệu.

## Tasks / Subtasks

- [x] Thiết kế rate-limit policy cho lookup request (AC: 1)
- [x] Triển khai phản hồi thân thiện khi vượt ngưỡng (AC: 1)
- [x] Tích hợp cache-first khi TTL còn hiệu lực (AC: 2)
- [x] Viết test load/rate-limit + cache hit path (AC: 1,2)

## Dev Notes

- Ưu tiên cache-first để giảm call ra nguồn thứ ba.
- Rate-limit cần có telemetry để theo dõi tuning.

### Project Structure Notes

- Rate-limiter nằm trong service layer, độc lập UI.
- Cache service tuân schema entry và TTL trong architecture.

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 4, Story 4.3)
- Source: _bmad-output/planning-artifacts/architecture.md (AR2, AR4)
- Source: _bmad-output/planning-artifacts/prd.md (FR29)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm test` ✅ (60/60 tests pass)

### Completion Notes List

- Story context created by Scrum Master.
- Added guardrails trong `lookupService`: sliding-window rate limiter và per-word TTL cache in-memory (cache-first trước khi quyết định gọi network).
- Added phản hồi thân thiện cho trường hợp vượt ngưỡng qua taxonomy lỗi mới `rate-limit` + UI copy tương ứng.
- Tích hợp guardrails mặc định vào `createServiceWorkerLookupHandler()` để áp dụng ở service layer, không phụ thuộc UI.
- Added test cho rate-limit block path (không gọi network khi bị chặn) và cache-hit path (lookup lặp trong TTL dùng cache trước network).
- Ran code review cho phạm vi Story 4.3 và đã fix finding phát hiện trong vòng review: loại bỏ side-effect cache/rate-limit mặc định ở `performDictionaryLookup` để tránh nhiễu test liên case; chuyển guardrail defaults về service worker level.

### File List

- _bmad-output/implementation-artifacts/4-3-guardrails-tuan-thu-voi-rate-limit-truy-van.md
- src/background/lookupService.js
- src/background/serviceWorkerLookupHandler.js
- src/shared/lookupContract.js
- src/application/popupCopyCatalog.js
- tests/background/lookupFlow.test.js
- tests/shared/lookupContract.test.js
- tests/application/popupViewModelMapper.test.js
- tests/content/popupRenderer.test.js

### Change Log

- 2026-03-28: Hoàn tất Story 4.3 (rate-limit + cache-first TTL + friendly UX copy + tests), đã chạy code review và fix toàn bộ findings trong phạm vi story.
