# Story 2.1: Timeout và retry có kiểm soát cho lookup

Status: ready-for-dev

## Story

As a người học tiếng Anh,
I want hệ thống xử lý timeout và retry hợp lý,
so that tôi không bị treo UI khi kết nối kém.

## Acceptance Criteria

1. Given request lookup vượt quá ngưỡng timeout, When service worker kiểm tra thời gian chờ, Then request được kết thúc an toàn, And hệ thống chuyển sang nhánh lỗi có hướng dẫn.
2. Given xảy ra lỗi tạm thời có thể phục hồi, When cơ chế retry chạy, Then hệ thống retry theo số lần giới hạn cấu hình, And không tạo vòng lặp retry vô hạn.

## Tasks / Subtasks

- [ ] Thêm timeout controller cho lookup request (AC: 1)
- [ ] Thiết kế retry policy (max attempts, backoff) có cấu hình (AC: 2)
- [ ] Trả error type rõ ràng cho UI guidance (AC: 1,2)
- [ ] Viết test cho timeout path và retry termination (AC: 1,2)

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

### Completion Notes List

- Story context created by Scrum Master.

### File List

- _bmad-output/implementation-artifacts/2-1-timeout-va-retry-co-kiem-soat-cho-lookup.md
